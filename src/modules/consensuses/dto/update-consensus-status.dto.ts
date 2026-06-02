import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateConsensusStatusDto {
  @IsIn(['APPROVED', 'REJECTED', 'CLOSED'])
  status!: 'APPROVED' | 'REJECTED' | 'CLOSED';

  @IsOptional()
  @IsString()
  resultSummary?: string;

  @IsOptional()
  @IsBoolean()
  saveAsGlobalDefinition?: boolean;
}
