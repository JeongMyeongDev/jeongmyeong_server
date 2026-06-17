import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { API_PREFIX, DEFAULT_CLIENT_URL, PORT } from './common/constants/domain.constants';

const getAllowedOrigins = () => {
  const origins = new Set<string>();
  const clientUrl = process.env.CLIENT_URL ?? DEFAULT_CLIENT_URL;
  origins.add(clientUrl);

  for (const origin of (process.env.CORS_ORIGINS ?? '').split(',')) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  }

  return origins;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('허용되지 않은 CORS origin입니다.'));
    },
    credentials: true,
  });

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new PrismaExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor(), new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(PORT);
}

bootstrap();
