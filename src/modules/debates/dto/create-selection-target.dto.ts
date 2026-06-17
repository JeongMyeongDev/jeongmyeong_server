import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { SELECTION_SOURCES, type SelectionSourceValue } from '../../../common/constants/domain.constants';

export class CreateSelectionTargetDto {
  @IsIn(SELECTION_SOURCES)
  sourceType!: SelectionSourceValue;

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
