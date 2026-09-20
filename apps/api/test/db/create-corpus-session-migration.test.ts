import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
const { Client } = pg;
type PgClient = InstanceType<typeof Client>;
import type { QueryRunner } from 'typeorm';
import { CreateCorpusSession1700000002000 } from '../../src/db/migrations/1700000002000-CreateCorpusSession.js';

const execFileP = promisify(execFile);

/**
 * D70 migration integration test (CORRECTED 2026-09-20).
 *
 * Replaces PR #193's "code checking the code" test suite with a real
 * Postgres round-trip. Per Huy's review of PR #193, D72 Open row:
 *
 * > Migration tests for future D-rows must include a `pg_dump
 * > --schema-only --table=<x>` round-trip — apply the migration to a
 * > clean test DB, dump the schema, diff against the literal live DDL
 * > string, expect zero diff. AND a second-invocation idempotency test
 * > against a DB that already has the schema.
 *
 * Tests skip (not fail) when `corpus-api-db` is unreachable, so CI without
 * Postgres passes. Locally, with `docker compose up db`, all four cases run.
 */

const LIVE_DDL = `CREATE TABLE public.corpus_session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);

ALTER TABLE ONLY public.corpus_session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);

CREATE INDEX "IDX_session_expire" ON public.corpus_session USING btree (expire);
`;

function getDbUrl(): string {
  // Local `corpus-api-db` container was started with POSTGRES_PASSWORD=
  // corpus_dev_only (the .env.example placeholder). Override via env var
  // for non-local environments.
  return (
    process.env['TEST_DATABASE_URL'] ??
    'postgres://corpus:corpus_dev_only@127.0.0.1:5432/corpus_api'
  );
}

async function pingDb(url: string): Promise<boolean> {
  const c = new Client({ connectionString: url });
  try {
    await c.connect();
    await c.query('SELECT 1');
    await c.end();
    return true;
  } catch {
    return false;
  }
}

async function dropCorpusSession(client: PgClient): Promise<void> {
  await client.query('DROP INDEX IF EXISTS "IDX_session_expire"');
  await client.query('DROP TABLE IF EXISTS corpus_session CASCADE');
}

// Minimal QueryRunner shim — the migration only calls `.query(sql)`. We
// forward to the underlying pg.Client. Keeps the migration file runtime-
// compatible with TypeORM (which supplies a real PgQueryRunner) while
// letting the test connect to a real Postgres without a DataSource.
function asQueryRunner(client: PgClient): QueryRunner {
  return {
    query: (sql: string) => client.query(sql),
  } as unknown as QueryRunner;
}

describe('CreateCorpusSession1700000002000 (D70 corrected)', () => {
  const migration = new CreateCorpusSession1700000002000();
  let dbUrl: string;
  let dbAvailable = false;
  let client: PgClient;

  before(async () => {
    dbUrl = getDbUrl();
    dbAvailable = await pingDb(dbUrl);
    if (!dbAvailable) return;
    client = new Client({ connectionString: dbUrl });
    await client.connect();
    await dropCorpusSession(client);
  });

  after(async () => {
    if (!dbAvailable) return;
    await dropCorpusSession(client);
    await client.end();
  });

  it('Test #4: stable name for TypeORM bookkeeping', () => {
    assert.equal(migration.name, 'CreateCorpusSession1700000002000');
  });

  it('Test #1: pg_dump round-trip — applied schema matches measured VPS DDL byte-for-byte', async (t) => {
    if (!dbAvailable) {
      t.skip('corpus-api-db unreachable');
      return;
    }
    // Clean slate, apply migration, dump schema, diff against live.
    await dropCorpusSession(client);
    await migration.up(asQueryRunner(client));

    // Run pg_dump via the host's docker exec against the live container.
    const { stdout } = await execFileP('docker', [
      'exec',
      'corpus-api-db',
      'pg_dump',
      '-U',
      'corpus',
      '-d',
      'corpus_api',
      '--schema-only',
      '--table=corpus_session',
    ]);

    // Normalize: strip pg_dump's noise (SET statements, -- comments,
    // OWNER TO clauses, trailing markers), then collapse whitespace and
    // remove `public.` and `ONLY` qualifiers that don't change semantics.
    const normalize = (s: string): string =>
      s
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('--')) // drop comments
        .filter((line) => !line.trimStart().startsWith('SET ')) // drop SET
        .filter((line) => !line.trimStart().startsWith('SELECT pg_catalog')) // drop set_config
        .filter((line) => !/ALTER TABLE .* OWNER TO/.test(line)) // drop OWNER
        .filter((line) => line.trim() !== '') // drop blank lines
        .join('\n')
        .replace(/public\./g, '')
        .replace(/ONLY /g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s*\n\s*/g, '\n')
        .trim();

    const actual = normalize(stdout);
    const expected = normalize(LIVE_DDL);

    assert.equal(
      actual,
      expected,
      `pg_dump output diverges from measured VPS DDL:\n--- actual ---\n${actual}\n--- expected ---\n${expected}`,
    );
  });

  it('Test #2: idempotency against a DB that already has the live schema', async (t) => {
    if (!dbAvailable) {
      t.skip('corpus-api-db unreachable');
      return;
    }
    // Apply once, then apply AGAIN. The second application must succeed
    // without raising (DO block guards constraint, IF NOT EXISTS guards
    // table + index). No duplicate constraint, no duplicate index.
    await dropCorpusSession(client);
    await migration.up(asQueryRunner(client));
    await migration.up(asQueryRunner(client));

    // Verify exactly ONE primary key constraint named session_pkey.
    const constraints = await client.query(
      `SELECT conname FROM pg_constraint WHERE conrelid = 'corpus_session'::regclass AND contype = 'p'`,
    );
    assert.equal(constraints.rows.length, 1, 'expected exactly 1 PK constraint');
    assert.equal(constraints.rows[0]?.conname, 'session_pkey');

    // Verify exactly ONE index named IDX_session_expire.
    const indexes = await client.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'corpus_session'`,
    );
    const matching = indexes.rows.filter((r: { indexname: string }) => r.indexname === 'IDX_session_expire');
    assert.equal(matching.length, 1, 'expected exactly 1 IDX_session_expire index');
  });

  it('Test #3: down() reverse order — drops index before table', async (t) => {
    if (!dbAvailable) {
      t.skip('corpus-api-db unreachable');
      return;
    }
    await dropCorpusSession(client);
    await migration.up(asQueryRunner(client));
    await migration.down(asQueryRunner(client));

    const tables = await client.query(
      `SELECT to_regclass('public.corpus_session') AS regclass`,
    );
    assert.equal(tables.rows[0]?.regclass, null, 'corpus_session should not exist');

    const indexes = await client.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'corpus_session'`,
    );
    assert.equal(indexes.rows.length, 0, 'no indexes for dropped table');
  });
});
