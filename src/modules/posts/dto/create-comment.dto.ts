import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCommunityText } from '../../../common/validators/community-text.validator';
import { DefinitionReferencesDto } from './definition-reference.dto';

class CommentSelectionDto {
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

export class CreateCommentDto extends DefinitionReferencesDto {
  @IsString()
  @IsNotEmpty()
  @IsCommunityText()
  content!: string;

  @IsOptional()
  @IsString()
  parentCommentId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CommentSelectionDto)
  selection?: CommentSelectionDto;
}
