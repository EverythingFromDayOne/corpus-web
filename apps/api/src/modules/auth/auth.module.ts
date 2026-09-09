import { Module, type DynamicModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync } from 'node:fs';
import { z } from 'zod';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { User } from './entities/user.entity.js';
import { GoogleStrategy } from './google.strategy.js';
import { MeController } from './me.controller.js';
import { SessionSerializer } from './session.serializer.js';
import { SessionAuthGuard } from './session.guard.js';
import { defaultEnvCandidates } from '../../config/dotenv.js';

// --- dotenv pre-load ------------------------------------------------------
//
// `AuthModule.forRoot()` runs at the time Nest evaluates the `@Module`
// decorator on `AppModule`, which is during module-import — BEFORE any
// user code in `main.ts` gets to run. By that time `process.env` has
// only shell-level values; the `.env` file has NOT been loaded.
//
// To make `GOOGLE_CLIENT_ID` visible at module-decorator time we use
// Node 21.7+'s native `process.loadEnvFile()` (synchronous) for each
// candidate path the rest of the app uses. This duplicates one line
// of work — `loadDotEnv` will run again later in `main.ts` — but
// `process.loadEnvFile` is idempotent (does not overwrite values
// already in `process.env`, per Node docs).
if (typeof (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile === 'function') {
  for (const candidate of defaultEnvCandidates()) {
    if (existsSync(candidate)) {
      (process as unknown as { loadEnvFile: (p?: string) => void }).loadEnvFile(candidate);
    }
  }
}

/**
 * Inline Google-OAuth env reader. Re-uses the same shape as
 * `config/env-schema.ts` but reads process.env directly because
 * module `imports` is evaluated synchronously by Nest — there is no
 * `await` point we can sit at. The full `loadEnv()` in main.ts has
 * already run by the time this code executes, so a duplicate zod
 * parse here is safe: the values are the same.
 */
const GoogleEnvInline = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
});

/**
 * Auth module — Google OAuth 2.0 login only (D26 first slice).
 *
 * The module is registered **conditionally** via `forRoot()`. If the
 * three Google env vars are missing, `forRoot()` returns `null` and
 * `AppModule` skips adding it. The API still boots in "auth-disabled"
 * mode: `/healthz/*` works, every other auth route returns 404, and
 * no Google client is contacted. This makes local dev without Google
 * creds honest — the routes simply don't exist rather than 500ing.
 */
@Module({})
export class AuthModule {
  /**
   * Synchronous check at module-import time. Reads from `process.env`
   * directly because Nest's `imports` array cannot await.
   */
  static forRoot(): DynamicModule | null {
    const result = GoogleEnvInline.safeParse(process.env);
    if (!result.success) {
      return null;
    }
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = result.data;

    return {
      module: AuthModule,
      imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule.register({ session: true }),
      ],
      controllers: [AuthController, MeController],
      providers: [
        AuthService,
        SessionSerializer,
        SessionAuthGuard,
        // The strategy reads the three Google env vars at construction
        // time. `useFactory` here is the cleanest way to thread them
        // through — we could pass them via DI but the env-validated
        // path through `loadEnv()` is the same shape every other
        // consumer uses, so we keep one source of truth.
        {
          provide: GoogleStrategy,
          useFactory: (authService: AuthService) =>
            new GoogleStrategy(authService, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL),
          inject: [AuthService],
        },
      ],
      exports: [AuthService],
    };
  }
}
