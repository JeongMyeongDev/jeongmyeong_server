import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';
import {
  CLOSE_CONDITION_TYPES,
  DEBATE_TYPES,
  type CloseConditionTypeValue,
  type DebateTypeValue,
} from '../../../common/constants/domain.constants';

const DEBATE_TEXT_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s]+$/u;
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

  @IsIn(DEBATE_TYPES)
  debateType!: DebateTypeValue;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: '태그를 하나 이상 선택해 주세요.' })
  @ArrayMaxSize(5, { message: '태그는 최대 5개까지 선택할 수 있습니다.' })
  @ArrayUnique({ message: '중복된 태그가 포함되어 있습니다.' })
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsIn(CLOSE_CONDITION_TYPES)
  closeConditionType?: CloseConditionTypeValue;

  @IsOptional()
  @IsDateString()
  closeAt?: string;
}
