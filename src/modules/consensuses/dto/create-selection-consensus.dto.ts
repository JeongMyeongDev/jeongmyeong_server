import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSelectionConsensusDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
