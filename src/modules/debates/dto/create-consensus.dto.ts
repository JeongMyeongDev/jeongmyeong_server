import { IsNotEmpty, IsString } from 'class-validator';

export class CreateConsensusDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  selectionTargetId!: string;
}
