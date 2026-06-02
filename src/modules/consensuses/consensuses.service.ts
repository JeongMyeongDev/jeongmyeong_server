import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DefinitionScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
import { UpdateConsensusStatusDto } from './dto/update-consensus-status.dto';
import { VoteConsensusDto } from './dto/vote-consensus.dto';

@Injectable()
export class ConsensusesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeTerm(term: string) {
    return term.trim().toLowerCase().replace(/\s+/g, ' ');
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
      throw new NotFoundException('선택 대상을 찾을 수 없습니다.');
    }
    if (selectionTarget.debate.status !== 'OPEN') {
      throw new ConflictException('종료된 토론에는 합의안을 생성할 수 없습니다.');
    }

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

    return { success: true, consensus };
  }

  async findOne(consensusId: string) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: {
        id: true,
        debateId: true,
        selectionTargetId: true,
        creatorId: true,
        title: true,
        content: true,
        status: true,
        resultSummary: true,
        approvedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        creator: { select: { id: true, nickname: true } },
        debate: { select: { id: true, title: true, creatorId: true } },
        selectionTarget: {
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
            selectedText: true,
            startOffset: true,
            endOffset: true,
          },
        },
        definitions: {
          select: {
            id: true,
            term: true,
            content: true,
            scope: true,
            status: true,
            createdAt: true,
          },
        },
        votes: { select: { voteType: true } },
      },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }

    const approveCount = consensus.votes.filter((vote) => vote.voteType === 'APPROVE').length;
    const rejectCount = consensus.votes.filter((vote) => vote.voteType === 'REJECT').length;
    const commentCount = consensus.votes.filter((vote) => vote.voteType === 'COMMENT').length;

    return {
      success: true,
      consensus: {
        ...consensus,
        approveCount,
        rejectCount,
        commentCount,
        votes: undefined,
      },
    };
  }

  async listVotes(consensusId: string) {
    await this.ensureConsensusExists(consensusId);

    const votes = await this.prisma.consensusVote.findMany({
      where: { consensusId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        consensusId: true,
        userId: true,
        voteType: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, nickname: true } },
      },
    });

    return { success: true, votes };
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

  async updateStatus(
    consensusId: string,
    userId: string,
    userRole: string,
    dto: UpdateConsensusStatusDto,
  ) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: {
        id: true,
        debateId: true,
        creatorId: true,
        content: true,
        selectionTargetId: true,
        debate: { select: { creatorId: true } },
        selectionTarget: { select: { selectedText: true } },
      },
    });

    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }
    if (
      consensus.creatorId !== userId &&
      consensus.debate.creatorId !== userId &&
      userRole !== 'ADMIN'
    ) {
      throw new ForbiddenException('합의안 상태 변경 권한이 없습니다.');
    }

    const now = new Date();
    const updated = await this.prisma.consensus.update({
      where: { id: consensusId },
      data: {
        status: dto.status,
        resultSummary: dto.resultSummary,
        approvedAt: dto.status === 'APPROVED' ? now : undefined,
        closedAt: dto.status === 'CLOSED' ? now : undefined,
      },
      select: {
        id: true,
        debateId: true,
        selectionTargetId: true,
        creatorId: true,
        title: true,
        content: true,
        status: true,
        resultSummary: true,
        approvedAt: true,
        closedAt: true,
      },
    });

    const definitions: Array<{
      id: string;
      term: string;
      content: string;
      scope: DefinitionScope;
      status: string;
    }> = [];
    if (dto.status === 'APPROVED') {
      definitions.push(
        await this.upsertDefinition(consensus, DefinitionScope.IN_DEBATE, dto.resultSummary),
      );

      if (dto.saveAsGlobalDefinition) {
        definitions.push(
          await this.upsertDefinition(consensus, DefinitionScope.GLOBAL_REFERENCE, dto.resultSummary),
        );
      }
    }

    return { success: true, consensus: updated, definitions };
  }

  private async ensureConsensusExists(consensusId: string) {
    const consensus = await this.prisma.consensus.findUnique({
      where: { id: consensusId },
      select: { id: true },
    });
    if (!consensus) {
      throw new NotFoundException('합의안을 찾을 수 없습니다.');
    }
  }

  private async upsertDefinition(
    consensus: {
      id: string;
      debateId: string;
      creatorId: string;
      content: string;
      selectionTargetId: string;
      selectionTarget: { selectedText: string };
    },
    scope: DefinitionScope,
    resultSummary?: string,
  ) {
    const term = consensus.selectionTarget.selectedText;
    const content = resultSummary?.trim() || consensus.content;
    const existing = await this.prisma.definition.findFirst({
      where: {
        sourceConsensusId: consensus.id,
        scope,
      },
      select: { id: true },
    });

    const data: Prisma.DefinitionUncheckedCreateInput = {
      term,
      content,
      sourceDebateId: consensus.debateId,
      sourceConsensusId: consensus.id,
      selectionTargetId: consensus.selectionTargetId,
      scope,
      creatorId: consensus.creatorId,
      terms: {
        create: {
          originalTerm: term,
          normalizedTerm: this.normalizeTerm(term),
        },
      },
    };

    if (existing) {
      await this.prisma.definitionTerm.deleteMany({ where: { definitionId: existing.id } });
      return this.prisma.definition.update({
        where: { id: existing.id },
        data: {
          term,
          content,
          status: 'ACTIVE',
          terms: data.terms,
        },
        select: {
          id: true,
          term: true,
          content: true,
          scope: true,
          status: true,
        },
      });
    }

    return this.prisma.definition.create({
      data,
      select: {
        id: true,
        term: true,
        content: true,
        scope: true,
        status: true,
      },
    });
  }
}
