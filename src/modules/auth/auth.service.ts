import {
  ConflictException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
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

    if (password !== passwordConfirm) {
      throw new ConflictException('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

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

    const verificationToken = this.createEmailVerificationToken();
    const pendingRegistration = await this.prisma.pendingRegistration.create({
      data: {
        email,
        nickname,
        passwordHash: await bcrypt.hash(password, 10),
        tokenHash: this.hashToken(verificationToken),
        expiresAt: this.getEmailVerificationExpiresAt(),
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
      success: true,
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
      throw new GoneException('이메일 인증 링크가 만료되었습니다. 다시 회원가입을 진행해 주세요.');
    }

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
        success: true,
        message: '이미 이메일 인증이 완료되었습니다.',
        email: pendingRegistration.email,
      };
    }

    if (existingUser?.nickname === pendingRegistration.nickname) {
      await this.cleanupPendingRegistration(pendingRegistration.id);
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    try {
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
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        const userCreatedByConcurrentRequest = await this.prisma.user.findUnique({
          where: { email: pendingRegistration.email },
          select: { email: true },
        });

        if (userCreatedByConcurrentRequest?.email === pendingRegistration.email) {
          await this.cleanupPendingRegistration(pendingRegistration.id);
          return {
            success: true,
            message: '이미 이메일 인증이 완료되었습니다.',
            email: pendingRegistration.email,
          };
        }

        await this.cleanupPendingRegistration(pendingRegistration.id);
        this.throwUniqueConflict(error);
      }

      await this.cleanupPendingRegistration(pendingRegistration.id);
      throw error;
    }

    return {
      success: true,
      message: '이메일 인증이 완료되어 계정이 생성되었습니다.',
      email: pendingRegistration.email,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

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

    return this.createLoginResponse(user);
  }

  async googleSignup(googleSignupDto: GoogleSignupDto) {
    const { idToken, nickname, password, passwordConfirm } = googleSignupDto;

    if (password !== passwordConfirm) {
      throw new ConflictException('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
    }

    const payload = await this.verifyGoogleIdToken(idToken);
    await this.assertUserNotExists(payload.email, nickname);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: payload.email,
          nickname,
          passwordHash: await bcrypt.hash(password, 10),
          profileImage: payload.picture,
        },
      });

      return this.createLoginResponse(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        this.throwUniqueConflict(error);
      }
      throw error;
    }
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
      },
    });

    if (!user) {
      throw new NotFoundException('사용자 정보를 찾을 수 없습니다.');
    }

    return { success: true, user };
  }

  logout() {
    return { success: true, message: '로그아웃되었습니다.' };
  }

  private async assertUserNotExists(email: string, nickname: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
      select: { email: true, nickname: true },
    });

    if (existingUser?.email === email) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    if (existingUser?.nickname === nickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
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
    role: 'USER' | 'ADMIN';
  }) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  private async cleanupPendingRegistration(id: string) {
    await this.prisma.pendingRegistration.deleteMany({ where: { id } });
  }

  private isUniqueConstraintError(error: unknown) {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private throwUniqueConflict(error: unknown): never {
    const target = this.getPrismaErrorTarget(error);
    if (target.some((value) => value.includes('email'))) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    if (target.some((value) => value.includes('nickname'))) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    throw new ConflictException('이미 존재하는 사용자 정보가 있습니다.');
  }

  private getPrismaErrorTarget(error: unknown) {
    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    if (Array.isArray(target)) return target.map(String);
    if (typeof target === 'string') return [target];
    return [];
  }

  private createEmailVerificationToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private getEmailVerificationExpiresAt() {
    return new Date(Date.now() + 1000 * 60 * 30);
  }

  private createEmailVerificationUrl(token: string) {
    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
    return `${clientUrl}/verify-email?token=${token}`;
  }
}
