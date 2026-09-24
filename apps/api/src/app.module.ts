import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env-config.js';
import { buildDataSourceOptions } from './db/data-source.js';
import HealthModule from './health/health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';

/**
 * Root module.
 *
 *   - ConfigModule with our Zod-based `validateEnv` (fail-fast on bad env).
 *   - TypeOrmModule.forRootAsync pointing at the same options factory as the
 *     TypeORM programmatic DataSource, so DSN + entities + migrations are
 *     one source.
 *   - Health module (liveness + readiness).
 *   - AuthModule.register() — registered conditionally on the Google OAuth
 *     env block being present. If Google env is missing the module is
 *     `null` and the API boots in auth-disabled mode.
 *
 * No other module lives here yet — catalog, progress, quiz, srs, notes,
 * analytics, admin each land as their own `src/modules/<name>/*` directory
 * and are wired in their own session. This scaffold's shape constrains
 * everything that comes later, so additions must follow this layout
 * (Controller -> Service -> Repository, no entity leak to controllers).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [
        // Resolve paths relative to repo root regardless of where the API
        // is booted from. The fallback candidates are also tried by the
        // migration CLI; `envFilePath` here is only for Nest bootstrap.
        '../../.env',
        './.env',
      ],
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => buildDataSourceOptions(),
    }),
    HealthModule,
    // `AuthModule.forRoot()` returns `null` when the Google OAuth env
    // block is missing, in which case the module is not registered
    // and the API boots in auth-disabled mode. The conditional is at
    // build time of the imports array, which Nest evaluates once.
    ...(AuthModule.forRoot() ? [AuthModule.forRoot() as import('@nestjs/common').DynamicModule] : []),
  ],
})
export class AppModule {}
