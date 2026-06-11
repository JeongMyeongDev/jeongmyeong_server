import { Controller, Get, Param, Query } from '@nestjs/common';
import { DefinitionsService } from './definitions.service';

@Controller()
export class DefinitionsController {
  constructor(private readonly definitionsService: DefinitionsService) {}

  @Get('definitions')
  search(@Query('keyword') keyword?: string) {
    return this.definitionsService.search(keyword);
  }

  @Get('definitions/:definitionId')
  findOne(@Param('definitionId') definitionId: string) {
    return this.definitionsService.findOne(definitionId);
  }

  @Get('debates/:debateId/definitions')
  findByDebate(@Param('debateId') debateId: string) {
    return this.definitionsService.findByDebate(debateId);
  }
}
