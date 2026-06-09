import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSelectionConsensusDto {
  @IsString()
  @IsNotEmpty()
  term!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
