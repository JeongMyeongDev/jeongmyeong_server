import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ConsensusesService } from './consensuses.service';
import { CreateSelectionConsensusDto } from './dto/create-selection-consensus.dto';
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

  @UseGuards(JwtAuthGuard)
  @Post('consensuses/:consensusId/votes')
  vote(
    @Param('consensusId') consensusId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: VoteConsensusDto,
  ) {
    return this.consensusesService.vote(consensusId, user.id, dto);
  }
}
