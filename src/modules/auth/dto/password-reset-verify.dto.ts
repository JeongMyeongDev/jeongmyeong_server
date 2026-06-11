import { IsNotEmpty, IsString } from 'class-validator';

export class PasswordResetVerifyDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
