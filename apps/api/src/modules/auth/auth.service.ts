import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

/**
 * Shape we hand the Passport Google strategy as the "verified profile".
 * Source: `passport-google-oauth20`'s `VerifyCallback`. We pull only what
 * we actually persist — see `User` for the full set.
 */
export interface GoogleProfile {
  googleSub: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string | null;
}

/**
 * Auth service — small. The whole job is to turn a verified Google
 * profile into a `users` row (creating it on first sign-in, updating
 * the profile fields on every subsequent sign-in). The session
 * middleware stores the user's UUID in the cookie; `MeController`
 * loads the user record from this service on every protected call.
 *
 * No password handling, no email verification, no refresh-token
 * rotation — all explicit out-of-scope per the D26 first-slice task
 * prompt. Refresh tokens and RBAC are separate stories.
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * Upsert the user by `google_sub`. Updates the profile fields if the
   * row already exists (Google may change `name` / `avatar_url` over
   * time; we want the most recent values). Idempotent — calling it
   * twice with the same profile is a no-op on the second call.
   *
   * Uses a single `INSERT ... ON CONFLICT (google_sub) DO UPDATE` so
   * concurrent first logins from two devices cannot race and produce
   * duplicate rows (the unique index makes one fail; the ON CONFLICT
   * clause makes the second retry as an update).
   */
  async upsertByGoogleProfile(profile: GoogleProfile): Promise<User> {
    const result = await this.users
      .createQueryBuilder()
      .insert()
      .into(User)
      .values({
        googleSub: profile.googleSub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        locale: profile.locale,
      })
      .orUpdate(['email', 'name', 'avatar_url', 'locale'], ['google_sub'])
      .returning('*')
      .execute();
    // `.returning('*')` always returns the row shape on Postgres. With
    // an insert path it returns the inserted row; with an update path
    // SQLite/MySQL differ, but Postgres returns the post-update row.
    return result.generatedMaps[0] as User;
  }

  /** Load by primary id. Returns null if not found — the guard treats
   *  that as a 401 even if the session cookie is otherwise valid,
   *  which protects against the rare case of a user being deleted
   *  while still holding an unexpired session. */
  async findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }
}
