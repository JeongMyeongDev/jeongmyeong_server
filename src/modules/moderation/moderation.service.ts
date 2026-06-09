import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ModerationActionType, ModerationTargetType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModerationActionDto } from './dto/create-moderation-action.dto';

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

    return { success: true, moderationLog: log };
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
    if (dto.targetType === 'POST') {
      await this.applyPostAction(dto.targetId, dto.actionType);
      return;
    }
    if (dto.targetType === 'COMMENT') {
      await this.applyCommentAction(dto.targetId, dto.actionType);
      return;
    }
    if (dto.targetType === 'DEBATE') {
      await this.applyDebateAction(dto.targetId, dto.actionType);
      return;
    }
    if (dto.targetType === 'CONSENSUS') {
      await this.applyConsensusAction(dto.targetId, dto.actionType);
      return;
    }
  }

  private async applyPostAction(targetId: string, actionType: ModerationActionType) {
    if (actionType === 'HIDE') {
      await this.prisma.post.update({ where: { id: targetId }, data: { status: 'HIDDEN' } });
      return;
    }
    if (actionType === 'RESTORE') {
      await this.prisma.post.update({ where: { id: targetId }, data: { status: 'VISIBLE', deletedAt: null } });
      return;
    }
    if (actionType === 'DELETE') {
      await this.prisma.post.update({ where: { id: targetId }, data: { status: 'DELETED', deletedAt: new Date() } });
      return;
    }
    throw new BadRequestException('의견에는 해당 운영 액션을 적용할 수 없습니다.');
  }

  private async applyCommentAction(targetId: string, actionType: ModerationActionType) {
    if (actionType === 'HIDE') {
      await this.prisma.comment.update({ where: { id: targetId }, data: { status: 'HIDDEN' } });
      return;
    }
    if (actionType === 'RESTORE') {
      await this.prisma.comment.update({ where: { id: targetId }, data: { status: 'VISIBLE', deletedAt: null } });
      return;
    }
    if (actionType === 'DELETE') {
      await this.prisma.comment.update({ where: { id: targetId }, data: { status: 'DELETED', deletedAt: new Date() } });
      return;
    }
    throw new BadRequestException('댓글에는 해당 운영 액션을 적용할 수 없습니다.');
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
