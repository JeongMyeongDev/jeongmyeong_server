import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsUrl({}, { message: 'profileImage는 URL 형식이어야 합니다.' })
  profileImage?: string;
}
