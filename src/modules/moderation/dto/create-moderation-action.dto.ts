import { ModerationActionType, ModerationTargetType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateModerationActionDto {
  @IsString()
  @IsNotEmpty()
  debateId!: string;

  @IsEnum(ModerationTargetType)
  targetType!: ModerationTargetType;

  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @IsEnum(ModerationActionType)
  actionType!: ModerationActionType;

  @IsOptional()
  @IsString()
  reason?: string;
}
