import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ConsensusesService } from './consensuses.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
import { UpdateConsensusStatusDto } from './dto/update-consensus-status.dto';
import { VoteConsensusDto } from './dto/vote-consensus.dto';

@Controller()
export class ConsensusesController {
  constructor(private readonly consensusesService: ConsensusesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('selection-targets/:selectionTargetId/consensuses')
  createFromSelectionTarget(
    @Param('selectionTargetId') selectionTargetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSelectionConsensusDto,
  ) {
    return this.consensusesService.createFromSelectionTarget(selectionTargetId, user.id, dto);
  }

  @Get('consensuses/:consensusId')
  findOne(@Param('consensusId') consensusId: string) {
    return this.consensusesService.findOne(consensusId);
  }

  @Get('consensuses/:consensusId/votes')
  listVotes(@Param('consensusId') consensusId: string) {
    return this.consensusesService.listVotes(consensusId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('consensuses/:consensusId/votes')
  vote(
    @Param('consensusId') consensusId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VoteConsensusDto,
  ) {
    return this.consensusesService.vote(consensusId, user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('consensuses/:consensusId/status')
  updateStatus(
    @Param('consensusId') consensusId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateConsensusStatusDto,
  ) {
    return this.consensusesService.updateStatus(consensusId, user.id, user.role, dto);
  }
}
