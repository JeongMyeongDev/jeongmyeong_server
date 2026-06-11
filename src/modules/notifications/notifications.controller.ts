import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsDto) {
    return this.notificationsService.findMyNotifications(user.id, query);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
