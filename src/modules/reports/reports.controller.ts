import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  CreateSanctionDto,
  ReportActionDto,
  ReportResolutionDto,
  RevokeSanctionDto,
} from './dto/admin-report.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReportDto) {
    return this.reportsService.create(user.id, dto);
  }
}

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MyModerationController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  findMyReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReportsDto,
  ) {
    return this.reportsService.findMine(user.id, query);
  }

  @Get('sanctions')
  findMySanctions(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.findMySanctions(user.id);
  }

  @Patch('sanctions/:sanctionId/acknowledge')
  acknowledgeSanction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sanctionId') sanctionId: string,
  ) {
    return this.reportsService.acknowledgeSanction(user.id, sanctionId);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('reports')
  findAll(@Query() query: ListReportsDto) {
    return this.reportsService.findAll(query);
  }

  @Get('reports/:id')
  findOne(@Param('id') id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch('reports/:id/review')
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportResolutionDto,
  ) {
    return this.reportsService.review(id, user.id, dto);
  }

  @Patch('reports/:id/reject')
  reject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportResolutionDto,
  ) {
    return this.reportsService.reject(id, user.id, dto);
  }

  @Post('reports/:id/actions')
  applyAction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportActionDto,
  ) {
    return this.reportsService.applyReportAction(id, user.id, dto);
  }

  @Get('users/:userId/sanctions')
  findUserSanctions(@Param('userId') userId: string) {
    return this.reportsService.findUserSanctions(userId);
  }

  @Post('users/:userId/sanctions')
  createSanction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: CreateSanctionDto,
  ) {
    return this.reportsService.createSanction(userId, user.id, dto);
  }

  @Patch('sanctions/:id/revoke')
  revokeSanction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RevokeSanctionDto,
  ) {
    return this.reportsService.revokeSanction(id, user.id, dto);
  }
}
