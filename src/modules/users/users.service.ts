import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        profileImage: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return { success: true, user };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
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
      select: {
        id: true,
        nickname: true,
        profileImage: true,
      },
    });

    return { success: true, data: user };
  }
}
