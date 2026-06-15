import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/auth/optional-jwt-auth.guard';
import { CloseDebateDto } from './dto/close-debate.dto';
import { CreateConsensusDto } from './dto/create-consensus.dto';
import { CreateChildDebateDto } from './dto/create-child-debate.dto';
import { CreateDebateDto } from './dto/create-debate.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateSelectionTargetDto } from './dto/create-selection-target.dto';
import { ListDebatesDto } from './dto/list-debates.dto';
import { UpdateStanceDto } from './dto/update-stance.dto';
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
  findMyDebates(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDebatesDto,
  ) {
    return this.debatesService.findMyDebates(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarks')
  findMyBookmarks(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListDebatesDto,
  ) {
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

  @Get(':debateId/progress')
  getProgress(@Param('debateId') debateId: string) {
    return this.debatesService.getProgress(debateId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':debateId/my-stance')
  getMyStance(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.getMyStance(debateId, user.id);
  }

  @Get(':debateId/stance-summary')
  getStanceSummary(@Param('debateId') debateId: string) {
    return this.debatesService.getStanceSummary(debateId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':debateId/stance')
  updateStance(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStanceDto,
  ) {
    return this.debatesService.updateStance(debateId, user.id, dto);
  }

  @Get(':debateId/child-debates')
  listChildDebates(@Param('debateId') debateId: string) {
    return this.debatesService.listChildDebates(debateId);
  }

  @Get(':debateId/parent')
  findParentDebate(@Param('debateId') debateId: string) {
    return this.debatesService.findParentDebate(debateId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/participants')
  join(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.join(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/bookmark')
  bookmark(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.bookmark(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':debateId/bookmark')
  unbookmark(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.unbookmark(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/subscription')
  subscribe(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.subscribe(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':debateId/subscription')
  unsubscribe(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.unsubscribe(debateId, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':debateId/close')
  close(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CloseDebateDto,
  ) {
    return this.debatesService.close(debateId, user.id, user.role, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':debateId/archive')
  archivePatch(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.archive(debateId, user.id, user.role);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':debateId/archive')
  archive(
    @Param('debateId') debateId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.debatesService.archive(debateId, user.id, user.role);
  }

  @Get(':debateId/posts')
  listPosts(
    @Param('debateId') debateId: string,
    @Query() query: ListDebatesDto,
  ) {
    return this.debatesService.listPosts(debateId, query);
  }

  @Get(':debateId/selection-targets')
  listSelectionTargets(@Param('debateId') debateId: string) {
    return this.debatesService.listSelectionTargets(debateId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':debateId/consensuses')
  listConsensuses(
    @Param('debateId') debateId: string,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return this.debatesService.listConsensuses(debateId, request.user?.id);
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

@Controller()
export class SelectionTargetChildDebatesController {
  constructor(private readonly debatesService: DebatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('selection-targets/:selectionTargetId/child-debates')
  createChildDebate(
    @Param('selectionTargetId') selectionTargetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChildDebateDto,
  ) {
    return this.debatesService.createChildDebate(
      selectionTargetId,
      user.id,
      dto,
    );
  }
}
