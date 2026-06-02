import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DefinitionScope, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDefinitionDto } from './dto/create-definition.dto';
import { ListDefinitionsDto } from './dto/list-definitions.dto';

@Injectable()
export class DefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeTerm(term: string) {
    return term.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  async findAll(query: ListDefinitionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.DefinitionWhereInput = {
      status: 'ACTIVE',
    };

    if (query.scope) {
      where.scope = query.scope;
    }
    if (query.debateId) {
      where.sourceDebateId = query.debateId;
    }
    if (query.q?.trim()) {
      const q = query.q.trim();
      const normalized = this.normalizeTerm(q);
      where.OR = [
        { term: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { terms: { some: { normalizedTerm: { contains: normalized } } } },
        { terms: { some: { originalTerm: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [definitions, totalCount] = await this.prisma.$transaction([
      this.prisma.definition.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: this.definitionSelect(),
      }),
      this.prisma.definition.count({ where }),
    ]);

    return { success: true, definitions, page, limit, totalCount };
  }

  async findOne(definitionId: string) {
    const definition = await this.prisma.definition.findUnique({
      where: { id: definitionId },
      select: this.definitionSelect(),
    });

    if (!definition) {
      throw new NotFoundException('정의를 찾을 수 없습니다.');
    }

    return { success: true, definition };
  }

  async findByDebate(debateId: string) {
    const definitions = await this.prisma.definition.findMany({
      where: {
        sourceDebateId: debateId,
        scope: DefinitionScope.IN_DEBATE,
        status: 'ACTIVE',
      },
      orderBy: { updatedAt: 'desc' },
      select: this.definitionSelect(),
    });

    return { success: true, definitions };
  }

  async create(userId: string, userRole: string, dto: CreateDefinitionDto) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: dto.sourceDebateId },
      select: { creatorId: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    if (debate.creatorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('정의 생성 권한이 없습니다.');
    }

    const definition = await this.prisma.definition.create({
      data: {
        term: dto.term,
        content: dto.content,
        scope: dto.scope,
        sourceDebateId: dto.sourceDebateId,
        sourceConsensusId: dto.sourceConsensusId,
        selectionTargetId: dto.selectionTargetId,
        creatorId: userId,
        terms: {
          create: {
            originalTerm: dto.term,
            normalizedTerm: this.normalizeTerm(dto.term),
          },
        },
      },
      select: this.definitionSelect(),
    });

    return { success: true, definition };
  }

  private definitionSelect() {
    return {
      id: true,
      term: true,
      content: true,
      scope: true,
      status: true,
      sourceDebateId: true,
      sourceConsensusId: true,
      selectionTargetId: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { id: true, nickname: true } },
      sourceDebate: { select: { id: true, title: true } },
      sourceConsensus: { select: { id: true, title: true, status: true } },
      selectionTarget: { select: { id: true, selectedText: true } },
      terms: { select: { id: true, originalTerm: true, normalizedTerm: true } },
    } satisfies Prisma.DefinitionSelect;
  }
}
