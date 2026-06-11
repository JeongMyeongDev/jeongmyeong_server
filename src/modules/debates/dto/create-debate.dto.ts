import {
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

const DEBATE_TEXT_PATTERN = /^[\p{L}\p{N}\s]+$/u;
const DEBATE_TEXT_MESSAGE = '한글, 영문, 숫자, 공백만 입력할 수 있습니다.';

export class CreateDebateDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  @Matches(DEBATE_TEXT_PATTERN, { message: DEBATE_TEXT_MESSAGE })
  title!: string;

  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  @Matches(DEBATE_TEXT_PATTERN, { message: DEBATE_TEXT_MESSAGE })
  description!: string;

  @IsIn(['FREE', 'CONSENSUS', 'PROS_CONS'])
  debateType!: 'FREE' | 'CONSENSUS' | 'PROS_CONS';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsCommunityText({ each: true })
  @Matches(DEBATE_TEXT_PATTERN, { each: true, message: DEBATE_TEXT_MESSAGE })
  tags?: string[];

  @IsOptional()
  @IsIn(['TIME_LIMIT', 'MANUAL', 'TARGET_REACHED'])
  closeConditionType?: 'TIME_LIMIT' | 'MANUAL' | 'TARGET_REACHED';

  @IsOptional()
  @IsDateString()
  closeAt?: string;
}
