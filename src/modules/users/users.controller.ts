import { Body, Controller, Delete, Get, HttpCode, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/settings')
  getMySettings(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMySettings(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/settings')
  updateMySettings(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    return this.usersService.updateMySettings(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/onboarding-complete')
  completeOnboarding(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.completeOnboarding(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @HttpCode(200)
  deleteMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteMe(user.id);
  }

  @Get(':userId')
  findPublicProfile(@Param('userId') userId: string) {
    return this.usersService.findPublicProfile(userId);
  }
}
