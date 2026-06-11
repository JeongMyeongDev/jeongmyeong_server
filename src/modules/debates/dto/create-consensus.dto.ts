import { IsNotEmpty, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class CreateConsensusDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;

  @IsString()
  @IsNotEmpty()
  selectionTargetId!: string;
}
