import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DefinitionReferencesService } from '../definition-references/definition-references.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { DefinitionReferenceInputDto } from './dto/definition-reference.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly definitionReferencesService: DefinitionReferencesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':postId')
  updatePost(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(postId, user.id, user.role, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':postId')
  deletePost(@Param('postId') postId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.postsService.deletePost(postId, user.id, user.role);
  }

  @Get(':postId/comments')
  listComments(@Param('postId') postId: string) {
    return this.postsService.listComments(postId);
  }

  @Get(':postId/definition-references')
  listDefinitionReferences(@Param('postId') postId: string) {
    return this.definitionReferencesService.listForPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/definition-references')
  createDefinitionReference(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: DefinitionReferenceInputDto,
  ) {
    return this.definitionReferencesService.createForPost(postId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':postId/comments')
  createComment(
    @Param('postId') postId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, user.id, dto);
  }
}
