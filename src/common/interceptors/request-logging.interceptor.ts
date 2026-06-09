import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { catchError, tap, throwError } from 'rxjs';

const SENSITIVE_KEYS = ['authorization', 'cookie', 'password', 'token', 'idtoken'];

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const startedAt = Date.now();
    const meta = {
      method: request.method,
      url: request.originalUrl ?? request.url,
      ip: request.ip,
      headers: this.redact(request.headers),
      body: this.redact(request.body),
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.log({ ...meta, durationMs: Date.now() - startedAt });
      }),
      catchError((error: unknown) => {
        this.logger.error({
          ...meta,
          durationMs: Date.now() - startedAt,
          error: error instanceof Error ? error.name : 'UnknownError',
        });
        return throwError(() => error);
      }),
    );
  }

  private redact(value: unknown): unknown {
    if (!value || typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.map((item) => this.redact(item));

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const normalizedKey = key.toLowerCase();
        if (SENSITIVE_KEYS.some((sensitiveKey) => normalizedKey.includes(sensitiveKey))) {
          return [key, '[REDACTED]'];
        }
        return [key, this.redact(item)];
      }),
    );
  }
}
