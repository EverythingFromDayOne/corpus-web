import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * D69 readiness schema check — separate from the `SELECT 1` pingCheck.
 *
 * Why a separate indicator:
 *   - `pingCheck('database')` proves we can talk to Postgres.
 *   - The migrations table check proves the schema is *in place*.
 *   - These are different failure modes: "database is down" vs
 *     "database is up but uninitialized". A migration that failed
 *     halfway leaves the DB reachable but the schema missing —
 *     `pingCheck` would return `up` (lying to the orchestrator) and
 *     the API would crash on every query.
 *
 * The query is the canonical Postgres idiom:
 *   `SELECT to_regclass('public.migrations') IS NOT NULL`
 *     → `true` iff `public.migrations` exists as a table.
 *   `SELECT count(*) FROM migrations`
 *     → number of applied migrations.
 *
 * Returns 503 `database: schema-missing` when the table is absent,
 * 503 `database: schema-empty` when the table exists but has zero
 * rows (no migrations applied yet), 200 `database: schema` when both
 * checks pass.
 *
 * This indicator is wired into `ReadyController.check()` next to the
 * existing `pingCheck`.
 */
@Injectable()
export class SchemaHealthIndicator extends HealthIndicator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {
    super();
  }

  async check(key: string): Promise<HealthIndicatorResult> {
    const [regclassRows, countRows] = await Promise.all([
      this.dataSource.query<Array<{ regclass: unknown }>>(
        `SELECT to_regclass($1) IS NOT NULL AS regclass`,
        ['public.migrations'],
      ),
      this.dataSource.query<Array<{ count: string }>>(
        `SELECT count(*)::text AS count FROM migrations`,
      ).catch(() => [{ count: '0' }]),
    ]);

    const present = regclassRows[0]?.regclass === true || regclassRows[0]?.regclass === 't';
    const appliedCount = Number.parseInt(countRows[0]?.count ?? '0', 10);

    if (!present) {
      throw new HealthCheckError(
        'migrations table missing',
        this.getStatus(key, false, {
          reason: 'schema-missing',
          detail: 'public.migrations does not exist; run pnpm --filter @corpus/api migration:run',
        }),
      );
    }

    if (!Number.isFinite(appliedCount) || appliedCount <= 0) {
      throw new HealthCheckError(
        'migrations table empty',
        this.getStatus(key, false, {
          reason: 'schema-empty',
          detail: 'public.migrations has zero applied rows; run pnpm --filter @corpus/api migration:run',
        }),
      );
    }

    return this.getStatus(key, true, {
      reason: 'schema',
      applied: appliedCount,
    });
  }
}
