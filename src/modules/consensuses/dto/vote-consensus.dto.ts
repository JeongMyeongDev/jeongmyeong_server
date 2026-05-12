import { IsIn, IsOptional, IsString } from 'class-validator';

export class VoteConsensusDto {
  @IsIn(['APPROVE', 'REJECT', 'COMMENT'])
  voteType!: 'APPROVE' | 'REJECT' | 'COMMENT';

  @IsOptional()
  @IsString()
  comment?: string;
}
