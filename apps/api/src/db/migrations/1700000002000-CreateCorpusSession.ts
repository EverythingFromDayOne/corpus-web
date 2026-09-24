import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * D70 — `CreateCorpusSession` migration (CORRECTED 2026-09-20).
 *
 * ## Source of truth
 *
 * The DDL in this file MUST match the live VPS `corpus_session` table
 * measured 2026-09-20 via:
 *
 * ```bash
 * docker exec corpus-api-db pg_dump -U corpus -d corpus_api \
 *   --schema-only --table=corpus_session
 * ```
 *
 * ```sql
 * CREATE TABLE public.corpus_session (
 *     sid character varying NOT NULL,
 *     sess json NOT NULL,
 *     expire timestamp(6) without time zone NOT NULL
 * );
 * ALTER TABLE ONLY public.corpus_session
 *     ADD CONSTRAINT session_pkey PRIMARY KEY (sid);
 * CREATE INDEX "IDX_session_expire" ON public.corpus_session USING btree (expire);
 * ```
 *
 * The first PR #193 attempt derived DDL from `connect-pg-simple`'s
 * `table.sql` package template. That derivation was wrong on three counts:
 *
 * 1. **Constraint name is `session_pkey`, NOT `corpus_session_pkey`.**
 *    The package templates the TABLE identifier only (`"session"` →
 *    `tableName`). Constraint and index names are NOT substituted. Reading
 *    the package source would never have settled this.
 * 2. **Index name is `IDX_session_expire`, NOT `IDX_corpus_session_expire`.**
 *    Same reason — index names are literal.
 * 3. **Column type is `character varying` (no length), `json`, and
 *    `timestamp(6) without time zone`.** Match these verbatim.
 *
 * The three deltas raised at PR #193 review (Huy, 2026-09-20, measured on
 * the VPS) and the corrected slice uses the measured DDL directly.
 *
 * ## Idempotency
 *
 * `ADD CONSTRAINT` has no `IF NOT EXISTS`. We guard it with a `DO` block
 * that checks `pg_constraint` before issuing the ALTER. The index uses
 * `CREATE INDEX IF NOT EXISTS` (it does support that form).
 *
 * ## Why the `session.ts` `createTableIfMissing` flag is now `false`
 *
 * Schema is owned by the migration directory. The runtime does not mutate
 * the schema. See D70 Open row in `docs/DEBT.md`.
 */
export class CreateCorpusSession1700000002000 implements MigrationInterface {
  public readonly name = 'CreateCorpusSession1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. CREATE TABLE — `IF NOT EXISTS` makes this idempotent against a
    //    DB that already has the table (VPS does).
    await queryRunner.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS "corpus_session" (
        "sid" character varying NOT NULL,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
    `);

    // 2. ADD CONSTRAINT — guarded by DO block because ADD CONSTRAINT has
    //    no IF NOT EXISTS. The constraint name is the literal `session_pkey`
    //    from the live VPS (NOT `corpus_session_pkey`).
    //
    //    Per Huy 2026-09-20 verbatim review of PR #193's DO block
    //    (lacking conrelid scope): "constraint names are unique per table,
    //    not per schema, so a bare conname check could match something else
    //    entirely." conrelid is scoped to `public.corpus_session`::regclass.
    await queryRunner.query(/* sql */ `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'session_pkey'
            AND conrelid = 'public.corpus_session'::regclass
        ) THEN
          ALTER TABLE "corpus_session" ADD CONSTRAINT "session_pkey"
            PRIMARY KEY ("sid");
        END IF;
      END $$
    `);

    // 3. CREATE INDEX — quoted, exact case, matches live VPS.
    await queryRunner.query(/* sql */ `
      CREATE INDEX IF NOT EXISTS "IDX_session_expire"
        ON "corpus_session" USING btree ("expire")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse order: index first, then table. `DROP INDEX IF EXISTS`
    // accepts a quoted name; if the constraint still references the
    // table, Postgres will refuse the DROP TABLE — that is intentional
    // (caller must drop the constraint first if they want a clean tear-down).
    await queryRunner.query(/* sql */ `DROP INDEX IF EXISTS "IDX_session_expire"`);
    await queryRunner.query(/* sql */ `DROP TABLE IF EXISTS "corpus_session"`);
  }
}
