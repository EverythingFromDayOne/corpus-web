import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * `users` table — one row per real human who has signed in via Google at
 * least once. Owned by the NestJS `auth` module per
 * `.cursor/rules/50-api-nestjs.mdc` §"Auth".
 *
 * **PK is a uuid**, generated Postgres-side via `gen_random_uuid()` (the
 * `pgcrypto` extension is enabled by the scaffold migration; this PR
 * reuses it). External identity (Google) is a unique index on
 * `google_sub`, NOT the PK. The PK never leaks outside the API, so even
 * a leak of internal ids is decoupled from the auth provider.
 *
 * `email` is unique, but only one row carries a given email — we never
 * want two distinct google_sub values landing on the same email (the
 * `upsertByGoogleProfile` query guarantees this with `ON CONFLICT
 * (google_sub) DO UPDATE` rather than `ON CONFLICT (email)`).
 *
 * `name`, `avatar_url`, `locale` are profile fields the Google profile
 * gives us on first login. We persist them so the future `/me` payload
 * is stable across requests and not a Google round-trip.
 *
 * No `password_hash` column. Google is the only provider this session
 * covers; a future second provider would land as a sibling column on
 * this table or as a `user_identities` join, NOT as a "provider X
 * password" hack.
 */
@Entity({ name: 'users' })
@Index('uq_users_google_sub', ['googleSub'], { unique: true })
@Index('uq_users_email', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Google `sub` claim. Stable per Google account, never reused across
   * accounts, never changes for the lifetime of the Google account.
   * Index lookup is on this column — the canonical "who is this?" key.
   */
  @Column({ type: 'varchar', length: 64, name: 'google_sub' })
  googleSub!: string;

  /** Email on the Google profile at last login. Unique, may be null
   *  if Google did not return one (rare). */
  @Column({ type: 'varchar', length: 256, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 256, nullable: true })
  name!: string | null;

  @Column({ type: 'text', nullable: true, name: 'avatar_url' })
  avatarUrl!: string | null;

  /** Locale on the Google profile (`en`, `vi`, etc.). The Next.js site
   *  uses this as a hint, not a hard preference. */
  @Column({ type: 'varchar', length: 16, nullable: true })
  locale!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;
}
