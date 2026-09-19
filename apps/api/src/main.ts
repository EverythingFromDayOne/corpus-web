import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import passport from 'passport';
import { AppModule } from './app.module.js';
import { isAuthEnabled, loadAppEnv } from './config/env-schema.js';
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
 *   - `passport.initialize()` + `passport.session()` are mounted here,
 *     directly on the underlying Express instance, right after the
 *     session middleware. `PassportModule.register({ session: true })`
 *     in `AuthModule` ONLY wires Nest DI providers (the `AuthGuard`
 *     mixin, `PassportSerializer` binding) — it does NOT call
 *     `app.use(passport.initialize()/.session())` on its own. Without
 *     this, `passport.authenticate()` guards (the two Google OAuth
 *     routes) still work because `passport.authenticate()` patches
 *     `req` as a side effect of running — but any route guarded only by
 *     `SessionAuthGuard` (i.e. `GET /me`) never goes through that code
 *     path, so `req.isAuthenticated` is never monkey-patched onto `req`
 *     and stays `undefined` forever, meaning `SessionAuthGuard` 401s
 *     unconditionally regardless of cookie validity. Found + root-caused
 *     by Echo's live click-through of PR #184 (D26 sub-slice A.3).
 *   - CORS is credentialed with the `WEB_ORIGIN` allowlist — the Next.js
 *     site at http://localhost:3000 in dev, https://nxhhuy.tech in prod.
 *   - `ValidationPipe` with `forbidUnknownValues: true` — the rule
 *     `.cursor/rules/50-api-nestjs.mdc` calls out: since `@nestjs/common`
 *     9.3.2 the seeded `false` is overridable to `true`.
 *   - `AuthModule` is registered conditionally. If the Google OAuth env
 *     block is missing, `AuthModule.forRoot()` returns null and the API
 *     boots in "auth-disabled" mode.
 *
 *   --- Phase B PM2 hosting notes ------------------------------------------
 *   - `app.enableShutdownHooks()` MUST be called BEFORE `app.listen()` —
 *     it registers signal listeners and the SIGTERM/SIGINT handling
 *     becomes active only after `listen()` resolves. Reference:
 *     https://docs.nestjs.com/fundamentals/lifecycle-events.
 *   - `process.send?.('ready')` after `app.listen()` resolves pairs with
 *     PM2's `wait_ready: true` so PM2 considers the process `online` only
 *     AFTER NestJS has finished `onApplicationBootstrap` and bound the
 *     socket. Without it, PM2 marks `online` the instant the Node event
 *     loop is alive — which is BEFORE `listen()` has bound the port,
 *     causing the first post-restart request to hit ECONNREFUSED.
 *   - The explicit SIGTERM/SIGINT handler below runs the NestJS shutdown
 *     hooks (via `app.close()`), then `process.exit(0)`. `app.close()`
 *     alone does NOT terminate the process (per NestJS docs — the event
 *     loop keeps the socket alive). Without `process.exit(0)`, PM2
 *     SIGKILLs after `kill_timeout: 10000` (in ecosystem.config.cjs).
 *     Belt-and-braces: `enableShutdownHooks()` is the primary path
 *     NestJS uses internally; the manual handler covers SIGTERM-direct
 *     (in case `PM2_KILL_SIGNAL=SIGTERM` is ever set) AND ensures the
 *     process actually exits instead of hanging.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: false,
  });

  // --- Graceful shutdown wiring (Phase B) ----------------------------------
  // Register BEFORE app.listen() per NestJS docs — `enableShutdownHooks()`
  // sets up SIGTERM/SIGINT signal listeners, and once `listen()` resolves
  // the hooks run in order: `onModuleDestroy()` → `beforeApplicationShutdown()`
  // → `onApplicationShutdown()`. Idempotent across re-entries: `shuttingDown`
  // guard makes the manual handler safe even if PM2 sends SIGINT twice.
  let shuttingDown = false;
  const handleShutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    Logger.log(`Received ${signal}, draining...`, 'Bootstrap');
    try {
      app.close().catch((err: unknown) => {
        Logger.error(
          `app.close() rejected during ${signal} drain: ${String(err)}`,
          'Bootstrap',
        );
      });
    } catch {
      // `app.close()` can throw synchronously if called before bootstrap
      // completes; treat as already-closed and proceed to exit.
    }
    process.exit(0);
  };
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  // NestJS-managed shutdown hooks. Idempotent with the explicit handler
  // above: NestJS's listeners run the same `onModuleDestroy` chain, and
  // BOTH paths call `app.close()` — safe because NestJS guards
  // double-close. The explicit handler's `process.exit(0)` is what
  // actually terminates the process; NestJS's hooks don't exit on their
  // own (per docs: "Calling app.close() doesn't terminate the Node
  // process").
  app.enableShutdownHooks();

  // Validate env a second time inside bootstrap so we can read the values
  // BEFORE assembling middleware. The first validation already happened
  // inside `AppModule`'s `ConfigModule.validate`.
  const env = await loadAppEnv();
  const authEnabled = isAuthEnabled(env);

  // --- Trust proxy (D-7) ---------------------------------------------------
  // The Cloudflare Tunnel terminates TLS at the edge and forwards plain HTTP
  // to this process. Without `trust proxy = 1` Express sees the incoming
  // request as plain HTTP (no `X-Forwarded-Proto` is honoured), and any cookie
  // with `secure: true` is silently dropped because express-session refuses
  // to set `Secure` cookies on non-HTTPS requests. The symptom is a
  // successful Google login that immediately reads as `401` from `/me` —
  // because the session cookie never made it onto the response — and is the
  // most misattributable failure in the whole auth flow.
  //
  // `trust proxy = 1` tells Express to trust the first hop in
  // `X-Forwarded-*` headers, so `req.secure`, `req.protocol`, and the cookie
  // `Secure` acceptance all reflect the original (HTTPS) protocol. This is
  // mounted BEFORE `sessionMiddleware` so the cookie decision sees the
  // trusted values.
  //
  // Note: `req.secure` is still `false` for the Google OAuth callback URL
  // derivation IF a future refactor ever reads it — the callback URL is a
  // literal env value (`GOOGLE_CALLBACK_URL`) and must NOT be derived from
  // request-time properties. See `auth.module.ts` for the literal read.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // --- Session middleware (Postgres-backed) ------------------------------
  // Registered via `app.use(...)` so it runs before any Nest route
  // handler. Passport depends on `req.session.passport.user` being a
  // real slot, and Passport itself is initialized by `AuthModule` via
  // `PassportModule.register({ session: true })`.
  const sessionMiddleware = await buildSessionMiddleware();
  app.use(sessionMiddleware);

  // --- Passport (session-backed) ------------------------------------------
  // Must be mounted AFTER session middleware (reads `req.session`) and
  // BEFORE any route handler. This is what makes `req.isAuthenticated()`
  // and `req.user` exist on every request, not just ones that happen to
  // go through `passport.authenticate()` — see the bootstrap docstring.
  if (authEnabled) {
    app.use(passport.initialize());
    app.use(passport.session());
  }

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

  // PM2 wait_ready handshake. `process.send` is only defined when the
  // process was forked by another Node process (which PM2 does); the
  // optional-chaining means the call is a no-op when running `node
  // dist/main.js` directly (local dev), avoiding a TypeError on the
  // undefined `process.send`. Phase B: see ecosystem.config.cjs and the
  // D61 row in docs/DEBT.md.
  process.send?.('ready');
}

void bootstrap();
