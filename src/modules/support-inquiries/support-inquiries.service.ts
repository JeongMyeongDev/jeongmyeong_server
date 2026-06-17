import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SupportInquiryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';
import { UpdateSupportInquiryDto } from './dto/update-support-inquiry.dto';

const supportInquiryInclude = {
  user: { select: { id: true, nickname: true, email: true } },
} satisfies Prisma.SupportInquiryInclude;

@Injectable()
export class SupportInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateSupportInquiryDto) {
    const inquiry = await this.prisma.supportInquiry.create({
      data: {
        userId,
        category: dto.category ?? 'ETC',
        title: dto.title,
        content: dto.content,
      },
    });

    return { message: '문의가 접수되었습니다.', inquiry };
  }

  async findMine(userId: string) {
    const inquiries = await this.prisma.supportInquiry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { inquiries };
  }

  async findAll() {
    const inquiries = await this.prisma.supportInquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: supportInquiryInclude,
    });

    return { inquiries };
  }

  async update(id: string, dto: UpdateSupportInquiryDto) {
    const current = await this.prisma.supportInquiry.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('문의를 찾을 수 없습니다.');

    const nextStatus = dto.status ?? current.status;
    const inquiry = await this.prisma.supportInquiry.update({
      where: { id },
      data: {
        status: nextStatus,
        adminReply: dto.adminReply,
        resolvedAt: this.resolveResolvedAt(current.status, nextStatus, current.resolvedAt),
      },
      include: supportInquiryInclude,
    });

    return { inquiry };
  }

  private resolveResolvedAt(
    currentStatus: SupportInquiryStatus,
    nextStatus: SupportInquiryStatus,
    currentResolvedAt: Date | null,
  ) {
    if (nextStatus === 'RESOLVED' && currentStatus !== 'RESOLVED') return new Date();
    if (nextStatus !== 'RESOLVED') return null;
    return currentResolvedAt;
  }
}
