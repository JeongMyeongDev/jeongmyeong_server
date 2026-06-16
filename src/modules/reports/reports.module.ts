import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminReportsController, MyModerationController, ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [AuthModule],
  controllers: [ReportsController, MyModerationController, AdminReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
