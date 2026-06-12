import { IsOptional, IsString, IsUrl, Matches } from 'class-validator';

const NICKNAME_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s]+$/u;
const NICKNAME_MESSAGE = '닉네임은 한글, 영문, 숫자, 공백만 입력할 수 있습니다.';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname?: string;

  @IsOptional()
  @IsUrl({}, { message: 'profileImage는 URL 형식이어야 합니다.' })
  profileImage?: string;
}
