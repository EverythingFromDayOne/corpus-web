import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CreateCorpusSession1700000002000 } from '../../src/db/migrations/1700000002000-CreateCorpusSession.js';

/**
 * D70 — `CreateCorpusSession` migration idempotency guard.
 *
 * The migration's `up()` uses `CREATE TABLE IF NOT EXISTS`,
 * `ALTER TABLE ... ADD CONSTRAINT ... PRIMARY KEY`, and
 * `CREATE INDEX IF NOT EXISTS`. Against a fresh DB all three run;
 * against a DB that already has the table from
 * `connect-pg-simple`'s `createTableIfMissing: true`, they are
 * no-ops.
 *
 * We stub `QueryRunner.query` to track the SQL the migration issues.
 * Two invariants:
 *   1. The expected DDL strings are issued (canonical source).
 *   2. Re-running the migration against the same stub re-issues the
 *      same SQL — i.e., the migration is not stateful and does not
 *      mutate its own internal counters.
 *
 * A live-DB idempotency test (run migration twice, verify single
 * `migrations` table entry) requires a real Postgres instance and
 * is out of scope for the unit-test suite. The VPS apply is the
 * final idempotency check: `pnpm --filter @corpus/api migration:run`
 * is called twice during the deploy dance, and the second call is
 * expected to log `no migrations pending`.
 */

function makeQueryRunner(): {
  qr: import('typeorm').QueryRunner;
  sql: string[];
} {
  const sql: string[] = [];
  const qr = {
    query: async (q: string) => {
      sql.push(q);
    },
  } as unknown as import('typeorm').QueryRunner;
  return { qr, sql };
}

describe('CreateCorpusSession1700000002000 (D70)', () => {
  it('up() emits canonical DDL matching connect-pg-simple table.sql', async () => {
    const m = new CreateCorpusSession1700000002000();
    const { qr, sql } = makeQueryRunner();
    await m.up(qr);
    // Three statements: CREATE TABLE, ALTER TABLE (PK), CREATE INDEX
    assert.equal(sql.length, 3, `expected 3 statements, got ${sql.length}`);
    assert.match(sql[0]!, /CREATE TABLE IF NOT EXISTS "corpus_session"/);
    assert.match(sql[0]!, /"sid" varchar NOT NULL/);
    assert.match(sql[0]!, /"sess" json NOT NULL/);
    assert.match(sql[0]!, /"expire" timestamp\(6\) NOT NULL/);
    assert.match(sql[1]!, /ALTER TABLE "corpus_session" ADD CONSTRAINT "corpus_session_pkey"/);
    assert.match(sql[1]!, /PRIMARY KEY \("sid"\)/);
    assert.match(sql[2]!, /CREATE INDEX IF NOT EXISTS "IDX_corpus_session_expire"/);
  });

  it('up() is idempotent — second invocation issues identical SQL', async () => {
    const m = new CreateCorpusSession1700000002000();
    const { qr, sql } = makeQueryRunner();
    await m.up(qr);
    const first = [...sql];
    sql.length = 0;
    await m.up(qr);
    const second = [...sql];
    assert.deepEqual(second, first, 'migration must be stateless');
  });

  it('down() drops index then table in correct order', async () => {
    const m = new CreateCorpusSession1700000002000();
    const { qr, sql } = makeQueryRunner();
    await m.down(qr);
    assert.equal(sql.length, 2);
    assert.match(sql[0]!, /DROP INDEX IF EXISTS "IDX_corpus_session_expire"/);
    assert.match(sql[1]!, /DROP TABLE IF EXISTS "corpus_session"/);
  });

  it('migration has a stable `name` (TypeORM bookkeeping uses this)', () => {
    const m = new CreateCorpusSession1700000002000();
    assert.equal(m.name, 'CreateCorpusSession1700000002000');
  });
});
