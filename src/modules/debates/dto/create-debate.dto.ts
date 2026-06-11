import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class CreateDebateDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  description!: string;

  @IsIn(['FREE', 'CONSENSUS', 'PROS_CONS'])
  debateType!: 'FREE' | 'CONSENSUS' | 'PROS_CONS';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsCommunityText({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(['TIME_LIMIT', 'MANUAL', 'TARGET_REACHED'])
  closeConditionType?: 'TIME_LIMIT' | 'MANUAL' | 'TARGET_REACHED';

  @IsOptional()
  @IsDateString()
  closeAt?: string;
}
