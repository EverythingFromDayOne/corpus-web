---
name: typeorm-migrations
description: Use when writing a TypeORM migration. Never synchronize.
---

# Authoring and running TypeORM migrations (apps/api)

`synchronize: true` is forbidden in every environment including test — this is a hard
rule in `.cursor/rules/20-never-violate.mdc` and `50-api-nestjs.mdc`, not a preference.
`apps/api/src/db/data-source.ts` sets `synchronize: false` unconditionally; do not add a
flag or env var that could flip it.

## Why there's no `migration:generate`

`apps/api/package.json`'s `migration:generate` script is an intentional exit-1 stub:
`echo "Hand-write a class implementing MigrationInterface..." && exit 1`. This is
deliberate, not a TODO — TypeORM's auto-generate diffs the live DB against entity
metadata and can produce destructive or wrong SQL (e.g. drop-and-recreate for a rename).
Hand-writing forces you to reason about the diff yourself.

## Authoring a migration from an entity diff

1. Write or edit the entity first (see `nestjs-module-scaffold`).
2. Diff the entity's new/changed `@Column()`s against the current schema by eye — what
   `CREATE TABLE`, `ALTER TABLE ADD COLUMN`, or `CREATE INDEX` statements get you there.
3. Create `src/db/migrations/<epoch-ms>-<PascalCaseName>.ts`. Use the current epoch
   milliseconds as the numeric prefix (matches `1700000000000-ScaffoldHealthcheck.ts`,
   `1700000001000-CreateUsers.ts`) — this is TypeORM's ordering key, not a real
   timestamp; keep it monotonically increasing across migrations.
4. Implement `MigrationInterface` with `name` matching the class name + numeric suffix,
   and both `up(queryRunner)` and `down(queryRunner)`. Every `up()` statement should be
   `IF NOT EXISTS` / `IF EXISTS`-guarded where the DDL supports it (see
   `ScaffoldHealthcheck1700000000000`) so a migration is safe to re-run against a
   partially-applied state.
5. Register the entity in `buildOptions()`'s `entities: [...]` array in
   `src/db/data-source.ts` if it's new — TypeORM's contract is global registration in
   the DataSource, then per-module `TypeOrmModule.forFeature([Entity])` to get a
   `Repository` injected.
6. Run it: `pnpm --filter @corpus/api migration:run` (wraps `buildDataSource()` +
   `dataSource.runMigrations({ transaction: 'each' })` — see `src/db/migrate-run.ts`).
   Revert with `pnpm --filter @corpus/api migration:revert`.

## Extensions and PKs

Every entity's PK is `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. The `pgcrypto`
extension that provides `gen_random_uuid()` is enabled once, in the scaffold migration
(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`) — don't re-enable it per-migration.

## Archive, never hard-delete

`lessons` rows (and by the same reasoning `quiz_attempts`, `card_reviews`) are archived,
never hard-deleted — see `.cursor/rules/50-api-nestjs.mdc` Persistence section. A
migration that adds a hard `DELETE` or a `DROP TABLE` against one of these tables is a
rule violation, not a style question — stop and ask before writing it.

## Verifying a migration landed correctly

Use `psql \d <table>` against the local Docker Postgres to confirm the actual column
types, indexes, and constraints match what the migration intended — don't infer success
from `migration:run`'s "applied" log line alone. PR #179's `CreateUsers` migration was
verified this way (4-index shape confirmed via `psql \d users`).
