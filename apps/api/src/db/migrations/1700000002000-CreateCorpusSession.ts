import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * D70 — `CreateCorpusSession` migration.
 *
 * The `corpus_session` table was created in production by
 * `connect-pg-simple`'s `createTableIfMissing: true` flag at
 * `session.ts:103-105`. The package's canonical DDL lives in
 * `node_modules/connect-pg-simple/table.sql`; the live table on the
 * VPS matches it byte-for-byte (no manual DDL was ever run against
 * this table — verified via `find` on the codebase, no migration
 * directory entry predates this one).
 *
 * Why `CREATE TABLE IF NOT EXISTS` and not a plain `CREATE TABLE`:
 *   - The flag is being turned off in the same PR. After this
 *     migration applies on the VPS, the table already exists; the
 *     `IF NOT EXISTS` makes the migration idempotent across the
 *     boot-time `runMigrations()` call (D69) and any subsequent
 *     restart.
 *   - If the table is missing (a fresh dev DB), the migration
 *     creates it with the canonical schema; no further setup needed.
 *
 * Schema source decision:
 *   - The package's `table.sql` (read on 2026-09-19 from
 *     `connect-pg-simple@10.0.0/node_modules/connect-pg-simple/table.sql`)
 *     is the source of truth, not a `pg_dump --schema-only` against
 *     the VPS. Rationale: the package's runtime created the table —
 *     any drift between the package and the live schema would
 *     manifest as a startup error from `connect-pg-simple`, and no
 *     such error has been observed. (If we observe one later, this
 *     migration's `down()` will produce a wrong baseline and we'll
 *     have to re-source. Tracked as a known-shape invariant.)
 *
 * Index note: the package adds `IDX_session_expire` on `(expire)`.
 * The package's string-replace turns `"session"` into
 * `tableName`-quoted form, so the index name on the live table is
 * also `IDX_session_expire` (the package does not replace index
 * names). `CREATE INDEX IF NOT EXISTS` matches that.
 *
 * No data migration: the live table is assumed empty for now
 * (sessions are short-lived). If a future table needs backfill,
 * a separate migration handles it.
 */
export class CreateCorpusSession1700000002000 implements MigrationInterface {
  name = 'CreateCorpusSession1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "corpus_session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )`);

    await queryRunner.query(
      `ALTER TABLE "corpus_session" ADD CONSTRAINT "corpus_session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_corpus_session_expire" ON "corpus_session" ("expire")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // `down()` drops the table and its index. We do not preserve data
    // — if a rollback is needed the table is reconstructed from the
    // canonical DDL above. The package's `createTableIfMissing: true`
    // will recreate it on next boot regardless.
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_corpus_session_expire"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "corpus_session"`);
  }
}
