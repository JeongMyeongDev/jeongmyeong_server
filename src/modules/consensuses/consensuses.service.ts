import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
import { VoteConsensusDto } from './dto/vote-consensus.dto';

@Injectable()
export class ConsensusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createFromSelectionTarget(
    selectionTargetId: string,
    userId: string,
    dto: CreateSelectionConsensusDto,
  ) {
    const selectionTarget = await this.prisma.selectionTarget.findUnique({
      where: { id: selectionTargetId },
      select: {
        debateId: true,
        debate: { select: { status: true } },
      },
    });

    if (!selectionTarget) {
      throw new NotFoundException('선택 영역을 찾을 수 없습니다.');
    }
    if (selectionTarget.debate.status !== 'OPEN') {
      throw new ConflictException('종료된 토론에는 합의안을 생성할 수 없습니다.');
    }
    await this.ensureNoOpenConsensus(selectionTargetId);

    const consensus = await this.prisma.consensus.create({
      data: {
        debateId: selectionTarget.debateId,
        selectionTargetId,
        creatorId: userId,
        title: dto.title,
        content: dto.content,
      },
      select: {
        id: true,
        debateId: true,
        selectionTargetId: true,
        creatorId: true,
        title: true,
        content: true,
        status: true,
      },
    });

    await this.notifySubscribers(selectionTarget.debateId, userId, consensus.id);

    return { success: true, consensus };
  }

  async vote(consensusId: string, userId: string, dto: VoteConsensusDto) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: { id: true },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }

    const vote = await this.prisma.consensusVote.upsert({
      where: { consensusId_userId: { consensusId, userId } },
      create: {
        consensusId,
        userId,
        voteType: dto.voteType,
        comment: dto.comment,
      },
      update: {
        voteType: dto.voteType,
        comment: dto.comment,
      },
      select: {
        id: true,
        consensusId: true,
        userId: true,
        voteType: true,
        comment: true,
        updatedAt: true,
      },
    });

    return { success: true, vote };
  }

  private async ensureNoOpenConsensus(selectionTargetId: string) {
    const existing = await this.prisma.consensus.findFirst({
      where: { selectionTargetId, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('이미 진행 중인 합의안이 있는 선택 영역입니다.');
    }
  }

  private async notifySubscribers(debateId: string, actorId: string, consensusId: string) {
    const subscriptions = await this.prisma.debateSubscription.findMany({
      where: { debateId, userId: { not: actorId } },
      select: { userId: true },
    });

    for (const subscription of subscriptions) {
      void this.notificationsService.createNotification({
        recipientId: subscription.userId,
        actorId,
        type: 'NEW_CONSENSUS_IN_DEBATE',
        debateId,
        referenceId: consensusId,
      });
    }
  }
}
