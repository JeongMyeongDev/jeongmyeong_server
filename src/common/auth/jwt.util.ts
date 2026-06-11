import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { AuthenticatedUser } from './authenticated-user';

export type JwtPayload = AuthenticatedUser & { sub: string };

/**
 * JWT 토큰에서 사용자 정보를 추출하는 공통 로직.
 * JwtAuthGuard와 OptionalJwtAuthGuard에서 공유합니다.
 */
export function extractBearerToken(request: Request): string | undefined {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' ? token : undefined;
}

export async function verifyAndGetUser(
  jwtService: JwtService,
  prisma: PrismaService,
  token: string,
): Promise<AuthenticatedUser | null> {
  const payload = await jwtService.verifyAsync<JwtPayload>(token, {
    secret: process.env.JWT_SECRET,
  });
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  return { id: user.id, email: user.email, role: user.role };
}
