import { SupportInquiryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSupportInquiryDto {
  @IsOptional()
  @IsEnum(SupportInquiryStatus, { message: '문의 처리 상태를 다시 선택해 주세요.' })
  status?: SupportInquiryStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '답변은 2000자 이내로 입력해 주세요.' })
  adminReply?: string;
}
