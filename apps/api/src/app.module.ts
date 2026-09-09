import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnv } from './config/env-config.js';
import { buildDataSourceOptions } from './db/data-source.js';
import HealthModule from './health/health.controller.js';

/**
 * Root module. Wires:
 *  - ConfigModule with our Zod-based `validateEnv` (fail-fast on bad env).
 *  - TypeOrmModule.forRootAsync pointing at the same options factory as the
 *    TypeORM programmatic DataSource, so DSN + entities + migrations are
 *    one source.
 *  - Health module (liveness + readiness).
 *
 * No other module lives here yet — auth, users, catalog, progress, quiz,
 * srs, notes, analytics, admin each land as their own `src/modules/<name>/*`
 * directory and are wired in their own session. This scaffold's shape
 * constrains everything that comes later, so additions must follow this
 * layout (Controller -> Service -> Repository, no entity leak to controllers).
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
  ],
})
export class AppModule {}
