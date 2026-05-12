import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSelectionTargetDto {
  @IsIn(['POST', 'COMMENT'])
  sourceType!: 'POST' | 'COMMENT';

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  selectedText!: string;

  @IsInt()
  @Min(0)
  startOffset!: number;

  @IsInt()
  @Min(0)
  endOffset!: number;
}
