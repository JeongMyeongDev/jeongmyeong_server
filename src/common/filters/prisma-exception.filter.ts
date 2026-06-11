import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

/**
 * Prisma P2002 (unique constraint violation)를 자동으로 409 Conflict로 변환합니다.
 * 각 서비스에서 수동으로 try-catch 할 필요가 없습니다.
 */
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly httpFilter = new HttpExceptionFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    if (this.isUniqueConstraintError(exception)) {
      const target = this.getErrorTarget(exception);
      const message = this.buildConflictMessage(target);
      this.httpFilter.catch(new ConflictException(message), host);
      return;
    }

    this.httpFilter.catch(exception, host);
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private getErrorTarget(error: unknown): string[] {
    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    if (Array.isArray(target)) return target.map(String);
    if (typeof target === 'string') return [target];
    return [];
  }

  private buildConflictMessage(target: string[]): string {
    if (target.some((v) => v.includes('email'))) {
      return '이미 사용 중인 이메일입니다.';
    }
    if (target.some((v) => v.includes('nickname'))) {
      return '이미 사용 중인 닉네임입니다.';
    }
    return '이미 존재하는 데이터입니다.';
  }
}
