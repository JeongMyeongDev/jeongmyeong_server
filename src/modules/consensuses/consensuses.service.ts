import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
import { VoteConsensusDto } from './dto/vote-consensus.dto';

@Injectable()
export class ConsensusesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
