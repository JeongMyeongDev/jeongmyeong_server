import { Body, Controller, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostsService } from './posts.service';

@Controller('comments')
export class CommentsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':commentId')
  updateComment(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.postsService.updateComment(commentId, user.id, user.role, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':commentId')
  deleteComment(@Param('commentId') commentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.postsService.deleteComment(commentId, user.id, user.role);
  }
}
