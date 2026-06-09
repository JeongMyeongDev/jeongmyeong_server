import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateModerationActionDto } from './dto/create-moderation-action.dto';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @UseGuards(JwtAuthGuard)
  @Post('actions')
  createAction(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateModerationActionDto) {
    return this.moderationService.createAction(user.id, user.role, dto);
  }
}
