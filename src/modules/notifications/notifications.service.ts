import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  debateId: string;
  referenceId: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyNotifications(userId: string) {
    const [notifications, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          type: true,
          isRead: true,
          createdAt: true,
          debateId: true,
          referenceId: true,
          debate: { select: { id: true, title: true } },
          actor: { select: { id: true, nickname: true, profileImage: true } },
        },
      }),
      this.prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return { success: true, notifications, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { recipientId: true },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }
    if (notification.recipientId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  }

  async createNotification(input: CreateNotificationInput) {
    if (input.recipientId === input.actorId) {
      return;
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: input.recipientId },
      select: { notificationsEnabled: true },
    });

    if (!recipient?.notificationsEnabled) {
      return;
    }

    await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        debateId: input.debateId,
        referenceId: input.referenceId,
      },
    });
  }
}
