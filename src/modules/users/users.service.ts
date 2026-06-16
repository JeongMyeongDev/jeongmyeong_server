import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

const publicProfileSelect = {
  id: true,
  nickname: true,
  profileImage: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const meProfileSelect = {
  id: true,
  email: true,
  nickname: true,
  profileImage: true,
  role: true,
  status: true,
  hasCompletedOnboarding: true,
  onboardingCompletedAt: true,
  onboardingVersion: true,
} satisfies Prisma.UserSelect;

type PublicProfile = Prisma.UserGetPayload<{ select: typeof publicProfileSelect }>;
type MeProfile = Prisma.UserGetPayload<{ select: typeof meProfileSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(userId: string): Promise<{ user: PublicProfile }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicProfileSelect,
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { user };
  }

  async getMySettings(userId: string): Promise<{ notificationsEnabled: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { notificationsEnabled: user.notificationsEnabled };
  }

  async updateMySettings(
    userId: string,
    dto: UpdateSettingsDto,
  ): Promise<{ notificationsEnabled: boolean }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { notificationsEnabled: dto.notificationsEnabled },
      select: { notificationsEnabled: true },
    });

    return { notificationsEnabled: user.notificationsEnabled };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<{ user: MeProfile }> {
    if (dto.nickname) {
      const duplicate = await this.prisma.user.findFirst({
        where: { nickname: dto.nickname, NOT: { id: userId } },
        select: { id: true },
      });
      if (duplicate) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: meProfileSelect,
    });

    return { user };
  }

  async completeOnboarding(userId: string): Promise<{ user: MeProfile }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        hasCompletedOnboarding: true,
        onboardingCompletedAt: new Date(),
      },
      select: meProfileSelect,
    });

    return { user };
  }

  async deleteMe(userId: string): Promise<{ message: string }> {
    const result = await this.prisma.user.updateMany({
      where: { id: userId, status: { not: 'DELETED' } },
      data: {
        email: this.createDeletedEmail(userId),
        nickname: this.createDeletedNickname(userId),
        profileImage: null,
        notificationsEnabled: false,
        status: 'DELETED',
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }

  private createDeletedEmail(userId: string) {
    return `deleted-${userId}-${Date.now()}@deleted.local`;
  }

  private createDeletedNickname(userId: string) {
    return `deleted_user_${userId.slice(0, 8)}_${Date.now()}`;
  }
}
