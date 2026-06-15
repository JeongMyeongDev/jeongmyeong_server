import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DefinitionReferencesController } from './definition-references.controller';
import { DefinitionReferencesService } from './definition-references.service';

@Module({
  imports: [PrismaModule],
  controllers: [DefinitionReferencesController],
  providers: [DefinitionReferencesService],
  exports: [DefinitionReferencesService],
})
export class DefinitionReferencesModule {}
