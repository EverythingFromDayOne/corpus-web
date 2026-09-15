import {
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
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

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
