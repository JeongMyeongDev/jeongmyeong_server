import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { DefinitionReferenceType } from '@prisma/client';

export class DefinitionReferenceInputDto {
  @IsUUID()
  definitionId!: string;

  @IsString()
  @IsNotEmpty()
  selectedText!: string;

  @IsInt()
  @Min(0)
  startOffset!: number;

  @IsInt()
  @Min(0)
  endOffset!: number;

  @IsEnum(DefinitionReferenceType)
  referenceType!: DefinitionReferenceType;
}

export class DefinitionReferencesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DefinitionReferenceInputDto)
  definitionReferences?: DefinitionReferenceInputDto[];
}
