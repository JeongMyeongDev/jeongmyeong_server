import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DebateStance, Prisma, SelectionSource } from '@prisma/client';
import {
  consensusSelect,
  debateListSelect,
  debateSummarySelect,
  selectionTargetSelect,
  withConsensusVoteSummary,
  withParticipantCount,
} from '../../common/constants/select.constants';
import { normalizePagination, paginationMeta } from '../../common/utils/pagination.util';
import { validateSelection } from '../../common/utils/selection.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SanctionsService } from '../sanctions/sanctions.service';
import {
  DefinitionReferencesService,
  definitionReferenceSelect,
} from '../definition-references/definition-references.service';
import { CloseDebateDto } from './dto/close-debate.dto';
import { CreateChildDebateDto } from './dto/create-child-debate.dto';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { CreateDebateDto } from './dto/create-debate.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateSelectionTargetDto } from './dto/create-selection-target.dto';
import { ListDebatesDto } from './dto/list-debates.dto';
import { UpdateStanceDto } from './dto/update-stance.dto';

const CONSENSUS_BLOCK_MESSAGE =
  '진행 중인 합의 또는 하위 토론이 있어 새 의견을 작성할 수 없습니다.';
const CLOSED_WRITE_MESSAGE = '종료된 토론에서는 새 내용을 작성할 수 없습니다.';
const ARCHIVED_WRITE_MESSAGE = '아카이브된 토론은 읽기 전용입니다.';
const PROS_CONS_STANCE_REQUIRED_MESSAGE =
  '찬반 토론에서는 입장을 선택해야 의견을 작성할 수 있습니다.';

@Injectable()
export class DebatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly definitionReferencesService: DefinitionReferencesService,
    private readonly sanctionsService: SanctionsService,
  ) {}

  async create(userId: string, dto: CreateDebateDto) {
    await this.sanctionsService.assertUserCanCreateDebate(userId);
    if (dto.closeConditionType === 'TIME_LIMIT' && !dto.closeAt) {
      throw new BadRequestException(
        'TIME_LIMIT 종료 조건에는 closeAt이 필요합니다.',
      );
    }

    const tags = this.normalizeTags(dto.tags);
    const debate = await this.prisma.debate.create({
      data: {
        title: dto.title,
        description: dto.description,
        debateType: dto.debateType,
        closeConditionType: dto.closeConditionType,
        closeAt: dto.closeAt ? new Date(dto.closeAt) : undefined,
        creatorId: userId,
        participants: {
          create: { userId, roleInDebate: 'CREATOR' },
        },
        tagMaps: {
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: { where: { name }, create: { name } },
            },
          })),
        },
      },
      select: debateSummarySelect,
    });

    return { debate: withParticipantCount(debate) };
  }

  async findMyDebates(userId: string, query: ListDebatesDto) {
    const { page, limit, skip } = normalizePagination(query);
    const sort = query.sort ?? 'createdAt';
    const where = {
      creatorId: userId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [debates, totalCount] = await this.prisma.$transaction([
      this.prisma.debate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: query.direction ?? 'desc' },
        select: debateListSelect,
      }),
      this.prisma.debate.count({ where }),
    ]);

    return {
      debates: debates.map(withParticipantCount),
      ...paginationMeta(page, limit, totalCount),
    };
  }

  async findMyBookmarks(userId: string, query: ListDebatesDto) {
    const { page, limit, skip } = normalizePagination(query);
    const [bookmarks, totalCount] = await this.prisma.$transaction([
      this.prisma.debateBookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { debate: { select: debateSummarySelect } },
      }),
      this.prisma.debateBookmark.count({ where: { userId } }),
    ]);

    return {
      debates: bookmarks.map((b) => withParticipantCount(b.debate)),
      ...paginationMeta(page, limit, totalCount),
    };
  }

  async findAll(query: ListDebatesDto, archivedOnly = false) {
    const { page, limit, skip } = normalizePagination(query);
    const where = this.buildWhere(query, archivedOnly);
    const sort = archivedOnly
      ? (query.sort ?? 'archivedAt')
      : (query.sort ?? 'createdAt');

    const [debates, totalCount] = await this.prisma.$transaction([
      this.prisma.debate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: query.direction ?? 'desc' },
        select: debateListSelect,
      }),
      this.prisma.debate.count({ where }),
    ]);

    return {
      debates: debates.map(withParticipantCount),
      ...paginationMeta(page, limit, totalCount),
    };
  }

  async findOne(debateId: string, userId?: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: debateSummarySelect,
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }

    const [bookmark, subscription] = userId
      ? await this.prisma.$transaction([
          this.prisma.debateBookmark.findUnique({
            where: { userId_debateId: { userId, debateId } },
            select: { id: true },
          }),
          this.prisma.debateSubscription.findUnique({
            where: { userId_debateId: { userId, debateId } },
            select: { id: true },
          }),
        ])
      : [null, null];

    return {
      debate: {
        ...withParticipantCount(debate),
        isBookmarked: Boolean(bookmark),
        isSubscribed: Boolean(subscription),
      },
    };
  }

  async getProgress(debateId: string) {
    await this.ensureDebateExists(debateId);
    return { progress: await this.buildProgress(debateId) };
  }

  async updateStance(debateId: string, userId: string, dto: UpdateStanceDto) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true, debateType: true, status: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    this.ensureWritableStatus(debate.status);
    if (debate.debateType !== 'PROS_CONS') {
      throw new BadRequestException('찬반 토론에서만 입장을 선택할 수 있습니다.');
    }

    const stance = await this.prisma.debateUserStance.upsert({
      where: { debateId_userId: { debateId, userId } },
      create: { debateId, userId, stance: dto.stance },
      update: { stance: dto.stance },
      select: { id: true, debateId: true, userId: true, stance: true, updatedAt: true },
    });

    return { stance, summary: await this.getStanceSummaryValue(debateId) };
  }

  async getMyStance(debateId: string, userId: string) {
    await this.ensureDebateExists(debateId);
    const stance = await this.prisma.debateUserStance.findUnique({
      where: { debateId_userId: { debateId, userId } },
      select: { id: true, debateId: true, userId: true, stance: true, updatedAt: true },
    });

    return { stance };
  }

  async getStanceSummary(debateId: string) {
    await this.ensureDebateExists(debateId);
    return { summary: await this.getStanceSummaryValue(debateId) };
  }

  async listChildDebates(debateId: string) {
    await this.ensureDebateExists(debateId);

    const childDebates = await this.prisma.debate.findMany({
      where: { parentDebateId: debateId },
      orderBy: { createdAt: 'desc' },
      select: {
        ...debateSummarySelect,
        sourceSelectionTarget: {
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
            selectedText: true,
            startOffset: true,
            endOffset: true,
          },
        },
      },
    });

    return {
      childDebates: childDebates.map(withParticipantCount),
    };
  }

  async findParentDebate(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: {
        parentDebateId: true,
        sourceSelectionTarget: {
          select: {
            id: true,
            sourceType: true,
            sourceId: true,
            selectedText: true,
            startOffset: true,
            endOffset: true,
          },
        },
        parentDebate: {
          select: debateSummarySelect,
        },
      },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }

    return {
      parentDebate: debate.parentDebate
        ? withParticipantCount(debate.parentDebate)
        : null,
      selectedText: debate.sourceSelectionTarget?.selectedText ?? null,
      sourceSelectionTarget: debate.sourceSelectionTarget,
    };
  }

  async join(debateId: string, userId: string) {
    await this.ensureDebateOpen(debateId);

    const participant = await this.prisma.debateParticipant.upsert({
      where: { debateId_userId: { debateId, userId } },
      create: { debateId, userId },
      update: { lastReadAt: new Date() },
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

    return { participant, participantCount };
  }

  async bookmark(debateId: string, userId: string) {
    await this.ensureDebateExists(debateId);
    const bookmark = await this.prisma.debateBookmark.upsert({
      where: { userId_debateId: { userId, debateId } },
      create: { userId, debateId },
      update: {},
      select: { id: true, debateId: true, userId: true, createdAt: true },
    });

    return { bookmark };
  }

  async unbookmark(debateId: string, userId: string) {
    await this.prisma.debateBookmark.deleteMany({
      where: { userId, debateId },
    });
  }

  async subscribe(debateId: string, userId: string) {
    await this.ensureDebateExists(debateId);
    const subscription = await this.prisma.debateSubscription.upsert({
      where: { userId_debateId: { userId, debateId } },
      create: { userId, debateId },
      update: {},
      select: { id: true, debateId: true, userId: true, createdAt: true },
    });

    return { subscription };
  }

  async unsubscribe(debateId: string, userId: string) {
    await this.prisma.debateSubscription.deleteMany({
      where: { userId, debateId },
    });
  }

  async close(
    debateId: string,
    userId: string,
    userRole: string,
    dto: CloseDebateDto,
  ) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true, creatorId: true, status: true, debateType: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    this.ensureCanManageDebate(debate.creatorId, userId, userRole, '종료');
    if (debate.status === 'ARCHIVED') {
      throw new ConflictException(ARCHIVED_WRITE_MESSAGE);
    }
    if (debate.status === 'CLOSED') {
      throw new ConflictException('이미 종료된 토론입니다.');
    }
    if (debate.debateType === 'CONSENSUS') {
      const progress = await this.buildProgress(debateId);
      if (progress.isBlocked) {
        throw new ConflictException(
          '진행 중인 합의 또는 하위 토론이 있어 토론을 종료할 수 없습니다.',
        );
      }
    }

    const stanceDistribution =
      debate.debateType === 'PROS_CONS'
        ? await this.getStanceSummaryValue(debateId)
        : undefined;

    const updated = await this.prisma.debate.update({
      where: { id: debateId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        resultSummary: dto.resultSummary,
        stanceDistribution,
      },
      select: {
        id: true,
        status: true,
        closedAt: true,
        resultSummary: true,
        stanceDistribution: true,
      },
    });

    return { debate: updated, stanceSummary: stanceDistribution ?? null };
  }

  async archive(debateId: string, userId: string, userRole: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true, creatorId: true, status: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    this.ensureCanManageDebate(debate.creatorId, userId, userRole, '아카이브');
    if (debate.status === 'ARCHIVED') {
      throw new ConflictException('이미 아카이브된 토론입니다.');
    }
    if (debate.status !== 'CLOSED') {
      throw new BadRequestException('종료된 토론만 아카이브할 수 있습니다.');
    }

    const updated = await this.prisma.debate.update({
      where: { id: debateId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
      select: { id: true, status: true, archivedAt: true },
    });

    return { debate: updated };
  }

  async createPost(debateId: string, userId: string, dto: CreatePostDto) {
    await this.sanctionsService.assertUserCanWrite(userId);
    const debate = await this.ensureDebateWritable(debateId);
    await this.ensureParticipant(debateId, userId);
    const stance =
      debate.debateType === 'PROS_CONS'
        ? await this.resolveProsConsPostStance(debateId, userId, dto.stance)
        : null;

    const post = await this.prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          debateId,
          authorId: userId,
          content: dto.content,
          stance,
        },
        select: {
          id: true,
          debateId: true,
          authorId: true,
          content: true,
          stance: true,
          status: true,
          createdAt: true,
        },
      });

      const definitionReferences =
        await this.definitionReferencesService.createManyForPost(
          tx,
          debateId,
          created.id,
          created.content,
          userId,
          dto.definitionReferences,
        );

      return { ...created, definitionReferences };
    });

    this.notifyParticipants(debateId, userId, 'NEW_POST_IN_DEBATE', post.id);

    return { post };
  }

  async listPosts(debateId: string, query: ListDebatesDto) {
    await this.ensureDebateExists(debateId);
    const { page, limit, skip } = normalizePagination(query);
    const where: Prisma.PostWhereInput = {
      debateId,
      status: { in: ['VISIBLE', 'DELETED'] },
    };

    const [posts, totalCount] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          debateId: true,
          content: true,
          stance: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, nickname: true, profileImage: true },
          },
          definitionReferences: {
            orderBy: { startOffset: 'asc' },
            select: definitionReferenceSelect,
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return { posts, ...paginationMeta(page, limit, totalCount) };
  }

  async listSelectionTargets(debateId: string) {
    await this.ensureDebateExists(debateId);

    const selectionTargets = await this.prisma.selectionTarget.findMany({
      where: { debateId },
      orderBy: { createdAt: 'desc' },
      select: selectionTargetSelect,
    });

    return { selectionTargets };
  }

  async listConsensuses(debateId: string, userId?: string) {
    await this.ensureDebateExists(debateId);

    const consensuses = await this.prisma.consensus.findMany({
      where: { debateId },
      orderBy: { createdAt: 'desc' },
      select: consensusSelect,
    });

    return {
      consensuses: await Promise.all(
        consensuses.map((c) => withConsensusVoteSummary(this.prisma, c, userId)),
      ),
    };
  }

  async createSelectionTarget(
    debateId: string,
    userId: string,
    dto: CreateSelectionTargetDto,
  ) {
    await this.sanctionsService.assertUserCanWrite(userId);
    await this.ensureDebateWritable(debateId);
    const source = await this.getSelectionSource(dto.sourceType, dto.sourceId);

    if (source.debateId !== debateId) {
      throw new BadRequestException('선택 대상이 요청한 토론에 속하지 않습니다.');
    }

    validateSelection(source.content, dto.selectedText, dto.startOffset, dto.endOffset);

    const existing = await this.prisma.selectionTarget.findFirst({
      where: {
        debateId,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        selectedText: dto.selectedText,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
      },
      select: selectionTargetSelect,
    });

    if (existing) {
      return { selectionTarget: existing };
    }

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
      select: selectionTargetSelect,
    });

    return { selectionTarget };
  }

  async createChildDebate(
    selectionTargetId: string,
    userId: string,
    dto: CreateChildDebateDto,
  ) {
    await this.sanctionsService.assertUserCanCreateDebate(userId);
    const selectionTarget = await this.prisma.selectionTarget.findUnique({
      where: { id: selectionTargetId },
      select: {
        id: true,
        debateId: true,
        sourceType: true,
        sourceId: true,
        selectedText: true,
        startOffset: true,
        endOffset: true,
        debate: {
          select: debateSummarySelect,
        },
      },
    });

    if (!selectionTarget) {
      throw new NotFoundException('선택 영역을 찾을 수 없습니다.');
    }
    await this.ensureDebateWritable(selectionTarget.debateId);

    await this.ensureSelectionSourceBelongsToDebate(
      selectionTarget.debateId,
      selectionTarget.sourceType,
      selectionTarget.sourceId,
    );

    const tags = this.normalizeTags(dto.tags);
    const childDebate = await this.prisma.debate.create({
      data: {
        title: dto.title,
        description: dto.description,
        debateType: dto.debateType ?? 'FREE',
        status: 'OPEN',
        creatorId: userId,
        parentDebateId: selectionTarget.debateId,
        sourceSelectionTargetId: selectionTarget.id,
        participants: {
          create: { userId, roleInDebate: 'CREATOR' },
        },
        tagMaps: {
          create: tags.map((name) => ({
            tag: {
              connectOrCreate: { where: { name }, create: { name } },
            },
          })),
        },
      },
      select: debateSummarySelect,
    });

    return {
      childDebate: withParticipantCount(childDebate),
      selectedText: selectionTarget.selectedText,
      sourceSelectionTarget: {
        id: selectionTarget.id,
        debateId: selectionTarget.debateId,
        sourceType: selectionTarget.sourceType,
        sourceId: selectionTarget.sourceId,
        selectedText: selectionTarget.selectedText,
        startOffset: selectionTarget.startOffset,
        endOffset: selectionTarget.endOffset,
      },
      parentDebate: withParticipantCount(selectionTarget.debate),
    };
  }

  async createConsensus(
    debateId: string,
    userId: string,
    dto: CreateConsensusDto,
  ) {
    await this.sanctionsService.assertUserCanWrite(userId);
    await this.ensureDebateWritable(debateId);
    await this.ensureSelectionTarget(debateId, dto.selectionTargetId);
    await this.ensureNoDuplicateConsensus(
      dto.selectionTargetId,
      dto.title,
      dto.content,
    );

    const consensus = await this.prisma.consensus.create({
      data: {
        debateId,
        creatorId: userId,
        selectionTargetId: dto.selectionTargetId,
        term: dto.term,
        title: dto.title,
        content: dto.content,
      },
      select: consensusSelect,
    });

    this.notifySubscribers(debateId, userId, consensus.id);

    return {
      consensus: await withConsensusVoteSummary(this.prisma, consensus, userId),
    };
  }

  // Private Helpers

  private buildWhere(
    query: ListDebatesDto,
    archivedOnly: boolean,
  ): Prisma.DebateWhereInput {
    const where: Prisma.DebateWhereInput = {};

    if (archivedOnly) {
      where.status = 'ARCHIVED';
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
        some: { tag: { name: query.tag.trim().toLowerCase() } },
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
    this.ensureWritableStatus(debate.status);
  }

  private ensureWritableStatus(status: string) {
    if (status === 'CLOSED') {
      throw new ConflictException(CLOSED_WRITE_MESSAGE);
    }
    if (status === 'ARCHIVED') {
      throw new ConflictException(ARCHIVED_WRITE_MESSAGE);
    }
  }

  private async ensureDebateWritable(debateId: string) {
    const debate = await this.prisma.debate.findUnique({
      where: { id: debateId },
      select: { id: true, status: true, debateType: true },
    });

    if (!debate) {
      throw new NotFoundException('토론을 찾을 수 없습니다.');
    }
    this.ensureWritableStatus(debate.status);

    if (debate.debateType === 'CONSENSUS') {
      const progress = await this.buildProgress(debateId);
      if (progress.isBlocked) {
        throw new ConflictException(CONSENSUS_BLOCK_MESSAGE);
      }
    }

    return debate;
  }

  private async buildProgress(debateId: string) {
    const [blockingConsensus, blockingChildDebate] = await this.prisma.$transaction([
      this.prisma.consensus.findFirst({
        where: { debateId, status: 'OPEN' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          term: true,
          title: true,
          status: true,
          createdAt: true,
          selectionTarget: {
            select: { id: true, selectedText: true },
          },
        },
      }),
      this.prisma.debate.findFirst({
        where: {
          parentDebateId: debateId,
          status: 'OPEN',
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          sourceSelectionTarget: {
            select: { id: true, selectedText: true },
          },
        },
      }),
    ]);

    const hasConsensus = Boolean(blockingConsensus);
    const hasChildDebate = Boolean(blockingChildDebate);
    const blockingType =
      hasConsensus && hasChildDebate
        ? 'BOTH'
        : hasConsensus
          ? 'CONSENSUS'
          : hasChildDebate
            ? 'CHILD_DEBATE'
            : null;

    return {
      isBlocked: Boolean(blockingType),
      blockingType,
      blockingConsensus,
      blockingChildDebate,
    };
  }

  private async getStanceSummaryValue(debateId: string) {
    const [pro, con, neutral, total] = await this.prisma.$transaction([
      this.prisma.debateUserStance.count({ where: { debateId, stance: 'PRO' } }),
      this.prisma.debateUserStance.count({ where: { debateId, stance: 'CON' } }),
      this.prisma.debateUserStance.count({
        where: { debateId, stance: 'NEUTRAL' },
      }),
      this.prisma.debateUserStance.count({ where: { debateId } }),
    ]);

    return { PRO: pro, CON: con, NEUTRAL: neutral, total };
  }

  private async resolveProsConsPostStance(
    debateId: string,
    userId: string,
    requestedStance?: DebateStance,
  ) {
    const currentStance = await this.prisma.debateUserStance.findUnique({
      where: { debateId_userId: { debateId, userId } },
      select: { stance: true },
    });

    const stance = requestedStance ?? currentStance?.stance;
    if (!stance) {
      throw new BadRequestException(PROS_CONS_STANCE_REQUIRED_MESSAGE);
    }

    if (!currentStance || currentStance.stance !== stance) {
      await this.prisma.debateUserStance.upsert({
        where: { debateId_userId: { debateId, userId } },
        create: { debateId, userId, stance },
        update: { stance },
      });
    }

    return stance;
  }

  private ensureCanManageDebate(
    creatorId: string | null,
    userId: string,
    userRole: string,
    action: string,
  ) {
    if (creatorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(`${action} 권한이 없습니다.`);
    }
  }

  private async ensureParticipant(debateId: string, userId: string) {
    await this.prisma.debateParticipant.upsert({
      where: { debateId_userId: { debateId, userId } },
      create: { debateId, userId },
      update: {},
    });
  }

  private async getSelectionSource(
    sourceType: SelectionSource,
    sourceId: string,
  ) {
    if (sourceType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where: { id: sourceId },
        select: { debateId: true, content: true, status: true },
      });
      if (!post) throw new NotFoundException('의견을 찾을 수 없습니다.');
      if (post.status !== 'VISIBLE') throw new BadRequestException('선택할 수 없는 의견입니다.');
      return post;
    }

    const comment = await this.prisma.comment.findUnique({
      where: { id: sourceId },
      select: { debateId: true, content: true, status: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.status !== 'VISIBLE') throw new BadRequestException('선택할 수 없는 댓글입니다.');
    return comment;
  }

  private async ensureSelectionTarget(
    debateId: string,
    selectionTargetId?: string,
  ) {
    if (!selectionTargetId) return;
    const selection = await this.prisma.selectionTarget.findUnique({
      where: { id: selectionTargetId },
      select: { debateId: true },
    });
    if (!selection) throw new NotFoundException('선택 대상을 찾을 수 없습니다.');
    if (selection.debateId !== debateId) {
      throw new BadRequestException('선택 대상이 요청한 토론에 속하지 않습니다.');
    }
  }

  private async ensureSelectionSourceBelongsToDebate(
    debateId: string,
    sourceType: SelectionSource,
    sourceId: string,
  ) {
    const source =
      sourceType === 'POST'
        ? await this.prisma.post.findFirst({
            where: { id: sourceId, debateId },
            select: { id: true },
          })
        : await this.prisma.comment.findFirst({
            where: { id: sourceId, debateId },
            select: { id: true },
          });

    if (!source) {
      throw new BadRequestException(
        '선택 원본이 상위 토론에 속하지 않습니다.',
      );
    }
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

  private normalizeTags(tags?: string[]) {
    return Array.from(
      new Set(
        (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      ),
    );
  }

  private async notifyParticipants(
    debateId: string,
    actorId: string,
    type: 'NEW_POST_IN_DEBATE',
    referenceId: string,
  ) {
    const participants = await this.prisma.debateParticipant.findMany({
      where: { debateId, userId: { not: actorId } },
      select: { userId: true },
    });

    for (const p of participants) {
      void this.notificationsService.createNotification({
        recipientId: p.userId,
        actorId,
        type,
        debateId,
        referenceId,
      });
    }
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
