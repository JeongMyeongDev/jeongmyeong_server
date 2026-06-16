import { ModerationActionType, SanctionType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportResolutionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}

export class ReportActionDto {
  @IsEnum(ModerationActionType)
  contentAction!: ModerationActionType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;

  @IsOptional()
  @IsEnum(SanctionType)
  sanctionType?: SanctionType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  sanctionReason?: string;

  @IsOptional()
  @IsDateString()
  sanctionEndsAt?: string;
}

export class CreateSanctionDto {
  @IsOptional()
  @IsString()
  reportId?: string;

  @IsEnum(SanctionType)
  type!: SanctionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

export class RevokeSanctionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  revokeReason?: string;
}
