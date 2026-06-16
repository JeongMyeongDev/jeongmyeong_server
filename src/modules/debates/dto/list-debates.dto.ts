import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListDebatesDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  tagIds?: string;

  @IsOptional()
  @IsIn(['FREE', 'CONSENSUS', 'PROS_CONS'])
  type?: 'FREE' | 'CONSENSUS' | 'PROS_CONS';

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED', 'ARCHIVED'])
  status?: 'OPEN' | 'CLOSED' | 'ARCHIVED';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsIn(['createdAt', 'archivedAt', 'updatedAt'])
  sort?: 'createdAt' | 'archivedAt' | 'updatedAt' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  direction?: 'asc' | 'desc' = 'desc';
}
