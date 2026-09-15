import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { isAuthEnabled, loadEnv } from './config/env-schema.js';
import { buildSessionMiddleware } from './config/session.js';

/**
 * Bootstrap.
 *
 *   - Env validation runs inside `ConfigModule.validate` and throws before
 *     we ever reach `NestFactory.create()`, so the process exits non-zero
 *     on a missing or malformed DATABASE_URL without ever opening a socket.
 *   - Liveness/readiness are mounted on `/healthz/{live,ready}`.
 *   - Session middleware (Postgres-backed via `connect-pg-simple`) is
 *     registered BEFORE Passport — Passport reads `req.session.passport`
 *     on every authenticated request and that needs to exist first.
 *   - CORS is credentialed with the `WEB_ORIGIN` allowlist — the Next.js
 *     site at http://localhost:3000 in dev, https://nxhhuy.tech in prod.
 *   - `ValidationPipe` with `forbidUnknownValues: true` — the rule
 *     `.cursor/rules/50-api-nestjs.mdc` calls out: since `@nestjs/common`
 *     9.3.2 the seeded `false` is overridable to `true`.
 *   - `AuthModule` is registered conditionally. If the Google OAuth env
 *     block is missing, `AuthModule.forRoot()` returns null and the API
 *     boots in "auth-disabled" mode.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  // Validate env a second time inside bootstrap so we can read the values
  // BEFORE assembling middleware. The first validation already happened
  // inside `AppModule`'s `ConfigModule.validate`.
  const env = await loadEnv();
  const authEnabled = isAuthEnabled(env);

  // --- Session middleware (Postgres-backed) ------------------------------
  // Registered via `app.use(...)` so it runs before any Nest route
  // handler. Passport depends on `req.session.passport.user` being a
  // real slot, and Passport itself is initialized by `AuthModule` via
  // `PassportModule.register({ session: true })`.
  const sessionMiddleware = await buildSessionMiddleware();
  app.use(sessionMiddleware);

  // --- CORS ---------------------------------------------------------------
  // `credentials: true` is required for the session cookie to flow
  // across origins. The allowlist is comma-split because prod may need
  // multiple origins (apex + `www.` during a cutover).
  const origins = env.WEB_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // --- Global validation pipe --------------------------------------------
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
    }),
  );

  // --- Swagger ------------------------------------------------------------
  const config = new DocumentBuilder()
    .setTitle('corpus-web API')
    .setDescription('State-only API for corpus-web. Never sits on the read path.')
    .setVersion('0.0.0')
    .addTag('health', 'Liveness and readiness probes')
    .addTag('auth', authEnabled ? 'Google OAuth login + session' : 'Auth disabled — set GOOGLE_* env to enable')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'session-cookie',
        description:
          'Use the corpus.sid cookie value as a bearer token (Swagger UI convenience only — real callers send Cookie header)',
      },
      'session',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(process.env['PORT'] ?? 3001);
  await app.listen(port);

  Logger.log(`api listening on :${port}, swagger at /api`, 'Bootstrap');
  Logger.log(`auth enabled: ${authEnabled}`, 'Bootstrap');
}

void bootstrap();
