import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

const NICKNAME_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s]+$/u;
const NICKNAME_MESSAGE = '닉네임은 한글, 영문, 숫자, 공백만 입력할 수 있습니다.';

export class RegisterDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: '닉네임은 필수 입력값입니다.' })
  @Matches(NICKNAME_PATTERN, { message: NICKNAME_MESSAGE })
  nickname!: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력값입니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인은 필수 입력값입니다.' })
  @MinLength(6, { message: '비밀번호 확인은 최소 6자 이상이어야 합니다.' })
  passwordConfirm!: string;
}
