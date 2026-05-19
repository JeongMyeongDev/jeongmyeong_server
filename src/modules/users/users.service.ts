import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

const publicProfileSelect = {
  id: true,
  nickname: true,
  profileImage: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const meProfileSelect = {
  id: true,
  nickname: true,
  profileImage: true,
} satisfies Prisma.UserSelect;

type PublicProfile = Prisma.UserGetPayload<{ select: typeof publicProfileSelect }>;
type MeProfile = Prisma.UserGetPayload<{ select: typeof meProfileSelect }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(userId: string): Promise<{ success: true; user: PublicProfile }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicProfileSelect,
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { success: true, user };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<{ success: true; user: MeProfile }> {
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

    return { success: true, user };
  }
}
