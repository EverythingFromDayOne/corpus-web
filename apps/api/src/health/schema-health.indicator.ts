import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, type HealthIndicatorResult } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * D69 + BE-2 readiness schema check — separate from the `SELECT 1` pingCheck.
 *
 * Why a separate indicator:
 *   - `pingCheck('database')` proves we can talk to Postgres.
 *   - The migrations table check proves the schema is *in place*.
 *   - `dataSource.showMigrations()` proves no migration is left
 *     unapplied — BE-2 closes the "applied: 2 looks healthy while one
 *     migration is unapplied" gap that took Huy's Mac down silently.
 *   These are different failure modes: "database is down" vs
 *   "database is up but uninitialized" vs "database is up, schema
 *   is in, but a new migration is unapplied". A migration that
 *   failed halfway leaves the DB reachable but the schema missing —
 *   `pingCheck` would return `up` (lying to the orchestrator) and
 *   the API would crash on every query.
 *
 * The queries are canonical Postgres idioms:
 *   `SELECT to_regclass('public.migrations') IS NOT NULL`
 *     → `true` iff `public.migrations` exists as a table.
 *   `SELECT count(*) FROM migrations`
 *     → number of applied migrations.
 *   `dataSource.showMigrations()`
 *     → `true` iff there are unapplied migrations. Backed by
 *       TypeORM's `MigrationExecutor`, which diffs the in-memory
 *       `dataSource.migrations` (the glob-resolved migration class
 *       list) against `public.migrations` rows.
 *
 * Returns:
 *   503 `database: schema-missing`  when the migrations table is absent
 *   503 `database: schema-empty`    when the table exists but has zero rows
 *   503 `database: schema-pending`  when one or more migrations are unapplied —
 *                                    names listed in `pending: string[]` so the
 *                                    orchestrator log tells the operator which
 *                                    migration step is missing
 *   200 `database: schema`          when all checks pass — uses `check: 'schema'`
 *                                    (not `reason: 'schema'`) so a `status: up`
 *                                    payload no longer reads as a failure.
 *
 * BE-2 follow-up rationale: the success field rename
 * (`reason: 'schema'` → `check: 'schema'`) ships in the same PR
 * because both changes target the same payload shape read by
 * humans reading `/healthz/ready` output by eye and by the
 * downstream Vercel/Fly health-check probes.
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

    // BE-2: detect migrations present in code but unapplied in the DB.
    // `dataSource.showMigrations()` calls `MigrationExecutor` which
    // diffs `dataSource.migrations` (in-memory class list) against
    // rows in `public.migrations`. The cast to `unknown` then a narrow
    // shape is needed because the runtime property is intentionally
    // not in the `.d.ts` — TypeORM's migrator builds the list at
    // `DataSource.initialize()` time.
    const hasPending = await this.dataSource.showMigrations();
    if (hasPending) {
      const pendingNames = await this.listPendingMigrationNames();
      throw new HealthCheckError(
        `${pendingNames.length} unapplied migration(s)`,
        this.getStatus(key, false, {
          reason: 'schema-pending',
          pending: pendingNames,
          detail: 'unapplied migrations present; run pnpm --filter @corpus/api migration:run',
        }),
      );
    }

    return this.getStatus(key, true, {
      check: 'schema',
      applied: appliedCount,
    });
  }

  /**
   * Compute the names of migrations that exist in code but are NOT in
   * `public.migrations`. Done in two SQL-friendly steps:
   *   1. Read the in-memory list (`dataSource.migrations`) — populated
   *      by the `migrations` glob option on `buildDataSourceOptions()`.
   *   2. Read the applied names from the DB. Diff step-1 against step-2.
   *
   * The runtime cast mirrors TypeORM's own internal use — `dataSource.migrations`
   * is set at `DataSource` construction and is the same list `runMigrations()`
   * walks.
   */
  private async listPendingMigrationNames(): Promise<string[]> {
    const knownMigrations =
      ((this.dataSource as unknown as { migrations?: ReadonlyArray<{ name: string }> })
        .migrations) ?? [];
    if (knownMigrations.length === 0) return [];

    const known = new Set(
      knownMigrations.map((m) => m.name).filter((n): n is string => typeof n === 'string'),
    );
    const rows = await this.dataSource
      .query<Array<{ name: string }>>(`SELECT name FROM migrations ORDER BY timestamp ASC`)
      .catch(() => [] as Array<{ name: string }>);
    const applied = new Set(
      rows.map((r) => r.name).filter((n): n is string => typeof n === 'string'),
    );

    const pending: string[] = [];
    for (const name of known) {
      if (!applied.has(name)) pending.push(name);
    }
    return pending;
  }
}
