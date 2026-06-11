import { IsNotEmpty, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;
}
