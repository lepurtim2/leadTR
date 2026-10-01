import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Enable CORS for web client
  app.enableCors({
    origin: [
      process.env.APP_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ],
    credentials: true,
  });

  // Set global prefix with health check exclusion
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/health'],
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  logger.log(`🚀 LeadTR API Server is running on: http://localhost:${port}`);
  logger.log(`   Health check: http://localhost:${port}/health`);
  logger.log(`   Businesses: http://localhost:${port}/api/v1/businesses`);
  logger.log(`   Categories: http://localhost:${port}/api/v1/categories`);
  logger.log(`   Plans: http://localhost:${port}/api/v1/plans`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during API bootstrap:', err);
  process.exit(1);
});
