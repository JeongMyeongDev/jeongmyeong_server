import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DefinitionReferenceType, Prisma } from '@prisma/client';
import { validateSelection } from '../../common/utils/selection.util';
import { PrismaService } from '../prisma/prisma.service';
import { DefinitionReferenceInputDto } from '../posts/dto/definition-reference.dto';

export const definitionReferenceSelect = {
  id: true,
  debateId: true,
  postId: true,
  commentId: true,
  definitionId: true,
  selectedText: true,
  startOffset: true,
  endOffset: true,
  referenceType: true,
  createdAt: true,
  definition: {
    select: {
      id: true,
      term: true,
      content: true,
      sourceDebateId: true,
      sourceConsensusId: true,
      sourceDebate: { select: { id: true, title: true } },
      sourceConsensus: { select: { id: true, title: true, status: true } },
    },
  },
} satisfies Prisma.DefinitionReferenceSelect;

@Injectable()
export class DefinitionReferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async createForPost(
    postId: string,
    userId: string,
    dto: DefinitionReferenceInputDto,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        debateId: true,
        content: true,
        status: true,
        debate: { select: { status: true } },
      },
    });

    if (!post || post.status !== 'VISIBLE') {
      throw new NotFoundException('글을 찾을 수 없습니다.');
    }
    this.ensureDebateWritable(post.debate.status);

    const reference = await this.prisma.$transaction((tx) =>
      this.createOne(tx, {
        debateId: post.debateId,
        postId,
        content: post.content,
        userId,
        dto,
      }),
    );

    return { definitionReference: reference };
  }

  async createForComment(
    commentId: string,
    userId: string,
    dto: DefinitionReferenceInputDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        debateId: true,
        content: true,
        status: true,
        debate: { select: { status: true } },
      },
    });

    if (!comment || comment.status !== 'VISIBLE') {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }
    this.ensureDebateWritable(comment.debate.status);

    const reference = await this.prisma.$transaction((tx) =>
      this.createOne(tx, {
        debateId: comment.debateId,
        commentId,
        content: comment.content,
        userId,
        dto,
      }),
    );

    return { definitionReference: reference };
  }

  async listForPost(postId: string) {
    await this.ensurePostExists(postId);
    const definitionReferences = await this.prisma.definitionReference.findMany({
      where: { postId },
      orderBy: { startOffset: 'asc' },
      select: definitionReferenceSelect,
    });

    return { definitionReferences };
  }

  async listForComment(commentId: string) {
    await this.ensureCommentExists(commentId);
    const definitionReferences = await this.prisma.definitionReference.findMany({
      where: { commentId },
      orderBy: { startOffset: 'asc' },
      select: definitionReferenceSelect,
    });

    return { definitionReferences };
  }

  async remove(referenceId: string, userId: string, userRole: string) {
    const reference = await this.prisma.definitionReference.findUnique({
      where: { id: referenceId },
      select: {
        id: true,
        creatorId: true,
        debate: { select: { status: true } },
        post: { select: { authorId: true } },
        comment: { select: { authorId: true } },
      },
    });

    if (!reference) {
      throw new NotFoundException('정의 참조를 찾을 수 없습니다.');
    }
    this.ensureDebateWritable(reference.debate.status);

    const targetAuthorId =
      reference.post?.authorId ?? reference.comment?.authorId;
    const canRemove =
      userRole === 'ADMIN' ||
      reference.creatorId === userId ||
      targetAuthorId === userId;

    if (!canRemove) {
      throw new ForbiddenException('정의 참조를 삭제할 권한이 없습니다.');
    }

    const deleted = await this.prisma.definitionReference.delete({
      where: { id: referenceId },
      select: { id: true },
    });

    return { definitionReference: deleted };
  }

  async createManyForPost(
    tx: Prisma.TransactionClient,
    debateId: string,
    postId: string,
    content: string,
    userId: string,
    dtos: DefinitionReferenceInputDto[] = [],
  ) {
    return Promise.all(
      dtos.map((dto) =>
        this.createOne(tx, { debateId, postId, content, userId, dto }),
      ),
    );
  }

  async createManyForComment(
    tx: Prisma.TransactionClient,
    debateId: string,
    commentId: string,
    content: string,
    userId: string,
    dtos: DefinitionReferenceInputDto[] = [],
  ) {
    return Promise.all(
      dtos.map((dto) =>
        this.createOne(tx, { debateId, commentId, content, userId, dto }),
      ),
    );
  }

  private async createOne(
    tx: Prisma.TransactionClient,
    input: {
      debateId: string;
      postId?: string;
      commentId?: string;
      content: string;
      userId: string;
      dto: DefinitionReferenceInputDto;
    },
  ) {
    validateSelection(
      input.content,
      input.dto.selectedText,
      input.dto.startOffset,
      input.dto.endOffset,
    );

    const definition = await tx.definition.findUnique({
      where: { id: input.dto.definitionId },
      select: {
        id: true,
        term: true,
        status: true,
        sourceDebateId: true,
        terms: { select: { normalizedTerm: true, originalTerm: true } },
      },
    });

    if (!definition || definition.status !== 'ACTIVE') {
      throw new NotFoundException('정의를 찾을 수 없습니다.');
    }

    if (
      input.dto.referenceType === DefinitionReferenceType.DEBATE_STANDARD &&
      definition.sourceDebateId !== input.debateId
    ) {
      throw new BadRequestException(
        '현재 토론의 기준 정의만 기준 정의로 연결할 수 있습니다.',
      );
    }

    if (
      input.dto.referenceType === DefinitionReferenceType.DEBATE_STANDARD &&
      !this.definitionMatchesSelectedText(definition, input.dto.selectedText)
    ) {
      throw new BadRequestException(
        '선택한 단어와 같은 기준 정의만 연결할 수 있습니다.',
      );
    }

    return tx.definitionReference.create({
      data: {
        debateId: input.debateId,
        postId: input.postId,
        commentId: input.commentId,
        definitionId: input.dto.definitionId,
        selectedText: input.dto.selectedText,
        startOffset: input.dto.startOffset,
        endOffset: input.dto.endOffset,
        referenceType: input.dto.referenceType,
        creatorId: input.userId,
      },
      select: definitionReferenceSelect,
    });
  }

  private ensureDebateWritable(status: string) {
    if (status === 'CLOSED') {
      throw new ConflictException('종료된 토론에서는 정의를 연결할 수 없습니다.');
    }
    if (status === 'ARCHIVED') {
      throw new ConflictException('아카이브된 토론은 읽기 전용입니다.');
    }
    if (status !== 'OPEN') {
      throw new ConflictException('정의를 연결할 수 없는 토론 상태입니다.');
    }
  }

  private definitionMatchesSelectedText(
    definition: {
      term: string;
      terms: Array<{ normalizedTerm: string; originalTerm: string }>;
    },
    selectedText: string,
  ) {
    const normalizedSelectedText = this.normalizeDefinitionTerm(selectedText);
    if (!normalizedSelectedText) return false;
    if (this.normalizeDefinitionTerm(definition.term) === normalizedSelectedText) {
      return true;
    }
    return definition.terms.some(
      (term) =>
        this.normalizeDefinitionTerm(term.originalTerm) ===
          normalizedSelectedText ||
        this.normalizeDefinitionTerm(term.normalizedTerm) ===
          normalizedSelectedText,
    );
  }

  private normalizeDefinitionTerm(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private async ensurePostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('글을 찾을 수 없습니다.');
  }

  private async ensureCommentExists(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
  }
}
