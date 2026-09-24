import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Trivial entity proving the migration round-trip. It exists only so the
 * scaffold has one row to `generate` against and so the liveness/readiness
 * checks run inside a database that actually has a schema. A real module
 * (auth/users/catalog/progress/quiz/srs/notes/analytics/admin) lands in
 * later sessions and replaces or extends this entity. Do not let it become
 * a dumping ground.
 *
 * The shape mirrors what `nestjs-concepts` calls a `lessons`-style row:
 * archived, never deleted, with a stable slug. See the corpus-nest-module
 * skill for why `lessons` is archived, not deleted.
 */
@Entity({ name: 'scaffold_healthcheck' })
export class ScaffoldHealthcheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 128 })
  slug!: string;

  @Column({ type: 'varchar', length: 256 })
  note!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
