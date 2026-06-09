import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

const getAllowedOrigins = () => {
  const origins = new Set<string>();
  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';
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

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
