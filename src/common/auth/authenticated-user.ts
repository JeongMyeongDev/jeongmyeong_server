import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
