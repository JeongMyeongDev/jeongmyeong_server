import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, dto: CreateReportDto) {
    await this.ensureTargetExists(dto.targetType, dto.targetId);

    const report = await this.prisma.report.create({
      data: { reporterId, ...dto },
      select: {
        id: true,
        reporterId: true,
        targetType: true,
        targetId: true,
        reason: true,
        status: true,
        createdAt: true,
      },
    });

    return { success: true, report };
  }

  async findAll(query: ListReportsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.status ? { status: query.status } : {};
    const [reports, totalCount] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { id: true, nickname: true, email: true } } },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { success: true, reports, page, limit, totalCount };
  }

  async updateStatus(id: string, dto: UpdateReportStatusDto) {
    const existing = await this.prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('신고를 찾을 수 없습니다.');

    const report = await this.prisma.report.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(dto.status) ? new Date() : null,
      },
    });

    return { success: true, report };
  }

  private async ensureTargetExists(targetType: CreateReportDto['targetType'], targetId: string) {
    const exists =
      targetType === 'DEBATE'
        ? await this.prisma.debate.findUnique({ where: { id: targetId }, select: { id: true } })
        : targetType === 'POST'
          ? await this.prisma.post.findUnique({ where: { id: targetId }, select: { id: true } })
          : targetType === 'COMMENT'
            ? await this.prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } })
            : await this.prisma.consensus.findUnique({ where: { id: targetId }, select: { id: true } });

    if (!exists) throw new NotFoundException('신고 대상을 찾을 수 없습니다.');
  }
}
