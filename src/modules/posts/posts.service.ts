import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async updatePost(postId: string, userId: string, userRole: string, dto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true },
    });

    if (!post) {
      throw new NotFoundException('의견을 찾을 수 없습니다.');
    }
    if (post.status !== 'VISIBLE') {
      throw new ConflictException('삭제된 의견은 수정할 수 없습니다.');
    }
    if (post.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { content: dto.content },
      select: { id: true, content: true, updatedAt: true },
    });

    return { success: true, post: updated };
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true },
    });

    if (!post) {
      throw new NotFoundException('의견을 찾을 수 없습니다.');
    }
    if (post.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    });

    return { success: true, post: updated };
  }

  async listComments(postId: string) {
    await this.ensurePostExists(postId);

    const comments = await this.prisma.comment.findMany({
      where: {
        postId,
        status: 'VISIBLE',
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        debateId: true,
        postId: true,
        parentCommentId: true,
        content: true,
        status: true,
        createdAt: true,
        author: {
          select: { id: true, nickname: true, profileImage: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    return { success: true, comments };
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

    this.validateSelection(post.content, dto.selection);

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

      if (!dto.selection) {
        return { comment, selectionTarget: null };
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

    return { success: true, ...result };
  }

  private async ensurePostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) {
      throw new NotFoundException('의견을 찾을 수 없습니다.');
    }
  }

  private async ensureParentComment(postId: string, parentCommentId: string): Promise<string> {
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentCommentId },
      select: { postId: true, status: true, authorId: true },
    });
    if (!parent || parent.postId !== postId || parent.status !== 'VISIBLE') {
      throw new NotFoundException('부모 댓글을 찾을 수 없습니다.');
    }
    return parent.authorId;
  }

  private validateSelection(
    sourceContent: string,
    selection?: { selectedText: string; startOffset: number; endOffset: number },
  ) {
    if (!selection) {
      return;
    }
    if (selection.startOffset >= selection.endOffset || selection.endOffset > sourceContent.length) {
      throw new BadRequestException('선택 영역 범위가 올바르지 않습니다.');
    }
    if (sourceContent.slice(selection.startOffset, selection.endOffset) !== selection.selectedText) {
      throw new BadRequestException('선택한 문자열이 원문과 일치하지 않습니다.');
    }
  }
}
