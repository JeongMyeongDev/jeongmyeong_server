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
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UpdatePostDto } from './dto/update-post.dto';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly definitionReferencesService: DefinitionReferencesService,
  ) {}

  async updatePost(
    postId: string,
    userId: string,
    userRole: string,
    dto: UpdatePostDto,
  ) {
    const post = await this.findVisiblePost(postId);
    this.assertOwnership(post.authorId, userId, userRole, '?섏젙');
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
    this.assertOwnership(post.authorId, userId, userRole, '??젣');
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
      throw new NotFoundException('?섍껄??李얠쓣 ???놁뒿?덈떎.');
    }
    if (post.debate.status === 'CLOSED') {
      throw new ConflictException('종료된 토론에서는 새 내용을 작성할 수 없습니다.');
    }
    if (post.debate.status === 'ARCHIVED') {
      throw new ConflictException('아카이브된 토론은 읽기 전용입니다.');
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
    this.assertOwnership(comment.authorId, userId, userRole, '?섏젙');
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
    this.assertOwnership(comment.authorId, userId, userRole, '??젣');
    this.ensureDebateWritableFromStatus(comment.debate.status);
    await this.ensureNoSelectionTarget('COMMENT', commentId);

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: { id: true, status: true, deletedAt: true },
    });

    return { comment: updated };
  }

  // ??? Private Helpers ??????????????????????????????????????????

  /**
   * 沅뚰븳 寃利??ы띁: ?묒꽦??蹂몄씤?닿굅??ADMIN?몄? ?뺤씤?⑸땲??
   */
  private assertOwnership(
    authorId: string,
    userId: string,
    userRole: string,
    action: string,
  ) {
    if (authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException(`${action} 沅뚰븳???놁뒿?덈떎.`);
    }
  }

  private async findVisiblePost(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, status: true, debate: { select: { status: true } } },
    });

    if (!post) throw new NotFoundException('?섍껄??李얠쓣 ???놁뒿?덈떎.');
    if (post.status !== 'VISIBLE') {
      throw new ConflictException('??젣?섏뿀嫄곕굹 ?④꺼吏??섍껄? ?섏젙?????놁뒿?덈떎.');
    }
    return post;
  }

  private async findVisibleComment(commentId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { authorId: true, status: true, debate: { select: { status: true } } },
    });

    if (!comment) throw new NotFoundException('?볤???李얠쓣 ???놁뒿?덈떎.');
    if (comment.status !== 'VISIBLE') {
      throw new ConflictException('??젣?섏뿀嫄곕굹 ?④꺼吏??볤?? ?섏젙?????놁뒿?덈떎.');
    }
    return comment;
  }

  private async ensurePostExists(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });
    if (!post) throw new NotFoundException('?섍껄??李얠쓣 ???놁뒿?덈떎.');
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
      throw new NotFoundException('遺紐??볤???李얠쓣 ???놁뒿?덈떎.');
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
      throw new ConflictException('종료된 토론에서는 새 내용을 작성할 수 없습니다.');
    }
    if (status === 'ARCHIVED') {
      throw new ConflictException('아카이브된 토론은 읽기 전용입니다.');
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
          '?뺤쓽 李몄“ ?꾩튂媛 蹂寃쎈릺???섏젙?????놁뒿?덈떎. ?곌껐???⑥뼱??洹몃?濡??먭퀬 ?ㅼ떆 ?쒕룄??二쇱꽭??',
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
        '??湲? ?뺤쓽 李몄“媛 ?ы븿?섏뼱 ?덉뼱 ?섏젙?????놁뒿?덈떎.',
      );
    }
  }
}
