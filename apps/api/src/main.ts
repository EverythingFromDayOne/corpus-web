import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

/**
 * Bootstrap. Two required behaviours:
 *  - env validation runs inside `ConfigModule.validate` and throws before we
 *    ever reach `NestFactory.create()`, so the process exits non-zero on a
 *    missing or malformed DATABASE_URL without ever opening a socket.
 *  - liveness/readiness are mounted on `/healthz/{live,ready}`; the rest of
 *    the API follows the same split-pattern once modules land.
 *
 * On ValidationPipe — there are no request bodies yet (only `GET` health
 * endpoints), so the global `ValidationPipe` is not registered yet. It
 * ships in the next session that adds the first DTO — `class-validator` +
 * `class-transformer` come along at that point, never before.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  const config = new DocumentBuilder()
    .setTitle('corpus-web API')
    .setDescription('State-only API for corpus-web. Never sits on the read path.')
    .setVersion('0.0.0')
    .addTag('health', 'Liveness and readiness probes')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // Mounted under `/api` so the future `packages/api-client` generator
  // points at a stable path. Real operation endpoints land under the
  // same prefix as further modules are added.
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port);

  Logger.log(`api listening on :${port}, swagger at /api`, 'Bootstrap');
}

void bootstrap();
