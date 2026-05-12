import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDebateDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(['FREE', 'CONSENSUS', 'PROS_CONS'])
  debateType!: 'FREE' | 'CONSENSUS' | 'PROS_CONS';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['TIME_LIMIT', 'MANUAL'])
  closeConditionType?: 'TIME_LIMIT' | 'MANUAL';

  @IsOptional()
  @IsDateString()
  closeAt?: string;
}
