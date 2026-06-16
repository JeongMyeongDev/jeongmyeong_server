import { ConflictException, Injectable } from '@nestjs/common';
import { SanctionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const WRITE_MESSAGE = '제재로 인해 현재 작성할 수 없습니다.';
const DEBATE_CREATE_MESSAGE = '제재로 인해 현재 토론을 생성할 수 없습니다.';
const SUSPENDED_MESSAGE = '정지된 계정입니다. 제재 내역을 확인해 주세요.';

@Injectable()
export class SanctionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertUserCanWrite(userId: string) {
    await this.assertUserNotSuspended(userId);
    const sanction = await this.findActiveSanction(userId, [
      'WRITE_RESTRICTION',
      'TEMP_SUSPENSION',
      'PERMANENT_SUSPENSION',
    ]);
    if (sanction) throw new ConflictException(WRITE_MESSAGE);
  }

  async assertUserCanCreateDebate(userId: string) {
    await this.assertUserNotSuspended(userId);
    const sanction = await this.findActiveSanction(userId, [
      'DEBATE_CREATE_RESTRICTION',
      'TEMP_SUSPENSION',
      'PERMANENT_SUSPENSION',
    ]);
    if (sanction) throw new ConflictException(DEBATE_CREATE_MESSAGE);
  }

  async assertUserNotSuspended(userId: string) {
    await this.expireElapsedSanctions(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status === 'SUSPENDED') {
      throw new ConflictException(SUSPENDED_MESSAGE);
    }

    const sanction = await this.findActiveSanction(userId, [
      'TEMP_SUSPENSION',
      'PERMANENT_SUSPENSION',
    ]);
    if (sanction) throw new ConflictException(SUSPENDED_MESSAGE);
  }

  private async findActiveSanction(userId: string, types: SanctionType[]) {
    const now = new Date();
    return this.prisma.sanction.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        type: { in: types },
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      select: { id: true },
    });
  }

  private async expireElapsedSanctions(userId: string) {
    await this.prisma.sanction.updateMany({
      where: {
        userId,
        status: 'ACTIVE',
        endsAt: { not: null, lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    const activePermanent = await this.prisma.sanction.findFirst({
      where: { userId, status: 'ACTIVE', type: 'PERMANENT_SUSPENSION' },
      select: { id: true },
    });
    if (!activePermanent) {
      await this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
    }
  }
}
