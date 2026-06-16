import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ModerationActionType,
  Prisma,
  ReportTargetType,
  SanctionType,
} from '@prisma/client';
import { normalizePagination, paginationMeta } from '../../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import {
  CreateSanctionDto,
  ReportActionDto,
  ReportResolutionDto,
  RevokeSanctionDto,
} from './dto/admin-report.dto';

const reportInclude = {
  reporter: { select: { id: true, nickname: true, email: true } },
  handledBy: { select: { id: true, nickname: true, email: true } },
  sanctions: {
    orderBy: { createdAt: 'desc' },
    include: { moderator: { select: { id: true, nickname: true } } },
  },
} satisfies Prisma.ReportInclude;

type TargetSnapshot = {
  targetId: string;
  debateId: string | null;
  content: string | null;
  ownerId: string | null;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    const snapshot = await this.getTargetSnapshot(dto.targetType, dto.targetId);

    try {
      const report = await this.prisma.report.create({
        data: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          debateId: snapshot.debateId,
          reason: dto.reason,
          detail: dto.detail,
          targetContentSnapshot: snapshot.content,
        },
        include: reportInclude,
      });

      return { message: '신고가 접수되었습니다.', report };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('이미 신고한 대상입니다.');
      }
      throw error;
    }
  }

  async findMine(userId: string, query: ListReportsDto) {
    const { page, limit, skip } = normalizePagination(query);
    const where: Prisma.ReportWhereInput = {
      reporterId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };

    const [reports, totalCount] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: reportInclude,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, ...paginationMeta(page, limit, totalCount) };
  }

  async findAll(query: ListReportsDto) {
    const { page, limit, skip } = normalizePagination(query);
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
    };

    const [reports, totalCount] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: reportInclude,
      }),
      this.prisma.report.count({ where }),
    ]);

    return { reports, ...paginationMeta(page, limit, totalCount) };
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');
    return { report };
  }

  async review(id: string, moderatorId: string, dto: ReportResolutionDto) {
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'REVIEWING',
        handledById: moderatorId,
        handledAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
      include: reportInclude,
    });

    await this.log({
      debateId: report.debateId,
      targetType: 'REPORT',
      targetId: report.id,
      actionType: 'REVIEW',
      actorId: moderatorId,
      reason: dto.resolutionNote,
    });

    return { report };
  }

  async reject(id: string, moderatorId: string, dto: ReportResolutionDto) {
    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: 'REJECTED',
        handledById: moderatorId,
        handledAt: new Date(),
        resolvedAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
      include: reportInclude,
    });

    await this.log({
      debateId: report.debateId,
      targetType: 'REPORT',
      targetId: report.id,
      actionType: 'REJECT',
      actorId: moderatorId,
      reason: dto.resolutionNote,
    });

    return { message: '신고가 반려되었습니다.', report };
  }

  async applyReportAction(id: string, moderatorId: string, dto: ReportActionDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('신고를 찾을 수 없습니다.');

    const action = dto.contentAction;
    if (!['NONE', 'HIDE', 'DELETE', 'RESTORE'].includes(action)) {
      throw new BadRequestException('지원하지 않는 처리 액션입니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (action !== 'NONE') {
        await this.applyContentAction(tx, report.targetType, report.targetId, action);
      }

      const sanction =
        dto.sanctionType && dto.sanctionReason
          ? await this.createSanctionInTx(tx, {
              userId: await this.resolveTargetUserId(tx, report.targetType, report.targetId),
              moderatorId,
              reportId: report.id,
              type: dto.sanctionType,
              reason: dto.sanctionReason,
              endsAt: dto.sanctionEndsAt ? new Date(dto.sanctionEndsAt) : undefined,
            })
          : null;

      const updatedReport = await tx.report.update({
        where: { id },
        data: {
          status: 'ACTION_TAKEN',
          handledById: moderatorId,
          handledAt: new Date(),
          resolvedAt: new Date(),
          resolutionNote: dto.resolutionNote,
        },
        include: reportInclude,
      });

      await tx.moderationLog.create({
        data: {
          debateId: report.debateId,
          targetType: report.targetType === 'USER' ? 'USER' : report.targetType,
          targetId: report.targetId,
          actionType: action,
          actorId: moderatorId,
          reason: dto.resolutionNote ?? dto.sanctionReason,
        },
      });

      if (sanction) {
        await tx.moderationLog.create({
          data: {
            debateId: report.debateId,
            targetType: 'SANCTION',
            targetId: sanction.id,
            actionType: 'SANCTION',
            actorId: moderatorId,
            reason: sanction.reason,
          },
        });
      }

      return { report: updatedReport, sanction };
    });

    return { message: '신고 처리가 완료되었습니다.', ...result };
  }

  async findMySanctions(userId: string) {
    await this.expireElapsedSanctions(userId);
    const sanctions = await this.prisma.sanction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        acknowledgements: { where: { userId }, select: { acknowledgedAt: true } },
        moderator: { select: { id: true, nickname: true } },
      },
    });
    return { sanctions };
  }

  async acknowledgeSanction(userId: string, sanctionId: string) {
    const sanction = await this.prisma.sanction.findFirst({
      where: { id: sanctionId, userId },
      select: { id: true },
    });
    if (!sanction) throw new NotFoundException('제재 내역을 찾을 수 없습니다.');

    const acknowledgement = await this.prisma.sanctionAcknowledgement.upsert({
      where: { sanctionId_userId: { sanctionId, userId } },
      create: { sanctionId, userId },
      update: { acknowledgedAt: new Date() },
    });

    return { message: '제재 내역을 확인했습니다.', acknowledgement };
  }

  async findUserSanctions(userId: string) {
    await this.expireElapsedSanctions(userId);
    const sanctions = await this.prisma.sanction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        report: true,
        moderator: { select: { id: true, nickname: true, email: true } },
      },
    });
    return { sanctions };
  }

  async createSanction(userId: string, moderatorId: string, dto: CreateSanctionDto) {
    const sanction = await this.prisma.$transaction(async (tx) => {
      const created = await this.createSanctionInTx(tx, {
        userId,
        moderatorId,
        reportId: dto.reportId,
        type: dto.type,
        reason: dto.reason,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      });

      await tx.moderationLog.create({
        data: {
          targetType: 'SANCTION',
          targetId: created.id,
          actionType: 'SANCTION',
          actorId: moderatorId,
          reason: dto.reason,
        },
      });

      return created;
    });

    return { sanction };
  }

  async revokeSanction(id: string, moderatorId: string, dto: RevokeSanctionDto) {
    const sanction = await this.prisma.sanction.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokeReason: dto.revokeReason,
      },
    });

    await this.restoreUserIfNoPermanentSuspension(sanction.userId);
    await this.log({
      targetType: 'SANCTION',
      targetId: sanction.id,
      actionType: 'REVOKE',
      actorId: moderatorId,
      reason: dto.revokeReason,
    });

    return { sanction };
  }

  private async getTargetSnapshot(
    targetType: ReportTargetType,
    targetId: string,
  ): Promise<TargetSnapshot> {
    if (targetType === 'DEBATE') {
      const debate = await this.prisma.debate.findUnique({
        where: { id: targetId },
        select: { id: true, creatorId: true, title: true, description: true },
      });
      if (!debate) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
      return {
        targetId,
        debateId: debate.id,
        ownerId: debate.creatorId,
        content: `${debate.title}\n${debate.description}`,
      };
    }

    if (targetType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: targetId },
        select: { debateId: true, authorId: true, content: true },
      });
      if (!post) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
      return { targetId, debateId: post.debateId, ownerId: post.authorId, content: post.content };
    }

    if (targetType === 'COMMENT') {
      const comment = await this.prisma.comment.findUnique({
        where: { id: targetId },
        select: { debateId: true, authorId: true, content: true },
      });
      if (!comment) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
      return { targetId, debateId: comment.debateId, ownerId: comment.authorId, content: comment.content };
    }

    if (targetType === 'CONSENSUS') {
      const consensus = await this.prisma.consensus.findUnique({
        where: { id: targetId },
        select: { debateId: true, creatorId: true, title: true, content: true },
      });
      if (!consensus) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
      return {
        targetId,
        debateId: consensus.debateId,
        ownerId: consensus.creatorId,
        content: `${consensus.title}\n${consensus.content}`,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, nickname: true, email: true },
    });
    if (!user) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
    return { targetId, debateId: null, ownerId: user.id, content: user.nickname };
  }

  private async applyContentAction(
    tx: Prisma.TransactionClient,
    targetType: ReportTargetType,
    targetId: string,
    actionType: ModerationActionType,
  ) {
    const statusMap = {
      HIDE: 'HIDDEN',
      DELETE: 'DELETED',
      RESTORE: 'VISIBLE',
    } as const;
    const status = statusMap[actionType as keyof typeof statusMap];
    if (!status) return;

    const data = {
      status,
      ...(actionType === 'DELETE' ? { deletedAt: new Date() } : {}),
      ...(actionType === 'RESTORE' ? { deletedAt: null } : {}),
    };

    if (targetType === 'POST') return tx.post.update({ where: { id: targetId }, data });
    if (targetType === 'COMMENT') return tx.comment.update({ where: { id: targetId }, data });
    throw new BadRequestException('해당 대상에는 콘텐츠 상태 변경을 적용할 수 없습니다.');
  }

  private async resolveTargetUserId(
    tx: Prisma.TransactionClient,
    targetType: ReportTargetType,
    targetId: string,
  ) {
    if (targetType === 'USER') return targetId;
    const target = await this.getTargetOwnerInTx(tx, targetType, targetId);
    if (!target) throw new NotFoundException('제재 대상 사용자를 찾을 수 없습니다.');
    return target;
  }

  private async getTargetOwnerInTx(
    tx: Prisma.TransactionClient,
    targetType: ReportTargetType,
    targetId: string,
  ) {
    if (targetType === 'DEBATE') {
      return (await tx.debate.findUnique({ where: { id: targetId }, select: { creatorId: true } }))?.creatorId;
    }
    if (targetType === 'POST') {
      return (await tx.post.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId;
    }
    if (targetType === 'COMMENT') {
      return (await tx.comment.findUnique({ where: { id: targetId }, select: { authorId: true } }))?.authorId;
    }
    return (await tx.consensus.findUnique({ where: { id: targetId }, select: { creatorId: true } }))?.creatorId;
  }

  private async createSanctionInTx(
    tx: Prisma.TransactionClient,
    input: {
      userId: string | null;
      moderatorId: string;
      reportId?: string | null;
      type: SanctionType;
      reason: string;
      startsAt?: Date;
      endsAt?: Date;
    },
  ) {
    if (!input.userId) throw new NotFoundException('제재 대상 사용자를 찾을 수 없습니다.');
    if (input.type === 'TEMP_SUSPENSION' && !input.endsAt) {
      throw new BadRequestException('임시 정지는 종료 시각이 필요합니다.');
    }

    const sanction = await tx.sanction.create({
      data: {
        userId: input.userId,
        moderatorId: input.moderatorId,
        reportId: input.reportId,
        type: input.type,
        reason: input.reason,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });

    if (input.type === 'PERMANENT_SUSPENSION') {
      await tx.user.update({ where: { id: input.userId }, data: { status: 'SUSPENDED' } });
    }

    return sanction;
  }

  private async expireElapsedSanctions(userId?: string) {
    await this.prisma.sanction.updateMany({
      where: {
        status: 'ACTIVE',
        ...(userId ? { userId } : {}),
        endsAt: { not: null, lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    if (userId) await this.restoreUserIfNoPermanentSuspension(userId);
  }

  private async restoreUserIfNoPermanentSuspension(userId: string) {
    const activePermanent = await this.prisma.sanction.findFirst({
      where: { userId, status: 'ACTIVE', type: 'PERMANENT_SUSPENSION' },
      select: { id: true },
    });
    if (!activePermanent) {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    }
  }

  private log(data: Prisma.ModerationLogUncheckedCreateInput) {
    return this.prisma.moderationLog.create({ data });
  }
}
