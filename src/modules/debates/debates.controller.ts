import {
  Body,
  Controller,
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
