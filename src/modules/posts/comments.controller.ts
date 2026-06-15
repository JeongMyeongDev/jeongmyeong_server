import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DefinitionReferencesService } from '../definition-references/definition-references.service';
import { DefinitionReferenceInputDto } from './dto/definition-reference.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostsService } from './posts.service';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly definitionReferencesService: DefinitionReferencesService,
  ) {}

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

  @Get(':commentId/definition-references')
  listDefinitionReferences(@Param('commentId') commentId: string) {
    return this.definitionReferencesService.listForComment(commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':commentId/definition-references')
  createDefinitionReference(
    @Param('commentId') commentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DefinitionReferenceInputDto,
  ) {
    return this.definitionReferencesService.createForComment(commentId, user.id, dto);
  }
}
