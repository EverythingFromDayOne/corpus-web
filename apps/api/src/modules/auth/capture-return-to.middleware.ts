import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * Capture `?returnTo=` on the OAuth START route and stash it in the
 * session, so the callback can read it back.
 *
 * Why a middleware (not a controller body):
 *   - `@UseGuards(AuthGuard('google'))` short-circuits the request
 *     before any handler body runs. Passport's `AuthGuard` constructs
 *     the redirect to `accounts.google.com` and the handler never
 *     gets a chance to mutate the session.
 *   - Express middleware runs before guards in the NestJS request
 *     lifecycle (middleware → guards → interceptors → pipes →
 *     handler). We can write to `req.session` here and the value
 *     survives the redirect to Google and back, because
 *     `express-session` persists the session row on the response
 *     flush that triggers after the guard sends its 302.
 *
 * What we store:
 *   - The literal `req.query.returnTo` string. We do NOT validate it
 *     here — validation lives in `resolveReturnOrigin` on the
 *     callback side, where it has access to the same allowlist. Storing
 *     first lets us preserve the user's intent; any invalid value
 *     simply falls back to the allowlist's first origin at callback
 *     time. Never echo an invalid value to the browser.
 *   - Coerced to string when the query parser returns an array
 *     (`?returnTo=a&returnTo=b` → `['a','b']`); we keep the FIRST
 *     entry because that is the user's top-of-list intent.
 *
 * What we do NOT store:
 *   - The full URL with path/query is preserved verbatim. Path/query
 *     are stripped later by `new URL(x).origin` in
 *     `resolveReturnOrigin`; only the origin survives.
 *
 * Backward compat: when `returnTo` is absent (FE pre-FE-1), we
 * leave the session alone. The callback falls back to the Referer
 * header, which the browser always sends for top-level navigations.
 */
@Injectable()
export class CaptureReturnToMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const raw = req.query?.['returnTo'];
    let value: string | undefined;
    if (typeof raw === 'string') {
      value = raw;
    } else if (Array.isArray(raw) && typeof raw[0] === 'string') {
      value = raw[0];
    }
    if (value !== undefined && value.length > 0) {
      (req.session as { returnTo?: string }).returnTo = value;
    }
    next();
  }
}