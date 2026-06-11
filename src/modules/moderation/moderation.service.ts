import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModerationActionType, ModerationTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModerationActionDto } from './dto/create-moderation-action.dto';

type ContentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createAction(actorId: string, actorRole: string, dto: CreateModerationActionDto) {
    await this.ensureCanModerate(actorId, actorRole, dto.debateId);
    await this.ensureTargetBelongsToDebate(dto.debateId, dto.targetType, dto.targetId);
    await this.applyAction(dto);

    const log = await this.prisma.moderationLog.create({
      data: {
        debateId: dto.debateId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        actionType: dto.actionType,
        actorId,
        reason: dto.reason,
      },
    });

    return { moderationLog: log };
  }

  private async ensureCanModerate(actorId: string, actorRole: string, debateId: string) {
    if (actorRole === 'ADMIN') return;

    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: {
        creatorId: true,
        participants: {
          where: { userId: actorId },
          select: { roleInDebate: true },
        },
      },
    });

    if (!debate) throw new NotFoundException('토론을 찾을 수 없습니다.');
    const memberRole = debate.participants[0]?.roleInDebate;
    if (debate.creatorId !== actorId && memberRole !== 'MODERATOR') {
      throw new ForbiddenException('운영 권한이 없습니다.');
    }
  }

  private async ensureTargetBelongsToDebate(
    debateId: string,
    targetType: ModerationTargetType,
    targetId: string,
  ) {
    const belongs =
      targetType === 'DEBATE'
        ? targetId === debateId
          ? await this.prisma.debate.findUnique({ where: { id: debateId }, select: { id: true } })
          : null
        : targetType === 'POST'
          ? await this.prisma.post.findFirst({ where: { id: targetId, debateId }, select: { id: true } })
          : targetType === 'COMMENT'
            ? await this.prisma.comment.findFirst({ where: { id: targetId, debateId }, select: { id: true } })
            : await this.prisma.consensus.findFirst({ where: { id: targetId, debateId }, select: { id: true } });

    if (!belongs) {
      throw new NotFoundException('운영 대상이 해당 토론에 속하지 않습니다.');
    }
  }

  private async applyAction(dto: CreateModerationActionDto) {
    const { targetType, targetId, actionType } = dto;

    switch (targetType) {
      case 'POST':
        return this.applyContentAction(this.prisma.post, targetId, actionType, '의견');
      case 'COMMENT':
        return this.applyContentAction(this.prisma.comment, targetId, actionType, '댓글');
      case 'DEBATE':
        return this.applyDebateAction(targetId, actionType);
      case 'CONSENSUS':
        return this.applyConsensusAction(targetId, actionType);
    }
  }

  /**
   * POST와 COMMENT에 공통으로 적용되는 HIDE/RESTORE/DELETE 로직
   */
  private async applyContentAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    targetId: string,
    actionType: ModerationActionType,
    label: string,
  ) {
    const statusMap: Partial<Record<ModerationActionType, ContentStatus>> = {
      HIDE: 'HIDDEN',
      RESTORE: 'VISIBLE',
      DELETE: 'DELETED',
    };

    const newStatus = statusMap[actionType];
    if (!newStatus) {
      throw new BadRequestException(`${label}에는 해당 운영 액션을 적용할 수 없습니다.`);
    }

    const data: { status: ContentStatus; deletedAt?: Date | null } = { status: newStatus };
    if (actionType === 'DELETE') data.deletedAt = new Date();
    if (actionType === 'RESTORE') data.deletedAt = null;

    await model.update({ where: { id: targetId }, data });
  }

  private async applyDebateAction(targetId: string, actionType: ModerationActionType) {
    if (actionType === 'CLOSE') {
      await this.prisma.debate.update({ where: { id: targetId }, data: { status: 'CLOSED', closedAt: new Date() } });
      return;
    }
    if (actionType === 'RESTORE') {
      await this.prisma.debate.update({ where: { id: targetId }, data: { status: 'OPEN', closedAt: null } });
      return;
    }
    throw new BadRequestException('토론에는 해당 운영 액션을 적용할 수 없습니다.');
  }

  private async applyConsensusAction(targetId: string, actionType: ModerationActionType) {
    if (actionType === 'CLOSE' || actionType === 'DELETE') {
      await this.prisma.consensus.update({ where: { id: targetId }, data: { status: 'CLOSED', closedAt: new Date() } });
      return;
    }
    if (actionType === 'RESTORE') {
      await this.prisma.consensus.update({ where: { id: targetId }, data: { status: 'OPEN', closedAt: null } });
      return;
    }
    throw new BadRequestException('합의안에는 해당 운영 액션을 적용할 수 없습니다.');
  }
}
