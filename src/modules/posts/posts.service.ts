import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateSelection } from '../../common/utils/selection.util';
import {
  DefinitionReferencesService,
  definitionReferenceSelect,
} from '../definition-references/definition-references.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SanctionsService } from '../sanctions/sanctions.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const CONSENSUS_BLOCK_MESSAGE =
  '진행 중인 합의 또는 하위 토론이 있어 새 의견을 작성할 수 없습니다.';
const CLOSED_WRITE_MESSAGE = '종료된 토론에서는 새 내용을 작성할 수 없습니다.';
const ARCHIVED_WRITE_MESSAGE = '아카이브된 토론은 읽기 전용입니다.';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly definitionReferencesService: DefinitionReferencesService,
    private readonly sanctionsService: SanctionsService,
  ) {}

  async updatePost(
    postId: string,
    userId: string,
    userRole: string,
    dto: UpdatePostDto,
  ) {
    const post = await this.findVisiblePost(postId);
    this.assertOwnership(post.authorId, userId, userRole, '수정');
    this.ensureDebateWritableFromStatus(post.debate.status);
    await this.ensureNoSelectionTarget('POST', postId);
    await this.ensureDefinitionReferencesRemainValid('POST', postId, dto.content);

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { content: dto.content },
      select: { id: true, content: true, updatedAt: true },
    });

    return { post: updated };
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.findVisiblePost(postId);
    this.assertOwnership(post.authorId, userId, userRole, '삭제');
    this.ensureDebateWritableFromStatus(post.debate.status);
    await this.ensureNoSelectionTarget('POST', postId);

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    });

    return { post: updated };
  }

  async listComments(postId: string) {
    await this.ensurePostExists(postId);

    const comments = await this.prisma.comment.findMany({
      where: { postId, status: { in: ['VISIBLE', 'DELETED'] } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        debateId: true,
        postId: true,
        parentCommentId: true,
        authorId: true,
        content: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: { id: true, nickname: true, profileImage: true },
        },
        _count: { select: { replies: true } },
        definitionReferences: {
          orderBy: { startOffset: 'asc' },
          select: definitionReferenceSelect,
        },
      },
    });

    return { comments };
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    await this.sanctionsService.assertUserCanWrite(userId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        debateId: true,
        authorId: true,
        content: true,
        status: true,
        debate: { select: { status: true, debateType: true } },
      },
    });

    if (!post || post.status !== 'VISIBLE') {
      throw new NotFoundException('의견을 찾을 수 없습니다.');
    }
    await this.ensureDebateWritable(post.debateId, post.debate);

    let parentAuthorId: string | null = null;
    if (dto.parentCommentId) {
      parentAuthorId = await this.ensureParentComment(postId, dto.parentCommentId);
    }

    if (dto.selection) {
      validateSelection(
        post.content,
        dto.selection.selectedText,
        dto.selection.startOffset,
        dto.selection.endOffset,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          debateId: post.debateId,
          postId,
          parentCommentId: dto.parentCommentId,
          authorId: userId,
          content: dto.content,
        },
        select: {
          id: true,
          debateId: true,
          postId: true,
          parentCommentId: true,
          authorId: true,
          content: true,
          status: true,
        },
      });

      const definitionReferences =
        await this.definitionReferencesService.createManyForComment(
          tx,
          post.debateId,
          comment.id,
          comment.content,
          userId,
          dto.definitionReferences,
        );

      if (!dto.selection) {
        return {
          comment: { ...comment, definitionReferences },
          selectionTarget: null,
        };
      }

      const selectionTarget = await tx.selectionTarget.create({
        data: {
          debateId: post.debateId,
          creatorId: userId,
          sourceType: 'POST',
          sourceId: postId,
          selectedText: dto.selection.selectedText,
          startOffset: dto.selection.startOffset,
          endOffset: dto.selection.endOffset,
        },
        select: { id: true },
      });

      return { comment: { ...comment, definitionReferences }, selectionTarget };
    });

    const recipientId = parentAuthorId ?? post.authorId;
    const notificationType = parentAuthorId ? 'REPLY_TO_COMMENT' : 'COMMENT_ON_POST';
    void this.notificationsService.createNotification({
      recipientId,
      actorId: userId,
      type: notificationType,
      debateId: post.debateId,
      referenceId: result.comment.id,
    });

    return result;
  }

  async updateComment(
    commentId: string,
    userId: string,
    userRole: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.findVisibleComment(commentId);
    this.assertOwnership(comment.authorId, userId, userRole, '수정');
    this.ensureDebateWritableFromStatus(comment.debate.status);
    await this.ensureNoSelectionTarget('COMMENT', commentId);
    await this.ensureDefinitionReferencesRemainValid(
      'COMMENT',
      commentId,
      dto.content,
    );

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
      select: { id: true, content: true, updatedAt: true },
    });

    return { comment: updated };
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.findVisibleComment(commentId);
    this.assertOwnership(comment.authorId, userId, userRole, '삭제');
    this.ensureDebateWritableFromStatus(comment.debate.status);
    await this.ensureNoSelectionTarget('COMMENT', commentId);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    });

    return { comment: updated };
  }

  // Private Helpers

  /**
   * 권한 검증 헬퍼: 작성자 본인이거나 ADMIN인지 확인합니다.
   */
  private assertOwnership(
    authorId: string,
    userId: string,
    userRole: string,
    action: string,
  ) {
    if (authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(`${action} 권한이 없습니다.`);
    }
  }

  private async findVisiblePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true, debate: { select: { status: true } } },
    });

    if (!post) throw new NotFoundException('의견을 찾을 수 없습니다.');
    if (post.status !== 'VISIBLE') {
      throw new ConflictException('삭제되었거나 숨겨진 의견은 수정할 수 없습니다.');
    }
    return post;
  }

  private async findVisibleComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, status: true, debate: { select: { status: true } } },
    });

    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.status !== 'VISIBLE') {
      throw new ConflictException('삭제되었거나 숨겨진 댓글은 수정할 수 없습니다.');
    }
    return comment;
  }

  private async ensurePostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('의견을 찾을 수 없습니다.');
  }

  private async ensureParentComment(
    postId: string,
    parentCommentId: string,
  ): Promise<string> {
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { postId: true, status: true, authorId: true },
    });
    if (!parent || parent.postId !== postId || parent.status !== 'VISIBLE') {
      throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
    }
    return parent.authorId;
  }

  private async ensureNoSelectionTarget(
    sourceType: 'POST' | 'COMMENT',
    sourceId: string,
  ) {
    const selectionTarget = await this.prisma.selectionTarget.findFirst({
      where: { sourceType, sourceId },
      select: { id: true },
    });
    if (selectionTarget) {
      throw new ConflictException(
        '이 글은 합의안 또는 하위 토론의 근거로 사용되어 수정할 수 없습니다.',
      );
    }
  }

  private ensureDebateWritableFromStatus(status: string) {
    if (status === 'CLOSED') {
      throw new ConflictException(CLOSED_WRITE_MESSAGE);
    }
    if (status === 'ARCHIVED') {
      throw new ConflictException(ARCHIVED_WRITE_MESSAGE);
    }
  }

  private async ensureDebateWritable(
    debateId: string,
    debate: { status: string; debateType: string },
  ) {
    this.ensureDebateWritableFromStatus(debate.status);
    if (debate.debateType !== 'CONSENSUS') return;

    const [openConsensusCount, openChildDebateCount] =
      await this.prisma.$transaction([
        this.prisma.consensus.count({ where: { debateId, status: 'OPEN' } }),
        this.prisma.debate.count({
          where: { parentDebateId: debateId, status: 'OPEN' },
        }),
      ]);

    if (openConsensusCount > 0 || openChildDebateCount > 0) {
      throw new ConflictException(CONSENSUS_BLOCK_MESSAGE);
    }
  }

  private async ensureDefinitionReferencesRemainValid(
    sourceType: 'POST' | 'COMMENT',
    sourceId: string,
    nextContent: string,
  ) {
    const definitionReferences = await this.prisma.definitionReference.findMany({
      where:
        sourceType === 'POST' ? { postId: sourceId } : { commentId: sourceId },
      select: { selectedText: true, startOffset: true, endOffset: true },
    });

    for (const reference of definitionReferences) {
      try {
        validateSelection(
          nextContent,
          reference.selectedText,
          reference.startOffset,
          reference.endOffset,
        );
      } catch {
        throw new ConflictException(
          '정의 참조 위치가 변경되어 수정할 수 없습니다. 연결을 유지한 채 다시 시도해 주세요.',
        );
      }
    }
  }

  private async ensureNoDefinitionReference(
    sourceType: 'POST' | 'COMMENT',
    sourceId: string,
  ) {
    const definitionReference = await this.prisma.definitionReference.findFirst({
      where:
        sourceType === 'POST' ? { postId: sourceId } : { commentId: sourceId },
      select: { id: true },
    });

    if (definitionReference) {
      throw new ConflictException(
        '이 글은 정의 참조가 포함되어 있어 수정할 수 없습니다.',
      );
    }
  }
}
