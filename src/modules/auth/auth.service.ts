import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { PasswordResetVerifyDto } from './dto/password-reset-verify.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { EmailService } from './email.service';

@Injectable()
export class AuthService {
  private readonly googleOAuthClient = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, nickname, password, passwordConfirm } = registerDto;

    this.assertPasswordsMatch(password, passwordConfirm);
    await this.releaseDeletedUserIdentifiers(email, nickname);
    await this.assertUserNotExists(email, nickname);

    const existingPendingRegistration = await this.prisma.pendingRegistration.findFirst({
      where: { OR: [{ email }, { nickname }] },
      select: { id: true, email: true, nickname: true },
    });

    if (existingPendingRegistration?.email === email) {
      await this.cleanupPendingRegistration(existingPendingRegistration.id);
    } else if (existingPendingRegistration?.nickname === nickname) {
      throw new ConflictException('이미 인증 대기 중인 닉네임입니다.');
    }

    const verificationToken = this.createToken();
    const pendingRegistration = await this.prisma.pendingRegistration.create({
      data: {
        email,
        nickname,
        passwordHash: await bcrypt.hash(password, 10),
        tokenHash: this.hashToken(verificationToken),
        expiresAt: this.getTokenExpiresAt(),
      },
    });

    try {
      await this.emailService.sendVerificationEmail(
        email,
        this.createEmailVerificationUrl(verificationToken),
      );
    } catch (error) {
      await this.cleanupPendingRegistration(pendingRegistration.id);
      throw error;
    }

    return {
      message: '인증 메일을 보냈습니다. 이메일 인증을 완료하면 계정이 생성됩니다.',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const tokenHash = this.hashToken(verifyEmailDto.token);
    const pendingRegistration = await this.prisma.pendingRegistration.findUnique({
      where: { tokenHash },
    });

    if (!pendingRegistration) {
      throw new NotFoundException('유효하지 않은 이메일 인증 링크입니다.');
    }

    if (pendingRegistration.expiresAt < new Date()) {
      await this.cleanupPendingRegistration(pendingRegistration.id);
      throw new GoneException('이메일 인증 링크가 만료되었습니다. 다시 가입을 진행해 주세요.');
    }

    await this.releaseDeletedUserIdentifiers(
      pendingRegistration.email,
      pendingRegistration.nickname,
    );

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: pendingRegistration.email },
          { nickname: pendingRegistration.nickname },
        ],
      },
      select: { email: true, nickname: true },
    });

    if (existingUser?.email === pendingRegistration.email) {
      await this.cleanupPendingRegistration(pendingRegistration.id);
      return {
        message: '이미 이메일 인증이 완료되었습니다.',
        email: pendingRegistration.email,
      };
    }

    if (existingUser?.nickname === pendingRegistration.nickname) {
      await this.cleanupPendingRegistration(pendingRegistration.id);
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    await this.prisma.$transaction([
      this.prisma.user.create({
        data: {
          email: pendingRegistration.email,
          nickname: pendingRegistration.nickname,
          passwordHash: pendingRegistration.passwordHash,
        },
      }),
      this.prisma.pendingRegistration.deleteMany({
        where: { id: pendingRegistration.id },
      }),
    ]);

    return {
      message: '이메일 인증이 완료되어 계정이 생성되었습니다.',
      email: pendingRegistration.email,
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const pendingRegistration = await this.prisma.pendingRegistration.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true },
    });

    if (!pendingRegistration) {
      return {
        message: '인증 대기 중인 계정이 있다면 인증 메일을 다시 보냈습니다.',
      };
    }

    const verificationToken = this.createToken();
    await this.prisma.pendingRegistration.update({
      where: { id: pendingRegistration.id },
      data: {
        tokenHash: this.hashToken(verificationToken),
        expiresAt: this.getTokenExpiresAt(),
      },
    });

    await this.emailService.sendVerificationEmail(
      pendingRegistration.email,
      this.createEmailVerificationUrl(verificationToken),
    );

    return { message: '인증 메일을 다시 보냈습니다.' };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }
    this.assertUserCanLogin(user.status);

    return this.createLoginResponse(user);
  }

  async googleLogin(googleLoginDto: GoogleLoginDto) {
    const payload = await this.verifyGoogleIdToken(googleLoginDto.idToken);
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw new NotFoundException({
        message: '가입되지 않은 Google 계정입니다. 추가 정보를 입력해 회원가입을 완료해 주세요.',
        email: payload.email,
      });
    }
    this.assertUserCanLogin(user.status);

    return this.createLoginResponse(user);
  }

  async googleSignup(googleSignupDto: GoogleSignupDto) {
    const { idToken, nickname, password, passwordConfirm } = googleSignupDto;

    this.assertPasswordsMatch(password, passwordConfirm);

    const payload = await this.verifyGoogleIdToken(idToken);
    await this.releaseDeletedUserIdentifiers(payload.email, nickname);
    await this.assertUserNotExists(payload.email, nickname);

    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        nickname,
        passwordHash: await bcrypt.hash(password, 10),
        profileImage: payload.picture,
      },
    });

    return this.createLoginResponse(user);
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return this.passwordResetRequestedResponse();
    }

    const resetToken = this.createToken();
    const created = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(resetToken),
        expiresAt: this.getTokenExpiresAt(),
      },
      select: { id: true },
    });

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        this.createPasswordResetUrl(resetToken),
      );
    } catch (error) {
      await this.prisma.passwordResetToken.deleteMany({ where: { id: created.id } });
      throw error;
    }

    return this.passwordResetRequestedResponse();
  }

  async verifyPasswordReset(dto: PasswordResetVerifyDto) {
    const resetToken = await this.findUsablePasswordResetToken(dto.token);
    if (!resetToken) {
      throw new BadRequestException('유효하지 않은 비밀번호 재설정 링크입니다.');
    }
    return { valid: true };
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto) {
    this.assertPasswordsMatch(dto.password, dto.passwordConfirm);

    const resetToken = await this.findUsablePasswordResetToken(dto.token);
    if (!resetToken) {
      throw new BadRequestException('유효하지 않은 비밀번호 재설정 링크입니다.');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 10) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: '비밀번호가 재설정되었습니다. 다시 로그인해 주세요.' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImage: true,
        role: true,
        status: true,
        hasCompletedOnboarding: true,
        onboardingCompletedAt: true,
        onboardingVersion: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }
    this.assertUserCanLogin(user.status);

    return { user };
  }

  logout() {
    return { message: '로그아웃되었습니다.' };
  }

  // ─── Private Helpers ──────────────────────────────────────────

  private assertPasswordsMatch(password: string, passwordConfirm: string) {
    if (password !== passwordConfirm) {
      throw new ConflictException('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }
  }

  private async assertUserNotExists(email: string, nickname: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        status: { not: 'DELETED' },
        OR: [{ email }, { nickname }],
      },
      select: { email: true, nickname: true },
    });

    if (existingUser?.email === email) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    if (existingUser?.nickname === nickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }
  }

  private async releaseDeletedUserIdentifiers(email: string, nickname: string) {
    const deletedUsers = await this.prisma.user.findMany({
      where: {
        status: 'DELETED',
        OR: [{ email }, { nickname }],
      },
      select: { id: true },
    });

    await Promise.all(
      deletedUsers.map((user) =>
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            email: this.createDeletedEmail(user.id),
            nickname: this.createDeletedNickname(user.id),
          },
        }),
      ),
    );
  }

  private createDeletedEmail(userId: string) {
    return `deleted-${userId}-${Date.now()}@deleted.local`;
  }

  private createDeletedNickname(userId: string) {
    return `deleted_user_${userId.slice(0, 8)}_${Date.now()}`;
  }

  private assertUserCanLogin(status: UserStatus) {
    if (status === 'SUSPENDED') {
      throw new UnauthorizedException('This account is suspended. Please check your sanction history.');
    }
    if (status === 'DELETED') {
      throw new UnauthorizedException('삭제된 계정입니다.');
    }
  }

  private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload & { email: string }> {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!googleClientId) {
      throw new InternalServerErrorException('GOOGLE_CLIENT_ID가 설정되지 않았습니다.');
    }

    const ticket = await this.googleOAuthClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.sub || !payload.email_verified) {
      throw new UnauthorizedException('유효하지 않은 Google 계정입니다.');
    }

    return payload as TokenPayload & { email: string };
  }

  private async createLoginResponse(user: {
    id: string;
    email: string;
    nickname: string;
    profileImage?: string | null;
    role: 'USER' | 'ADMIN';
    status: UserStatus;
    hasCompletedOnboarding: boolean;
    onboardingCompletedAt?: Date | null;
    onboardingVersion: number;
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImage: user.profileImage,
        role: user.role,
        status: user.status,
        hasCompletedOnboarding: user.hasCompletedOnboarding,
        onboardingCompletedAt: user.onboardingCompletedAt,
        onboardingVersion: user.onboardingVersion,
      },
    };
  }

  private async cleanupPendingRegistration(id: string) {
    await this.prisma.pendingRegistration.deleteMany({ where: { id } });
  }

  private createToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getTokenExpiresAt() {
    return new Date(Date.now() + 1000 * 60 * 30);
  }

  private createEmailVerificationUrl(token: string) {
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    return `${clientUrl}/verify-email?token=${token}`;
  }

  private createPasswordResetUrl(token: string) {
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    return `${clientUrl}/password-reset?token=${token}`;
  }

  private passwordResetRequestedResponse() {
    return {
      message: '가입된 이메일이라면 비밀번호 재설정 메일을 보냈습니다.',
    };
  }

  private async findUsablePasswordResetToken(token: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });

    if (!resetToken || resetToken.usedAt) {
      return null;
    }
    if (resetToken.expiresAt < new Date()) {
      throw new GoneException('비밀번호 재설정 링크가 만료되었습니다.');
    }

    return resetToken;
  }
}
