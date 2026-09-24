import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ScaffoldHealthcheck1700000000000 implements MigrationInterface {
  name = 'ScaffoldHealthcheck1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS scaffold_healthcheck (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug        varchar(128) NOT NULL,
        note        varchar(256) NOT NULL,
        created_at  timestamptz  NOT NULL DEFAULT now(),
        updated_at  timestamptz  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_scaffold_healthcheck_slug" ON scaffold_healthcheck (slug)`,
    );
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_scaffold_healthcheck_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS scaffold_healthcheck`);
  }
}
