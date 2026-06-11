import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

const SAFE_ERROR_NAMES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.GONE]: 'Gone',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.getSafeMessage(exception, statusCode);

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: SAFE_ERROR_NAMES[statusCode] ?? 'Internal Server Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getSafeMessage(exception: unknown, statusCode: number) {
    if (!(exception instanceof HttpException)) {
      return '서버 오류가 발생했습니다.';
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message?: unknown }).message;
      if (Array.isArray(message)) return message.map(String);
      if (typeof message === 'string') return message;
    }

    return statusCode >= 500 ? '서버 오류가 발생했습니다.' : '요청을 처리할 수 없습니다.';
  }
}
