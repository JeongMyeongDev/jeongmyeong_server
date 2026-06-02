import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateChildDebateDto } from './dto/create-child-debate.dto';
import { DebatesService } from './debates.service';

@Controller('selection-targets')
export class SelectionTargetsController {
  constructor(private readonly debatesService: DebatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':selectionTargetId/child-debates')
  createChildDebate(
    @Param('selectionTargetId') selectionTargetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateChildDebateDto,
  ) {
    return this.debatesService.createChildDebate(selectionTargetId, user.id, dto);
  }
}
