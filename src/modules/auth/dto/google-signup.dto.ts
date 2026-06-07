import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class GoogleSignupDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  @IsNotEmpty({ message: '닉네임은 필수 입력값입니다.' })
  nickname: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력값입니다.' })
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호 확인은 필수 입력값입니다.' })
  @MinLength(6, { message: '비밀번호 확인은 최소 6자 이상이어야 합니다.' })
  passwordConfirm: string;
}
