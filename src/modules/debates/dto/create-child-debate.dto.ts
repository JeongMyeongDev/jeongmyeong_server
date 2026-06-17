import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DEBATE_TYPES, type DebateTypeValue } from '../../../common/constants/domain.constants';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class CreateChildDebateDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  description!: string;

  @IsOptional()
  @IsIn(DEBATE_TYPES)
  debateType?: DebateTypeValue;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: '태그는 최대 5개까지 선택할 수 있습니다.' })
  @ArrayUnique({ message: '중복된 태그가 포함되어 있습니다.' })
  @IsString({ each: true })
  tagIds?: string[];
}
