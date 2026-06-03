import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new Logger('NestApplication'),
  });

  app.setGlobalPrefix('api/v1');

  app.use(helmet());

  app.enableCors({
    origin: process.env.NODE_ENV === 'development' ? '*' : process.env.CORS_ORIGIN,
    credentials: true,
  });

  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Demasiadas solicitudes. Intentá de nuevo en 15 minutos.' },
  });

  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { statusCode: 429, message: 'Demasiadas solicitudes al webhook. Intentá de nuevo en 1 minuto.' },
  });

  app.use('/api/v1/auth', publicLimiter);
  app.use('/api/v1/whatsapp/webhook', webhookLimiter);
  app.use('/api/v1/instagram/webhook', webhookLimiter);
  app.use('/api/v1/billing/webhook', webhookLimiter);

  app.use(new LoggingMiddleware().use);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`API running on port ${port}`, 'Bootstrap');
}
bootstrap();
