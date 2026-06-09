import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import {
  definitionSelect,
  normalizeDefinitionTerm,
} from '../definitions/definitions.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
import { VoteConsensusDto } from './dto/vote-consensus.dto';

const consensusSelect = {
  id: true,
  debateId: true,
  selectionTargetId: true,
  creatorId: true,
  term: true,
  title: true,
  content: true,
  status: true,
  resultSummary: true,
  approvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  selectionTarget: {
    select: {
      id: true,
      debateId: true,
      sourceType: true,
      sourceId: true,
      selectedText: true,
      startOffset: true,
      endOffset: true,
      creator: {
        select: { id: true, nickname: true, profileImage: true },
      },
      createdAt: true,
    },
  },
} satisfies Prisma.ConsensusSelect;

@Injectable()
export class ConsensusesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findOne(consensusId: string, userId?: string) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: {
        ...consensusSelect,
        votes: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            consensusId: true,
            userId: true,
            voteType: true,
            comment: true,
            updatedAt: true,
            user: {
              select: { id: true, nickname: true, profileImage: true },
            },
          },
        },
      },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }

    return {
      success: true,
      consensus: await this.withConsensusVoteSummary(consensus, userId),
    };
  }

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
      throw new ConflictException(
        '종료된 토론에는 합의안을 생성할 수 없습니다.',
      );
    }
    await this.ensureNoDuplicateConsensus(
      selectionTargetId,
      dto.title,
      dto.content,
    );

    const consensus = await this.prisma.consensus.create({
      data: {
        debateId: selectionTarget.debateId,
        selectionTargetId,
        creatorId: userId,
        term: dto.term,
        title: dto.title,
        content: dto.content,
      },
      select: consensusSelect,
    });

    await this.notifySubscribers(
      selectionTarget.debateId,
      userId,
      consensus.id,
    );

    return {
      success: true,
      consensus: await this.withConsensusVoteSummary(consensus, userId),
    };
  }

  async vote(consensusId: string, userId: string, dto: VoteConsensusDto) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: {
        id: true,
        status: true,
        debate: { select: { status: true } },
      },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }
    if (consensus.debate.status !== 'OPEN' || consensus.status !== 'OPEN') {
      throw new ConflictException('종료된 합의안에는 투표할 수 없습니다.');
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

    const updatedConsensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: consensusSelect,
    });

    return {
      success: true,
      vote,
      consensus: updatedConsensus
        ? await this.withConsensusVoteSummary(updatedConsensus, userId)
        : null,
    };
  }

  async approve(consensusId: string, user: AuthenticatedUser) {
    const consensus = await this.findFinalizableConsensus(consensusId);
    this.ensureCanFinalize(consensus, user);
    if (consensus.debate.status !== 'OPEN') {
      throw new ConflictException(
        '종료된 토론에서는 합의안을 확정할 수 없습니다.',
      );
    }
    if (consensus.status !== 'OPEN' && consensus.status !== 'APPROVED') {
      throw new ConflictException('이미 종료된 합의안입니다.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const approvedConsensus = await tx.consensus.update({
        where: { id: consensusId },
        data: {
          status: 'APPROVED',
          approvedAt: consensus.approvedAt ?? new Date(),
          closedAt: null,
        },
        select: consensusSelect,
      });

      const existingDefinition = await tx.definition.findFirst({
        where: { sourceConsensusId: consensusId, status: 'ACTIVE' },
        select: definitionSelect,
      });

      const definition =
        existingDefinition ??
        (await this.createDefinitionForConsensus(tx, approvedConsensus));

      return { approvedConsensus, definition };
    });

    return {
      success: true,
      message: '합의안이 승인되어 기준 정의로 저장되었습니다.',
      consensus: await this.withConsensusVoteSummary(
        result.approvedConsensus,
        user.id,
      ),
      definition: result.definition,
    };
  }

  async reject(consensusId: string, user: AuthenticatedUser) {
    return this.finalizeWithoutDefinition(
      consensusId,
      user,
      'REJECTED',
      '합의안이 반려되었습니다.',
    );
  }

  async close(consensusId: string, user: AuthenticatedUser) {
    return this.finalizeWithoutDefinition(
      consensusId,
      user,
      'CLOSED',
      '합의안이 종료되었습니다.',
    );
  }

  private async ensureNoDuplicateConsensus(
    selectionTargetId: string,
    title: string,
    content: string,
  ) {
    const existing = await this.prisma.consensus.findFirst({
      where: { selectionTargetId, title, content },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('동일한 합의안이 이미 제안되어 있습니다.');
    }
  }

  private async finalizeWithoutDefinition(
    consensusId: string,
    user: AuthenticatedUser,
    status: 'REJECTED' | 'CLOSED',
    message: string,
  ) {
    const consensus = await this.findFinalizableConsensus(consensusId);
    this.ensureCanFinalize(consensus, user);
    if (consensus.debate.status !== 'OPEN') {
      throw new ConflictException(
        '종료된 토론에서는 합의안을 확정할 수 없습니다.',
      );
    }
    if (consensus.status !== 'OPEN') {
      throw new ConflictException('이미 종료된 합의안입니다.');
    }

    const updatedConsensus = await this.prisma.consensus.update({
      where: { id: consensusId },
      data: { status, closedAt: new Date() },
      select: consensusSelect,
    });

    return {
      success: true,
      message,
      consensus: await this.withConsensusVoteSummary(updatedConsensus, user.id),
    };
  }

  private async findFinalizableConsensus(consensusId: string) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: {
        id: true,
        creatorId: true,
        term: true,
        content: true,
        status: true,
        approvedAt: true,
        selectionTargetId: true,
        debate: {
          select: { id: true, creatorId: true, status: true },
        },
      },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }

    return consensus;
  }

  private ensureCanFinalize(
    consensus: Awaited<ReturnType<ConsensusesService['findFinalizableConsensus']>>,
    user: AuthenticatedUser,
  ) {
    if (user.role !== 'ADMIN' && consensus.debate.creatorId !== user.id) {
      throw new ForbiddenException('합의안을 확정할 권한이 없습니다.');
    }
  }

  private async createDefinitionForConsensus(
    tx: Prisma.TransactionClient,
    consensus: Prisma.ConsensusGetPayload<{ select: typeof consensusSelect }>,
  ) {
    const originalTerm = consensus.term.trim() || consensus.selectionTarget.selectedText;
    const normalizedTerm = normalizeDefinitionTerm(originalTerm);

    return tx.definition.create({
      data: {
        term: originalTerm,
        content: consensus.content,
        scope: 'IN_DEBATE',
        sourceDebateId: consensus.debateId,
        sourceConsensusId: consensus.id,
        selectionTargetId: consensus.selectionTargetId,
        creatorId: consensus.creatorId,
        terms: {
          create: {
            originalTerm,
            normalizedTerm,
          },
        },
      },
      select: definitionSelect,
    });
  }

  private async withConsensusVoteSummary<
    T extends { id: string; votes?: unknown },
  >(consensus: T, userId?: string) {
    const [approveCount, rejectCount, commentCount] =
      await this.prisma.$transaction([
        this.prisma.consensusVote.count({
          where: { consensusId: consensus.id, voteType: 'APPROVE' },
        }),
        this.prisma.consensusVote.count({
          where: { consensusId: consensus.id, voteType: 'REJECT' },
        }),
        this.prisma.consensusVote.count({
          where: {
            consensusId: consensus.id,
            OR: [{ voteType: 'COMMENT' }, { comment: { not: null } }],
          },
        }),
      ]);

    const myVote = userId
      ? await this.prisma.consensusVote.findUnique({
          where: { consensusId_userId: { consensusId: consensus.id, userId } },
          select: {
            id: true,
            consensusId: true,
            userId: true,
            voteType: true,
            comment: true,
            updatedAt: true,
          },
        })
      : null;

    return {
      ...consensus,
      approveCount,
      rejectCount,
      commentCount,
      myVote,
    };
  }

  private async notifySubscribers(
    debateId: string,
    actorId: string,
    consensusId: string,
  ) {
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
