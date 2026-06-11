import { IsIn, IsOptional, IsString } from 'class-validator';
import { IsCommunityText } from '../../../common/validators/community-text.validator';

export class VoteConsensusDto {
  @IsIn(['APPROVE', 'REJECT', 'COMMENT'])
  voteType!: 'APPROVE' | 'REJECT' | 'COMMENT';

  @IsOptional()
  @IsString()
  @IsCommunityText()
  comment?: string;
}
