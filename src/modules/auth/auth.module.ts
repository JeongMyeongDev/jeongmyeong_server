import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { LOGIN_TOKEN_EXPIRES_IN } from '../../common/constants/security.constants';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ??
          LOGIN_TOKEN_EXPIRES_IN) as StringValue,
      },
    }),
  ],
  exports: [JwtModule],
  providers: [AuthService, EmailService],
  controllers: [AuthController],
})
export class AuthModule {}
