import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(registerDto: RegisterDto) {
    const { email, nickname, password } = registerDto;

    // 1. 중복 확인
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('이미 존재하는 이메일입니다.');
    }

    const newUser = await this.prisma.user.create({
      data: {
        email,
        nickname,
        password: await bcrypt.hash(password, 10),
      },
      select: { id: true, email: true, nickname: true, status: true, createdAt: true },
    });
    return {
      message: '회원가입이 완료되었습니다.',
      user: newUser,
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. 사용자 확인
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        nickname: true,
        password: true,
        status: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    // 2. 비밀번호 검증
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다.');
    }

    // 3. 로그인 성공 반환
    // password는 응답에서 제거
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...safeUser } = user;
    return {
      message: '로그인에 성공하였습니다.',
      user: safeUser,
    };
  }
}