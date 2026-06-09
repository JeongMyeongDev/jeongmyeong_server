import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AuthenticatedUser } from './authenticated-user';

type JwtPayload = AuthenticatedUser & {
  sub: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('인증 토큰이 필요합니다.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('활성화된 사용자만 이용할 수 있습니다.');
      }

      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
      };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('유효하지 않은 인증 토큰입니다.');
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
