import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs';
import { maskDeletedUserDisplay } from '../utils/user-display.util';

/**
 * 모든 응답을 `{ success: true, ...data }` 형태로 자동 래핑합니다.
 * 이미 `success` 속성이 포함된 응답은 그대로 통과합니다.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data: unknown) => {
        const displayData = maskDeletedUserDisplay(data);

        if (displayData === null || displayData === undefined) {
          return { success: true };
        }

        if (
          typeof displayData === 'object' &&
          !Array.isArray(displayData) &&
          'success' in displayData
        ) {
          return displayData;
        }

        return { success: true, ...displayData };
      }),
    );
  }
}
