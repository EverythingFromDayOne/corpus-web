import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SchemaHealthIndicator } from '../../src/health/schema-health.indicator.js';

/**
 * D69 readiness schema check — three cases.
 *
 * We stub the `DataSource` shape `SchemaHealthIndicator` actually
 * touches (`.query`) and assert each branch of the indicator's
 * `check()` method. No real Postgres in the unit test — the
 * `migration:run` on bootstrap is the only place we touch the live
 * DB, and it's idempotent against a properly-initialized schema.
 */

function makeDataSource(responses: {
  regclass?: boolean;
  count?: number;
  countQueryThrows?: boolean;
  showMigrations?: boolean;
  pendingNames?: readonly string[];
}): {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  showMigrations: () => Promise<boolean>;
} {
  return {
    query: async (sql: string) => {
      if (/to_regclass/i.test(sql)) {
        return [{ regclass: responses.regclass ?? true }];
      }
      if (/count\(\*\)/i.test(sql)) {
        if (responses.countQueryThrows) {
          throw new Error('relation "migrations" does not exist');
        }
        return [{ count: String(responses.count ?? 1) }];
      }
      // SELECT name FROM migrations — listPendingMigrationNames helper.
      if (/SELECT name FROM migrations/i.test(sql)) {
        const names = responses.pendingNames ?? [];
        return names.map((name) => ({ name }));
      }
      return [];
    },
    showMigrations: async () => responses.showMigrations ?? false,
  };
}

describe('SchemaHealthIndicator (D69)', () => {
  it('returns OK with `check: schema` and `applied: N` when public.migrations exists with rows', async () => {
    const ds = makeDataSource({ regclass: true, count: 5, showMigrations: false });
    const ind = new SchemaHealthIndicator(ds as never);
    const result = await ind.check('database');
    const dbStatus = result['database'];
    assert.ok(dbStatus, 'database status must be present');
    assert.equal(dbStatus.status, 'up');
    // BE-2: success-payload rename. `reason: 'schema'` on a `status: up`
    // payload read as a failure; the success surface is now keyed by
    // `check: 'schema'`. `reason` is kept for failure modes only
    // (schema-missing, schema-empty, schema-pending).
    assert.equal(
      (dbStatus as { check?: string }).check,
      'schema',
      'success path must use `check: schema`',
    );
    assert.equal(
      (dbStatus as { reason?: unknown }).reason,
      undefined,
      'success path must NOT carry a `reason` field — that is reserved for failure modes',
    );
    assert.equal((dbStatus as { applied?: number }).applied, 5);
  });

  it('returns 503 schema-missing when public.migrations is absent', async () => {
    const ds = makeDataSource({ regclass: false, count: 0 });
    const ind = new SchemaHealthIndicator(ds as never);
    await assert.rejects(
      () => ind.check('database'),
      (err: unknown) => {
        assert.equal((err as { message: string }).message, 'migrations table missing');
        const dbStatus = (err as { causes?: { database?: { status?: string; reason?: string } } }).causes
          ?.database;
        assert.equal(dbStatus?.status, 'down');
        assert.equal(dbStatus?.reason, 'schema-missing');
        return true;
      },
    );
  });

  it('returns 503 schema-empty when table exists but has zero rows', async () => {
    const ds = makeDataSource({ regclass: true, count: 0, showMigrations: false });
    const ind = new SchemaHealthIndicator(ds as never);
    await assert.rejects(
      () => ind.check('database'),
      (err: unknown) => {
        assert.equal((err as { message: string }).message, 'migrations table empty');
        const dbStatus = (err as { causes?: { database?: { status?: string; reason?: string } } }).causes
          ?.database;
        assert.equal(dbStatus?.status, 'down');
        assert.equal(dbStatus?.reason, 'schema-empty');
        return true;
      },
    );
  });

  // BE-2 stub mock test — proves the indicator's branch logic
  // without a real DB. The pending-DB real-DB test lives in
  // `schema-pending-migrations.test.ts` per Huy's rule "tests must
  // hit a real DataSource, not mocks".
  it('returns 503 schema-pending with the pending migration names when showMigrations is true', async () => {
    // `appliedNames` simulates the rows in `public.migrations` after a
    // partial apply. The indicator's `listPendingMigrationNames()`
    // diffs `dataSource.migrations` against the SELECT result, so the
    // stub SELECT returns this list verbatim.
    const appliedNames = ['ScaffoldHealthcheck1700000000000', 'CreateUsers1700000001000'];
    const ds = makeDataSource({
      regclass: true,
      count: 2,
      showMigrations: true,
      pendingNames: appliedNames,
    });
    // stub `migrations` list on the DataSource for the diff helper:
    (ds as unknown as { migrations: ReadonlyArray<{ name: string }> }).migrations = [
      { name: 'ScaffoldHealthcheck1700000000000' },
      { name: 'CreateUsers1700000001000' },
      { name: 'CreateCorpusSession1700000002000' },
    ];
    const ind = new SchemaHealthIndicator(ds as never);
    await assert.rejects(
      () => ind.check('database'),
      (err: unknown) => {
        const dbStatus = (err as {
          causes?: {
            database?: { status?: string; reason?: string; pending?: string[] };
          };
        }).causes?.database;
        assert.equal(dbStatus?.status, 'down');
        assert.equal(dbStatus?.reason, 'schema-pending');
        assert.deepEqual(
          dbStatus?.pending,
          ['CreateCorpusSession1700000002000'],
          'pending list must name the missing migration so the operator knows which step is unapplied',
        );
        return true;
      },
    );
  });

  it('returns 503 schema-empty when count query throws (table missing in count side)', async () => {
    // Postgres-side race: `to_regclass` returns true but `count(*) FROM
    // migrations` fails. This is the unhappy path that the
    // `.catch(() => [{ count: '0' }])` was added for. The indicator
    // should still classify it as schema-empty, not crash.
    const ds = makeDataSource({ regclass: true, countQueryThrows: true });
    const ind = new SchemaHealthIndicator(ds as never);
    await assert.rejects(
      () => ind.check('database'),
      (err: unknown) => {
        const dbStatus = (err as { causes?: { database?: { status?: string; reason?: string } } }).causes
          ?.database;
        assert.equal(dbStatus?.reason, 'schema-empty');
        return true;
      },
    );
  });

  it('tolerates string-typed regclass result (Postgres `t`/`f`)', async () => {
    const ds = makeDataSource({ regclass: true as never, count: 2 });
    // Override to return 't' instead of true
    ds.query = async (sql: string) => {
      if (/to_regclass/i.test(sql)) return [{ regclass: 't' }];
      if (/count/i.test(sql)) return [{ count: '2' }];
      return [];
    };
    const ind = new SchemaHealthIndicator(ds as never);
    const result = await ind.check('database');
    const dbStatus = result['database'];
    assert.ok(dbStatus, 'database status must be present');
    assert.equal(dbStatus.status, 'up');
  });
});
