import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [DebatesController],
  providers: [DebatesService],
})
export class DebatesModule {}
