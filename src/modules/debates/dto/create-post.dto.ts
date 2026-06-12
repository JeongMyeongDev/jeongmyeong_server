import { IsNotEmpty, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';
import { DefinitionReferencesDto } from '../../posts/dto/definition-reference.dto';

export class CreatePostDto extends DefinitionReferencesDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;
}
