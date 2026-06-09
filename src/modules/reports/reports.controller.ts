import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { UpdateReportStatusDto } from './dto/update-report-status.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  findAll(@Query() query: ListReportsDto) {
    return this.reportsService.findAll(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateReportStatusDto) {
    return this.reportsService.updateStatus(id, dto);
  }
}
