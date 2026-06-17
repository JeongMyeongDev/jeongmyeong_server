import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminSupportInquiriesController,
  SupportInquiriesController,
} from './support-inquiries.controller';
import { SupportInquiriesService } from './support-inquiries.service';

@Module({
  imports: [PrismaModule],
  controllers: [SupportInquiriesController, AdminSupportInquiriesController],
  providers: [SupportInquiriesService],
})
export class SupportInquiriesModule {}
