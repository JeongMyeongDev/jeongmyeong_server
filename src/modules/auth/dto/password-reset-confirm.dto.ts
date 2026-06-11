import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  passwordConfirm!: string;
}
