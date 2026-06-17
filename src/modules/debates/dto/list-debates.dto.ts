import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  DEBATE_STATUSES,
  DEBATE_TYPES,
  SORT_DIRECTIONS,
  SORT_FIELDS,
  type DebateStatusValue,
  type DebateTypeValue,
  type SortDirectionValue,
  type SortFieldValue,
} from '../../../common/constants/domain.constants';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '../../../common/constants/pagination.constants';

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
  @IsIn(DEBATE_TYPES)
  type?: DebateTypeValue;

  @IsOptional()
  @IsIn(DEBATE_STATUSES)
  status?: DebateStatusValue;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sort?: SortFieldValue = 'createdAt';

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  direction?: SortDirectionValue = 'desc';
}
