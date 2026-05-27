import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DebateStatus, Prisma, SelectionSource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { CreateDebateDto } from './dto/create-debate.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateSelectionTargetDto } from './dto/create-selection-target.dto';
import { ListDebatesDto } from './dto/list-debates.dto';

const debateSummarySelect = {
  id: true,
  title: true,
  description: true,
  debateType: true,
  status: true,
  createdAt: true,
  archivedAt: true,
  tagMaps: {
    select: {
      tag: { select: { id: true, name: true } },
    },
  },
  creator: {
    select: { id: true, nickname: true, profileImage: true },
  },
  _count: {
    select: { participants: true },
  },
} satisfies Prisma.DebateSelect;

@Injectable()
export class DebatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateDebateDto) {
    if (dto.closeConditionType === 'TIME_LIMIT' && !dto.closeAt) {
      throw new BadRequestException('TIME_LIMIT 종료 조건에는 closeAt이 필요합니다.');
    }

    const debate = await this.prisma.debate.create({
      data: {
        title: dto.title,
        description: dto.description,
        debateType: dto.debateType,
        closeConditionType: dto.closeConditionType,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
        creatorId: userId,
        participants: {
          create: {
            userId,
            roleInDebate: 'CREATOR',
          },
        },
        tagMaps: {
          create: (dto.tags ?? []).map((name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          })),
        },
      },
      select: debateSummarySelect,
    });

    return { success: true, debate: this.withParticipantCount(debate) };
  }

  async findAll(query: ListDebatesDto, archivedOnly = false) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query, archivedOnly);
    const sort = archivedOnly ? query.sort ?? 'archivedAt' : query.sort ?? 'createdAt';

    const [debates, totalCount] = await this.prisma.$transaction([
      this.prisma.debate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: query.direction ?? 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          debateType: true,
          status: true,
          createdAt: true,
          archivedAt: true,
          creator: {
            select: { id: true, nickname: true },
          },
          tagMaps: {
            select: {
              tag: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.debate.count({ where }),
    ]);

    return {
      success: true,
      debates: debates.map((debate) => this.withParticipantCount(debate)),
      page,
      limit,
      totalCount,
    };
  }

  async findOne(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: debateSummarySelect,
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }

    return { success: true, debate: this.withParticipantCount(debate) };
  }

  async join(debateId: string, userId: string) {
    await this.ensureDebateOpen(debateId);

    const participant = await this.prisma.debateParticipant.upsert({
      where: {
        debateId_userId: { debateId, userId },
      },
      create: {
        debateId,
        userId,
      },
      update: {
        lastReadAt: new Date(),
      },
      select: {
        id: true,
        debateId: true,
        userId: true,
        joinedAt: true,
        lastReadAt: true,
        roleInDebate: true,
        user: {
          select: { id: true, nickname: true, profileImage: true },
        },
      },
    });

    const participantCount = await this.prisma.debateParticipant.count({
      where: { debateId },
    });

    return { success: true, participant, participantCount };
  }

  async archive(debateId: string, userId: string, userRole: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true, creatorId: true, status: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }

    if (debate.creatorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('아카이브 권한이 없습니다.');
    }

    if (debate.status === 'ARCHIVED') {
      throw new ConflictException('이미 아카이브된 토론입니다.');
    }

    if (debate.status !== 'CLOSED') {
      throw new BadRequestException('종결된 토론만 아카이브할 수 있습니다.');
    }

    const updated = await this.prisma.debate.update({
      where: { id: debateId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      select: { id: true, status: true, archivedAt: true },
    });

    return { success: true, debate: updated };
  }

  async createPost(debateId: string, userId: string, dto: CreatePostDto) {
    await this.ensureDebateOpen(debateId);
    await this.ensureParticipant(debateId, userId);

    const post = await this.prisma.post.create({
      data: {
        debateId,
        authorId: userId,
        content: dto.content,
      },
      select: {
        id: true,
        debateId: true,
        authorId: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    return { success: true, post };
  }

  async listPosts(debateId: string, query: ListDebatesDto) {
    await this.ensureDebateExists(debateId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { debateId, status: 'VISIBLE' as const };

    const [posts, totalCount] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          debateId: true,
          content: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, nickname: true, profileImage: true },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { success: true, posts, page, limit, totalCount };
  }

  async createSelectionTarget(
    debateId: string,
    userId: string,
    dto: CreateSelectionTargetDto,
  ) {
    await this.ensureDebateExists(debateId);
    const source = await this.getSelectionSource(dto.sourceType, dto.sourceId);

    if (source.debateId !== debateId) {
      throw new BadRequestException('선택 대상이 요청한 토론에 속하지 않습니다.');
    }

    this.validateSelection(source.content, dto.selectedText, dto.startOffset, dto.endOffset);

    const selectionTarget = await this.prisma.selectionTarget.create({
      data: {
        debateId,
        creatorId: userId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        selectedText: dto.selectedText,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
      },
    });

    return { success: true, selectionTarget };
  }

  async createConsensus(debateId: string, userId: string, dto: CreateConsensusDto) {
    await this.ensureDebateOpen(debateId);
    await this.ensureSelectionTarget(debateId, dto.selectionTargetId);

    const consensus = await this.prisma.consensus.create({
      data: {
        debateId,
        creatorId: userId,
        selectionTargetId: dto.selectionTargetId,
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

  private buildWhere(query: ListDebatesDto, archivedOnly: boolean): Prisma.DebateWhereInput {
    const where: Prisma.DebateWhereInput = {};

    if (archivedOnly) {
      where.status = DebateStatus.ARCHIVED;
    } else if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    if (query.tag) {
      where.tagMaps = {
        some: {
          tag: { name: query.tag },
        },
      };
    }

    if (query.type) {
      where.debateType = query.type;
    }

    return where;
  }

  private async ensureDebateExists(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true },
    });
    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
  }

  private async ensureDebateOpen(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { status: true },
    });
    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    if (debate.status !== 'OPEN') {
      throw new ConflictException('종료된 토론에는 작성할 수 없습니다.');
    }
  }

  private async ensureParticipant(debateId: string, userId: string) {
    await this.prisma.debateParticipant.upsert({
      where: {
        debateId_userId: { debateId, userId },
      },
      create: {
        debateId,
        userId,
      },
      update: {},
    });
  }

  private withParticipantCount<T extends { _count?: { participants: number } }>(debate: T) {
    return {
      ...debate,
      participantCount: debate._count?.participants ?? 0,
    };
  }

  private async getSelectionSource(sourceType: SelectionSource, sourceId: string) {
    if (sourceType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: sourceId },
        select: { debateId: true, content: true },
      });
      if (!post) {
        throw new NotFoundException('의견을 찾을 수 없습니다.');
      }
      return post;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: sourceId },
      select: { debateId: true, content: true },
    });
    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    return comment;
  }

  private validateSelection(
    sourceContent: string,
    selectedText: string,
    startOffset: number,
    endOffset: number,
  ) {
    if (startOffset >= endOffset || endOffset > sourceContent.length) {
      throw new BadRequestException('선택 영역 범위가 올바르지 않습니다.');
    }

    if (sourceContent.slice(startOffset, endOffset) !== selectedText) {
      console.log('sourceContent:', sourceContent.slice(startOffset, endOffset));
      throw new BadRequestException('선택한 문자열이 원문과 일치하지 않습니다.');
    }
  }

  private async ensureSelectionTarget(debateId: string, selectionTargetId?: string) {
    if (!selectionTargetId) {
      return;
    }
    const selection = await this.prisma.selectionTarget.findUnique({
      where: { id: selectionTargetId },
      select: { debateId: true },
    });
    if (!selection) {
      throw new NotFoundException('선택 대상을 찾을 수 없습니다.');
    }
    if (selection.debateId !== debateId) {
      throw new BadRequestException('선택 대상이 요청한 토론에 속하지 않습니다.');
    }
  }
}
