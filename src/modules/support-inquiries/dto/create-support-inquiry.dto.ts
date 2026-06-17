import { SupportInquiryCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportInquiryDto {
  @IsOptional()
  @IsEnum(SupportInquiryCategory, { message: '문의 유형을 다시 선택해 주세요.' })
  category?: SupportInquiryCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '문의 제목을 입력해 주세요.' })
  @MaxLength(100, { message: '문의 제목은 100자 이내로 입력해 주세요.' })
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: '문의 내용을 입력해 주세요.' })
  @MaxLength(2000, { message: '문의 내용은 2000자 이내로 입력해 주세요.' })
  content!: string;
}
