import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDefinitionDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsIn(['IN_DEBATE', 'GLOBAL_REFERENCE'])
  scope!: 'IN_DEBATE' | 'GLOBAL_REFERENCE';

  @IsString()
  @IsNotEmpty()
  sourceDebateId!: string;

  @IsOptional()
  @IsString()
  sourceConsensusId?: string;

  @IsOptional()
  @IsString()
  selectionTargetId?: string;
}
