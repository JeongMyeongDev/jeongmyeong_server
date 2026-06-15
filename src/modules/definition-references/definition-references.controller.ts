import { Controller, Delete, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DefinitionReferencesService } from './definition-references.service';

@Controller('definition-references')
export class DefinitionReferencesController {
  constructor(
    private readonly definitionReferencesService: DefinitionReferencesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Delete(':definitionReferenceId')
  remove(
    @Param('definitionReferenceId') definitionReferenceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.definitionReferencesService.remove(
      definitionReferenceId,
      user.id,
      user.role,
    );
  }
}
