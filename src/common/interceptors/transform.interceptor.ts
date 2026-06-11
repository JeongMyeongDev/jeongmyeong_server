import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';

/**
 * 모든 응답을 `{ success: true, ...data }` 형태로 자동 래핑합니다.
 * 이미 `success` 속성이 포함된 응답은 그대로 통과합니다.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data === null || data === undefined) {
          return { success: true };
        }

        if (typeof data === 'object' && !Array.isArray(data) && 'success' in (data as object)) {
          return data;
        }

        return { success: true, ...data };
      }),
    );
  }
}
