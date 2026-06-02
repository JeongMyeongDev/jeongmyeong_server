import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { CreateDefinitionDto } from './dto/create-definition.dto';
import { ListDefinitionsDto } from './dto/list-definitions.dto';
import { DefinitionsService } from './definitions.service';

@Controller()
export class DefinitionsController {
  constructor(private readonly definitionsService: DefinitionsService) {}

  @Get('definitions')
  findAll(@Query() query: ListDefinitionsDto) {
    return this.definitionsService.findAll(query);
  }

  @Get('definitions/:definitionId')
  findOne(@Param('definitionId') definitionId: string) {
    return this.definitionsService.findOne(definitionId);
  }

  @Get('debates/:debateId/definitions')
  findByDebate(@Param('debateId') debateId: string) {
    return this.definitionsService.findByDebate(debateId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('definitions')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDefinitionDto) {
    return this.definitionsService.create(user.id, user.role, dto);
  }
}
