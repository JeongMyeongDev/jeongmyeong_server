import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DefinitionReferencesModule } from '../definition-references/definition-references.module';
import { SanctionsModule } from '../sanctions/sanctions.module';
import {
  DebatesController,
  SelectionTargetChildDebatesController,
} from './debates.controller';
import { DebatesService } from './debates.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule, DefinitionReferencesModule, SanctionsModule],
  controllers: [DebatesController, SelectionTargetChildDebatesController],
  providers: [DebatesService],
})
export class DebatesModule {}
