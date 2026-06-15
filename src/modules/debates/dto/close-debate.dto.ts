import { IsOptional, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class CloseDebateDto {
  @IsOptional()
  @IsString()
  @IsCommunityText()
  resultSummary?: string;
}
