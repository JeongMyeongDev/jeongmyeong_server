import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { DebatesController } from './debates.controller';
import { DebatesService } from './debates.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DebatesController],
  providers: [DebatesService],
})
export class DebatesModule {}
