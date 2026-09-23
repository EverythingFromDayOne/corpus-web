/**
 * BE-2 real DB test — proves the `schema-pending` failure mode against
 * a real Postgres DataSource, NOT a stub. Per Huy's rule on the brief:
 * "A test that mocks `showMigrations()` checks the code, not the database."
 *
 * What it does:
 *   - Connects to the same `corpus-api-db` container the other BE-1+
 *     D70 tests hit (D72 skip-when-no-DB pattern).
 *   - Drops `public.migrations` and re-applies ALL migrations from
 *     `apps/api/src/db/migrations/`, so we have a known state.
 *   - Test 1: reverts the LAST applied migration (via TypeORM's
 *     programmatic `undoLastMigration()`), then asserts the indicator
 *     throws `schema-pending` with the missing name in `pending[]`.
 *   - Test 2: re-applies the migration, then asserts the indicator
 *     returns success with `check: 'schema'` and `applied: N`.
 *
 * This is the integration-level receipt that the operator signal
 * works against the real DB after a deploy that ships a new
 * migration but forgets to run `pnpm migration:run`.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
const { Client } = pg;
type PgClient = InstanceType<typeof Client>;
import { SchemaHealthIndicator } from '../../src/health/schema-health.indicator.js';
import { buildDataSource } from '../../src/db/data-source.js';
import type { DataSource } from 'typeorm';

describe('SchemaHealthIndicator (BE-2 real DB pending migrations)', () => {
  let dbUrl: string;
  let dbAvailable = false;
  let ds: DataSource | undefined;
  let admin: PgClient | undefined;
  // Names captured at `before()` time — `dataSource.migrations` array
  // ordering is NOT guaranteed on this TypeORM 0.3.20 + glob-options
  // build (verified empirically: a debug print showed
  // `[CreateCorpusSession, CreateUsers, ScaffoldHealthcheck]` in one
  // run; ordering varies). So we capture names from the *applied*
  // rows before we revert — those come from the DB itself in
  // timestamp-ascending order.
  let appliedBefore: string[] = [];

  before(async () => {
    dbUrl = process.env['TEST_DATABASE_URL'] ?? 'postgres://corpus:corpus@localhost:5500/corpus';
    admin = new Client({ connectionString: dbUrl });
    try {
      await admin.connect();
      await admin.query(`SELECT 1`);
      dbAvailable = true;
    } catch {
      dbAvailable = false;
      // Note: cannot call `t.skip()` here — `before()` receives a
      // SuiteContext, not a TestContext. Each `it()` block below
      // checks `dbAvailable` and calls `t.skip()` itself.
      return;
    }

    // Build a DataSource wired to the migrations glob. Reuses the
    // production `buildDataSource()` so options match what `dev:api`
    // and `migration:run` use.
    ds = await buildDataSource();
    await ds.initialize();

    // Reset state: wipe `public.migrations` rows + the entity tables
    // each migration creates. Done in dependency order — the last
    // migration creates `corpus_session` and indexes it, so its
    // dependents must be reverted first if we want clean DROP CASCADE.
    await admin.query(`DROP TABLE IF EXISTS "corpus_session" CASCADE`);
    await admin.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await admin.query(`DROP TABLE IF EXISTS "scaffold_healthcheck" CASCADE`);
    await admin.query(`DROP TABLE IF EXISTS "migrations" CASCADE`);

    // Apply ALL three migrations — known-good starting state.
    await ds.runMigrations({ transaction: 'each' });

    const rows = await ds.query<Array<{ name: string }>>(
      `SELECT name FROM migrations ORDER BY timestamp ASC`,
    );
    appliedBefore = rows.map((r) => r.name);
  });

  after(async () => {
    // Best-effort cleanup: drop entity tables so other test files
    // start from the same empty state. We don't drop `migrations`
    // itself — some other suite may still need it. We do not run
    // `undoLastMigration` because Test 2 may have already left the
    // DB in a state where two migrations remain un-applied, depending
    // on which path was taken; clean re-apply + drop is safer.
    try {
      if (admin) {
        await admin.query(`DROP TABLE IF EXISTS "corpus_session" CASCADE`);
        await admin.query(`DROP TABLE IF EXISTS "users" CASCADE`);
        await admin.query(`DROP TABLE IF EXISTS "scaffold_healthcheck" CASCADE`);
        await admin.query(`DROP TABLE IF EXISTS "migrations" CASCADE`);
        await admin.end();
      }
    } catch {
      // ignore — cleanup is best-effort
    }
    try {
      await ds?.destroy();
    } catch {
      // ignore
    }
  });

  it('Test #1: applied all-but-last → 503 schema-pending naming the missing migration', async (t) => {
    if (!dbAvailable || !ds || !admin) {
      t.skip('corpus-api-db unreachable — see before() log');
      return;
    }
    assert.ok(
      appliedBefore.length >= 2,
      `apply-at-least-two-migrations prerequisite; got ${appliedBefore.length}: ${appliedBefore.join(', ')}`,
    );

    // Capture the name of the LATEST migration BEFORE reverting. Doing
    // the revert first makes the lookup circular — `SHOW TABLES FROM
    // migrations ORDER BY timestamp DESC` would work but couples the
    // test to TypeORM's ordering. The most precise assertion for the
    // indicator's contract is: "the reverted migration's name
    // appears in the `pending[]` array".
    const expectedPendingName = appliedBefore[appliedBefore.length - 1] ?? '';

    // Revert the latest applied migration. This drops the entity
    // table it created AND deletes its row from `public.migrations`.
    await ds.undoLastMigration({ transaction: 'each' });

    const appliedAfter = await ds.query<Array<{ name: string }>>(
      `SELECT name FROM migrations ORDER BY timestamp ASC`,
    );

    // Sanity: after the revert exactly ONE row is gone, so the names
    // before/after set-difference is exactly the expected name.
    const appliedAfterSet = new Set(appliedAfter.map((r) => r.name));
    for (const n of appliedBefore) {
      if (n === expectedPendingName) continue;
      assert.ok(appliedAfterSet.has(n), `non-target migration ${n} must remain applied`);
    }
    assert.ok(
      !appliedAfterSet.has(expectedPendingName),
      `target migration ${expectedPendingName} must be reverted`,
    );

    const ind = new SchemaHealthIndicator(ds);
    await assert.rejects(
      () => ind.check('database'),
      (err: unknown) => {
        const dbStatus = (err as {
          causes?: {
            database?: { status?: string; reason?: string; pending?: string[] };
          };
        }).causes?.database;
        assert.equal(dbStatus?.status, 'down', 'status must be `down`');
        assert.equal(
          dbStatus?.reason,
          'schema-pending',
          'reason must be `schema-pending` so operators can grep for it in `/healthz/ready` logs',
        );
        const pending = dbStatus?.pending ?? [];
        assert.ok(
          Array.isArray(pending),
          'pending must be a string[] so Vercel + Fly log scrapers can read the missing name',
        );
        assert.ok(
          pending.includes(expectedPendingName),
          `pending list must include the unapplied migration "${expectedPendingName}" by name (got ${JSON.stringify(pending)})`,
        );
        return true;
      },
    );
  });

  it('Test #2: re-apply last migration → 200 with `check: schema` and `applied: 3`', async (t) => {
    if (!dbAvailable || !ds || !admin) {
      t.skip('corpus-api-db unreachable — see before() log');
      return;
    }
    // Test 1 left the DB at "applied = all but the last migration".
    // Re-run all migrations to bring it back to a known-clean state.
    await ds.runMigrations({ transaction: 'each' });

    const ind = new SchemaHealthIndicator(ds);
    const result = await ind.check('database');
    const dbStatus = result['database'];
    assert.ok(dbStatus, 'database status must be present');
    assert.equal(
      dbStatus.status,
      'up',
      'after re-apply the indicator must return `status: up`, NOT `down`',
    );
    // BE-2: success-path rename — `reason: 'schema'` is replaced by
    // `check: 'schema'` so a `status: up` payload no longer reads as
    // a failure.
    assert.equal(
      (dbStatus as { check?: string }).check,
      'schema',
      'success must use `check: schema` (was `reason: schema` pre-BE-2)',
    );
    assert.equal(
      (dbStatus as { reason?: unknown }).reason,
      undefined,
      'success must NOT carry a `reason` field — that is reserved for failure modes',
    );
    assert.equal(
      (dbStatus as { applied?: number }).applied,
      appliedBefore.length,
      `applied count must equal the number of migrations registered (${appliedBefore.length})`,
    );
  });
});
