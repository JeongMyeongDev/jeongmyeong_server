import { IsNotEmpty, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class UpdatePostDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;
}
