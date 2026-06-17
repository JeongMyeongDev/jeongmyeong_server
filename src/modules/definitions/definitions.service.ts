import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const definitionSelect = {
  id: true,
  term: true,
  content: true,
  scope: true,
  status: true,
  sourceDebateId: true,
  sourceConsensusId: true,
  selectionTargetId: true,
  creatorId: true,
  createdAt: true,
  updatedAt: true,
  sourceDebate: {
    select: { id: true, title: true },
  },
  sourceConsensus: {
    select: { id: true, title: true, status: true },
  },
  selectionTarget: {
    select: { id: true, selectedText: true, sourceType: true, sourceId: true },
  },
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  terms: {
    select: { id: true, normalizedTerm: true, originalTerm: true },
  },
} satisfies Prisma.DefinitionSelect;

@Injectable()
export class DefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(keyword?: string) {
    const normalizedKeyword = normalizeDefinitionTerm(keyword ?? '');
    const where: Prisma.DefinitionWhereInput = {
      status: 'ACTIVE',
      ...(normalizedKeyword
        ? {
            OR: [
              { term: { contains: keyword?.trim(), mode: 'insensitive' } },
              { content: { contains: keyword?.trim(), mode: 'insensitive' } },
              {
                terms: {
                  some: {
                    normalizedTerm: {
                      contains: normalizedKeyword,
                      mode: 'insensitive',
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const definitions = await this.prisma.definition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: definitionSelect,
    });

    return { definitions };
  }

  async findOne(definitionId: string) {
    const definition = await this.prisma.definition.findUnique({
      where: { id: definitionId },
      select: definitionSelect,
    });

    if (!definition || definition.status !== 'ACTIVE') {
      throw new NotFoundException('기준 정의를 찾을 수 없습니다.');
    }

    return { definition };
  }

  async findByDebate(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }

    const definitions = await this.prisma.definition.findMany({
      where: { sourceDebateId: debateId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: definitionSelect,
    });

    return { definitions };
  }
}

export function normalizeDefinitionTerm(term: string) {
  return term.trim().toLowerCase().replace(/\s+/g, ' ');
}

export { definitionSelect };
