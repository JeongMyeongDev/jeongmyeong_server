import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { DEBATE_STANCES, type DebateStanceValue } from '../../../common/constants/domain.constants';
import { IsCommunityText } from '../../../common/validators/community-text.validator';
import { DefinitionReferencesDto } from '../../posts/dto/definition-reference.dto';

export class CreatePostDto extends DefinitionReferencesDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;

  @IsOptional()
  @IsIn(DEBATE_STANCES)
  stance?: DebateStanceValue;
}
