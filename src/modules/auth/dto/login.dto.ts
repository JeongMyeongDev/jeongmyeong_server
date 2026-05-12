import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  @IsNotEmpty({ message: '이메일은 필수 입력값입니다.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: '비밀번호는 필수 입력값입니다.' })
  password!: string;
}
