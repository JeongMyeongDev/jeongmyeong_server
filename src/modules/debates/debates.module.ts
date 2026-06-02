import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';
import { SelectionTargetsController } from './selection-targets.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DebatesController, SelectionTargetsController],
  providers: [DebatesService],
})
export class DebatesModule {}
