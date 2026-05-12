import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConsensusesController } from './consensuses.controller';
import { ConsensusesService } from './consensuses.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConsensusesController],
  providers: [ConsensusesService],
})
export class ConsensusesModule {}
