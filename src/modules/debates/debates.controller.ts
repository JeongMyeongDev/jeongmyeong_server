import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { CreateDebateDto } from './dto/create-debate.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateSelectionTargetDto } from './dto/create-selection-target.dto';
import { ListDebatesDto } from './dto/list-debates.dto';
import { DebatesService } from './debates.service';

@Controller('debates')
export class DebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @Get('archive')
  findArchived(@Query() query: ListDebatesDto) {
    return this.debatesService.findAll(query, true);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  findMyDebates(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDebatesDto) {
    return this.debatesService.findMyDebates(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarks')
  findMyBookmarks(@CurrentUser() user: AuthenticatedUser, @Query() query: ListDebatesDto) {
    return this.debatesService.findMyBookmarks(user.id, query);
  }

  @Get()
  findAll(@Query() query: ListDebatesDto) {
    return this.debatesService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDebateDto) {
    return this.debatesService.create(user.id, dto);
  }

  @Get(':debateId')
  findOne(@Param('debateId') debateId: string) {
    return this.debatesService.findOne(debateId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/participants')
  join(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.join(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/bookmark')
  bookmark(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.bookmark(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':debateId/bookmark')
  unbookmark(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.unbookmark(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/subscription')
  subscribe(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.subscribe(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':debateId/subscription')
  unsubscribe(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.unsubscribe(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/archive')
  archive(@Param('debateId') debateId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.debatesService.archive(debateId, user.id, user.role);
  }

  @Get(':debateId/posts')
  listPosts(@Param('debateId') debateId: string, @Query() query: ListDebatesDto) {
    return this.debatesService.listPosts(debateId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/posts')
  createPost(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePostDto,
  ) {
    return this.debatesService.createPost(debateId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/selection-targets')
  createSelectionTarget(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSelectionTargetDto,
  ) {
    return this.debatesService.createSelectionTarget(debateId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/consensuses')
  createConsensus(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConsensusDto,
  ) {
    return this.debatesService.createConsensus(debateId, user.id, dto);
  }
}
