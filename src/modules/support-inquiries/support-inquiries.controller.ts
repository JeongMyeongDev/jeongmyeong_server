import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateSupportInquiryDto } from './dto/create-support-inquiry.dto';
import { UpdateSupportInquiryDto } from './dto/update-support-inquiry.dto';
import { SupportInquiriesService } from './support-inquiries.service';

@UseGuards(JwtAuthGuard)
@Controller('support-inquiries')
export class SupportInquiriesController {
  constructor(private readonly supportInquiriesService: SupportInquiriesService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupportInquiryDto) {
    return this.supportInquiriesService.create(user.id, dto);
  }

  @Get('my')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.supportInquiriesService.findMine(user.id);
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/support-inquiries')
export class AdminSupportInquiriesController {
  constructor(private readonly supportInquiriesService: SupportInquiriesService) {}

  @Get()
  findAll() {
    return this.supportInquiriesService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupportInquiryDto) {
    return this.supportInquiriesService.update(id, dto);
  }
}
