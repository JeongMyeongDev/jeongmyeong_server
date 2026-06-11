import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../../common/auth/authenticated-user';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetVerifyDto } from './dto/password-reset-verify.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  signup(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(200)
  googleLogin(@Body() googleLoginDto: GoogleLoginDto) {
    return this.authService.googleLogin(googleLoginDto);
  }

  @Post('google/signup')
  @HttpCode(200)
  googleSignup(@Body() googleSignupDto: GoogleSignupDto) {
    return this.authService.googleSignup(googleSignupDto);
  }

  @Post('verify-email')
  @HttpCode(200)
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('verification/resend')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('password-reset/request')
  @HttpCode(200)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/verify')
  @HttpCode(200)
  verifyPasswordReset(@Body() dto: PasswordResetVerifyDto) {
    return this.authService.verifyPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(200)
  confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.confirmPasswordReset(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  logout() {
    return this.authService.logout();
  }
}
