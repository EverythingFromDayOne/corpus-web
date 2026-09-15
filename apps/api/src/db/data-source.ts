import 'reflect-metadata';
import { DataSource } from 'typeorm';
import type { DataSourceOptions } from 'typeorm';
import { loadEnv, toDatabaseUrl } from '../config/env-schema.js';
import { ScaffoldHealthcheck } from './entities/scaffold-healthcheck.entity.js';
import { User } from '../modules/auth/entities/user.entity.js';

/**
 * One `DataSourceOptions` factory used by both the TypeORM CLI workflow
 * (today: programmatic wrappers in `migrate-run.ts` / `migrate-revert.ts` —
 * see those files for why we are not on the upstream CLI) and
 * `TypeOrmModule.forRootAsync`. Both code paths land on the same shape, so
 * the URL, entities, and migration glob are defined once. See the PR body
 * for the rationale ("one source or two — if two, say why").
 *
 * During dev / CLI, source migrations live alongside sources; in a built
 * process they live under `dist/`. The glob picks the right one based on
 * `NODE_ENV`. Built Nest does not load `.ts`; CLI does not rely on `dist/`.
 *
 * Entities registered here are the source of truth for TypeORM. Modules
 * that need a repository (`AuthModule` for `User`) declare them again via
 * `TypeOrmModule.forFeature([User])` — TypeORM's contract is "global
 * registration in DataSource, per-module re-declaration to get a
 * Repository injected".
 */
async function buildOptions(): Promise<DataSourceOptions> {
  const env = await loadEnv();
  const isDev = process.env['NODE_ENV'] !== 'production';
  const migrationsGlob = isDev ? 'src/db/migrations/*.ts' : 'dist/db/migrations/*.js';

  return {
    type: 'postgres',
    url: toDatabaseUrl(env),
    entities: [ScaffoldHealthcheck, User],
    migrations: [migrationsGlob],
    // synchronize is **forbidden** in every environment per
    // `.cursor/rules/20-never-violate.mdc`. Migrations only.
    synchronize: false,
    migrationsRun: false,
    logging: ['error'],
  };
}

export async function buildDataSourceOptions(): Promise<DataSourceOptions> {
  return await buildOptions();
}

export async function buildDataSource(): Promise<DataSource> {
  return new DataSource(await buildOptions());
}

// CLI / programmatic callers `await buildDataSource()`. Nest's
// `TypeOrmModule.forRootAsync({ useFactory: () => buildDataSourceOptions() })`
// calls `buildDataSourceOptions()` and Nest awaits the returned promise for us.
export { ScaffoldHealthcheck, User };
