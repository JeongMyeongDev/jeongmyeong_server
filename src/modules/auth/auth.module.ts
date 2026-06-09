import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { EmailService } from './email.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '2h') as StringValue,
      },
    })
  ],
  exports: [JwtModule],
  providers: [AuthService, EmailService],
  controllers: [AuthController],
})
export class AuthModule {}
