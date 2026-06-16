import { Controller, Get, Query } from '@nestjs/common';
import { ListTagsDto } from './dto/list-tags.dto';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@Query() query: ListTagsDto) {
    return this.tagsService.findAll(query);
  }
}
