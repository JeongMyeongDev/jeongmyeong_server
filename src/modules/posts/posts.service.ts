import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { validateSelection } from '../../common/utils/selection.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async updatePost(
    postId: string,
    userId: string,
    userRole: string,
    dto: UpdatePostDto,
  ) {
    const post = await this.findVisiblePost(postId);
    this.assertOwnership(post.authorId, userId, userRole, '수정');
    await this.ensureNoSelectionTarget('POST', postId);

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
      },
    });

    return { comments };
  }

  async createComment(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        debateId: true,
        authorId: true,
        content: true,
        status: true,
        debate: { select: { status: true } },
      },
    });

    if (!post || post.status !== 'VISIBLE') {
      throw new NotFoundException('의견을 찾을 수 없습니다.');
    }
    if (post.debate.status !== 'OPEN') {
      throw new ConflictException('종료된 토론에는 댓글을 작성할 수 없습니다.');
    }

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

      if (!dto.selection) return { comment, selectionTarget: null };

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

      return { comment, selectionTarget };
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
    await this.ensureNoSelectionTarget('COMMENT', commentId);

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
    await this.ensureNoSelectionTarget('COMMENT', commentId);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    });

    return { comment: updated };
  }

  // ─── Private Helpers ──────────────────────────────────────────

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
      select: { authorId: true, status: true },
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
      select: { authorId: true, status: true },
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
        '선택/합의에 연결된 글은 수정하거나 삭제할 수 없습니다.',
      );
    }
  }
}
