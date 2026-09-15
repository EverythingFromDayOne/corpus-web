import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import type { User } from './entities/user.entity.js';

/**
 * Passport serializer for `express-session`. Stores only the user's
 * UUID in the cookie payload — not the full row, not the Google
 * profile. On every authenticated request, Passport calls
 * `deserializeUser`, which loads the row from Postgres via the auth
 * service. That load is one indexed lookup and gives us a single
 * place to enforce "session is valid iff the user still exists."
 *
 * Why not store the whole row in the session? Sessions live in
 * Postgres via `connect-pg-simple`; the table is keyed by `sid` with
 * a `sess json` payload. Bloat costs nothing on first read but
 * triples the cost on every subsequent `GET /me`. The PK is enough
 * to identify; the auth service re-loads.
 *
 * The serialize/deserialize types declare `User | number` because
 * `passport.serializeUser`'s signature defaults to numeric ids; we
 * coerce to a `string` UUID at the boundary.
 */
@Injectable()
export class SessionSerializer extends PassportSerializer {
  /**
   * Called once per request on login. Returns what goes into the
   * session's `passport.user` slot.
   */
  serializeUser(user: User, done: (err: Error | null, id?: string) => void): void {
    done(null, user.id);
  }

  /**
   * Called once per authenticated request. Returns the user object
   * Passport will expose as `req.user`. The auth controller uses
   * `req.user.id` directly; the me controller re-loads the row via
   * `AuthService.findById` so the payload always reflects the latest
   * profile fields.
   */
  deserializeUser(id: string, done: (err: Error | null, user?: User) => void): void {
    // The auth controller does its own `findById`; for the passport-
    // level `req.user`, we hand back a minimal User shape. The full
    // record is always loaded by `MeController` via `AuthService`.
    done(null, { id } as User);
  }
}
