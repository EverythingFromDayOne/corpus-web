import {
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

/**
 * Auth guard for protected routes. The presence of a session cookie is
 * not enough — we load the `users` row from Postgres on every request.
 * If the row is missing (user deleted, schema migrated, or someone
 * hand-edited the cookie payload), we 401.
 *
 * `req.isAuthenticated()` is set by Passport's session middleware on
 * every request that survived `express-session`'s `req.session.touch`.
 * If false, no session row exists at all.
 *
 * `req.user` is the value Passport set during `deserializeUser` — we
 * hand it a `{ id }` stub (see `SessionSerializer`), so we re-fetch
 * the full user record here and attach it to `req.user` for the
 * controller to consume.
 *
 * `@Inject(AuthService)` is EXPLICIT here on purpose, not stylistic.
 * `tsx`/esbuild (the `start:dev` runtime) never implements TypeScript's
 * `emitDecoratorMetadata` — it has no type checker, so it cannot emit
 * `design:paramtypes` for implicit constructor-type DI. `tsc` (the
 * production build path) does. That split meant this guard was
 * DI-broken (`this.authService` stayed `undefined` -> 500 on every
 * `/me` call) under `pnpm start:dev`, invisible under `pnpm build`,
 * and untested (no guard-level spec existed). Found 2026-09-17 via
 * Huy's live click-through after the A.3 passport-init fix made this
 * guard reachable for the first time. `@Inject()` sidesteps
 * `design:paramtypes` entirely — safe under both runtimes.
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.isAuthenticated?.()) {
      throw new UnauthorizedException('not authenticated');
    }
    const stub = req.user as { id?: string } | undefined;
    if (!stub?.id) {
      throw new UnauthorizedException('invalid session payload');
    }
    const user = await this.authService.findById(stub.id);
    if (!user) {
      throw new UnauthorizedException('user not found');
    }
    // Replace the stub with the full row so controllers see all fields.
    req.user = user;
    return true;
  }
}
