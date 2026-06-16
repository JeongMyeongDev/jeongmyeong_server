import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import { ConsensusesController } from './consensuses.controller';
import { ConsensusesService } from './consensuses.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, SanctionsModule],
  controllers: [ConsensusesController],
  providers: [ConsensusesService],
})
export class ConsensusesModule {}
