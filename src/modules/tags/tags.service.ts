import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListTagsDto } from './dto/list-tags.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListTagsDto) {
    const keyword = query.keyword?.trim() ?? '';
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);

    const tags = await this.prisma.debateTag.findMany({
      where: keyword
        ? { name: { contains: keyword, mode: 'insensitive' } }
        : undefined,
      take: limit,
      orderBy: keyword
        ? [{ name: 'asc' }, { createdAt: 'desc' }]
        : [{ debateMaps: { _count: 'desc' } }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return { tags };
  }
}
