import { Controller, Get, Inject, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { APP_CONFIG } from '../../config/app-config.provider.js';
import { buildSessionCookieOptions } from '../../config/session.js';
import type { AppEnv } from '../../config/env-schema.js';
import { resolveReturnOrigin } from './resolve-return-origin.js';

/**
 * Auth routes — three endpoints:
 *
 *   GET /auth/google           — kicks off the Google OAuth dance. Public.
 *                                Returns a 302 to accounts.google.com.
 *                                A pre-guard middleware (see
 *                                `capture-return-to.middleware.ts`) captures
 *                                `?returnTo=` from the query string and
 *                                stashes it in the session so the callback
 *                                can read it back — Google's redirect does
 *                                not carry a useful Referer.
 *
 *   GET /auth/google/callback  — Google's redirect target. Public.
 *                                On success, Passport calls our strategy,
 *                                we upsert the user, and we 302 the
 *                                browser back to a same-origin URL on
 *                                `WEB_ORIGIN` selected via
 *                                `resolveReturnOrigin(session.returnTo,
 *                                WEB_ORIGIN)`.
 *                                On failure, we 302 with `?auth=error`
 *                                — never JSON at a browser.
 *
 *   GET  /auth/logout          — destroys the session row in
 *                                `corpus_session` and clears the cookie
 *                                using the SHARED cookie options (see
 *                                `buildSessionCookieOptions`) so the
 *                                clear path uses the same NAME + DOMAIN
 *                                + PATH + SECURE as the set path.
 *                                Authenticated-only. GET (not POST)
 *                                because SameSite=Lax already blocks
 *                                the cross-origin POST that CSRF would
 *                                defend against, and a plain link from
 *                                the Next.js shell "log out" control
 *                                works without a hidden form. See
 *                                `.claude/skills/oauth-passport-google/SKILL.md`
 *                                §The contract for the canonical row.
 *
 * The success/failure redirect targets are computed from `WEB_ORIGIN`
 * env. They are always a same-origin URL on a configured web origin —
 * never an external URL — so we never leak the user's id_token or
 * session id into a third-party referer log.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  /**
   * Boot-time frozen env snapshot (D68). `loadAppEnv()` ran once in the
   * `APP_CONFIG` provider's `useFactory`; NestJS caches the resolved
   * value, so every controller instance gets the same snapshot. No
   * file read, no zod parse per request — that's the whole point.
   *
   * `@Inject(...)` is EXPLICIT on purpose (see the class-level note in
   * `health.controller.ts`): `tsx`/esbuild (`pnpm start:dev`) does not
   * implement `emitDecoratorMetadata`, so `design:paramtypes` is
   * missing under the dev runtime. Without `@Inject(APP_CONFIG)` the
   * symbol resolves to `undefined` and `req.logout()` / `req.login()`
   * never get the config — a 500 on every OAuth callback.
   */
  constructor(@Inject(APP_CONFIG) private readonly appConfig: AppEnv) {}

  /**
   * Begin the OAuth dance. `AuthGuard('google')` returns the
   * middleware that triggers Passport. No handler body — Passport
   * short-circuits the request.
   *
   * The capture-returnTo middleware (mounted in `AuthModule`) ran
   * before this guard and stashed `req.session.returnTo` if a valid
   * `?returnTo=` was present. By the time Passport redirects to
   * Google, the value is durably in the session row.
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Begin Google OAuth 2.0 flow' })
  beginGoogleOAuth(): void {
    // No-op — Passport short-circuits this request inside the guard.
    // The handler body exists only so Nest has a method to attach the
    // decorator to.
  }

  /**
   * Google redirects back here. Passport verifies the response and
   * calls `GoogleStrategy.validate`. On success Passport attaches
   * the `User` to `req.user` AND, when `passport.authenticate` is
   * called WITHOUT a callback, would call `req.logIn(user)` itself
   * (which triggers `serializeUser` → `req.session.passport.user`
   * → express-session write to `corpus_session`).
   *
   * `@nestjs/passport`'s `AuthGuard` calls `passport.authenticate`
   * WITH a callback, though — see `node_modules/@nestjs/passport/
   * dist/auth.guard.js` line 44. Passport's `authenticate.js`
   * `strategy.success` (line 220) then short-circuits via
   * `callback(null, user, info)` and never invokes `req.logIn`. The
   * docstring on `authenticate.js` line 54 spells this out:
   * "Note that if a callback is supplied, it becomes the
   * application's responsibility to log-in the user, establish a
   * session, and otherwise perform the desired operations."
   *
   * Without an explicit `req.login()` call here the session is never
   * mutated and `connect-pg-simple` writes nothing — symptom: zero
   * rows in `corpus_session` after a successful OAuth round-trip
   * even though `req.user` is populated and the user row was
   * upserted (D26, root-caused 2026-09-14).
   *
   * On success we 302 to `${origin}/auth/google/callback` where
   * `origin` is `resolveReturnOrigin(session.returnTo, WEB_ORIGIN)`.
   * On failure we 302 to `${origin}/?auth=error` — the failure path
   * uses the same origin picker so we never redirect off the
   * allowlist.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 2.0 callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const allowlist = this.appConfig.WEB_ORIGIN;
    const sessionReturnTo = (req.session as { returnTo?: unknown } | null)?.returnTo;
    const referer = readRefererOrigin(req);
    const candidate = pickCandidate(
      typeof sessionReturnTo === 'string' ? sessionReturnTo : undefined,
      referer,
    );
    const origin = resolveReturnOrigin(candidate, allowlist);

    // Passport's `failureRedirect` is the canonical way to do this;
    // we use `AuthGuard('google', { failureRedirect })` in a guard
    // metadata and read the failure case from `req.authInfo`. We do
    // it inline here so the redirect target is `WEB_ORIGIN` (not
    // hardcoded).
    if (!req.user) {
      this.logger.warn('google callback fired without req.user — failing');
      res.redirect(302, `${origin}/?auth=error&reason=missing-user`);
      return;
    }

    // Explicit `req.login()` — see the class-level docstring above.
    // Triggers `SessionSerializer.serializeUser` (writes the user
    // UUID to `req.session.passport.user`), which mutates the
    // session and causes `express-session` to persist the row via
    // `connect-pg-simple` on response flush. `req.login` is
    // monkey-patched onto `IncomingMessage` by Passport's
    // `authenticate` middleware (see `passport/lib/middleware/
    // authenticate.js:95`), so it does not exist on `express`'s
    // `Request` type — hence the cast.
    await new Promise<void>((resolve, reject) => {
      (req as unknown as { login: (u: unknown, cb: (err: Error | null) => void) => void }).login(
        req.user,
        (err) => (err ? reject(err) : resolve()),
      );
    });

    // Successful login. The session row in `corpus_session` was
    // written by `express-session` + `connect-pg-simple` as a
    // direct consequence of the `req.login()` call above.
    //
    // D26 sub-slice A.1 (Bug 2): the success target is now the flat
    // `/auth/google/callback` route on the web origin (not `/`). That
    // route (`apps/web/app/auth/google/callback/page.tsx`) postMessages
    // the opener and closes itself, so the parent window can revert the
    // sign-in button immediately rather than waiting on the next poll.
    // Polling stays only as a slow (7 s) safety net in `sign-in-button.tsx`.
    // No `[locale]` prefix — the API redirect target is a single fixed URL.
    // The failure-path redirect above (`${origin}/?auth=error&...`) is
    // intentionally untouched per the `oauth-passport-google` skill.
    this.logger.log(`google login ok for user.id=${(req.user as { id?: string }).id ?? '(unknown)'}`);
    res.redirect(302, `${origin}/auth/google/callback`);
  }

  /**
   * Destroy the session. We:
   *  1. `req.logout()` to clear the passport slot. The optional chain
   *     is FORBIDDEN here — if Passport is not initialized, `req.logout`
   *     is `undefined`, the optional chain skips the call silently,
   *     `resolve()` never runs, and the await hangs the request
   *     forever. CHANGELOG records "/me always-401 (missing Passport
   *     init)" — the same class of bug. We let a missing
   *     `req.logout` fail loudly.
   *  2. `req.session.destroy()` to remove the `corpus_session` row.
   *  3. Clear the cookie client-side using the SHARED cookie options
   *     from `buildSessionCookieOptions(appConfig)` — same NAME,
   *     DOMAIN, PATH, SECURE as the middleware used to set it. A
   *     mismatched clear would silently leave the real cookie
   *     alive (browsers key cookies by name + domain + path).
   *
   * The success target is `resolveReturnOrigin(returnTo|referer,
   * WEB_ORIGIN)`. With no `returnTo` and no Referer, we fall back to
   * the first allowed origin so a user always lands somewhere we
   * trust. The 303 keeps GET-after-POST semantics clean.
   */
  @Get('logout')
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const allowlist = this.appConfig.WEB_ORIGIN;
    const queryReturnTo = readQueryReturnTo(req);
    const referer = readRefererOrigin(req);
    const candidate = pickCandidate(queryReturnTo, referer);
    const origin = resolveReturnOrigin(candidate, allowlist);
    const cookieOptions = buildSessionCookieOptions(this.appConfig);

    await executeLogout(req);

    res.clearCookie(this.appConfig.SESSION_COOKIE_NAME, cookieOptions);
    // 303 keeps the redirect GET-after-POST semantics clean even when
    // the form was a GET — the browser follows with GET, no body.
    res.redirect(303, `${origin}/`);
  }
}

/**
 * Destroy the passport slot + the session row, rejecting (not hanging)
 * if Passport is not initialized on the request. Extracted from the
 * `@Get('logout')` handler so the regression test in
 * `apps/api/test/auth/redirect-and-logout.test.ts` can drive the same
 * code path the controller uses, instead of re-implementing the guard
 * inline (which would let a regression in `auth.controller.ts` slip
 * through CI).
 *
 * `req.logout` is added to `IncomingMessage` by Passport's
 * `authenticate` middleware. If it is missing (e.g., the `AuthModule`
 * was conditionally disabled because the Google env vars are unset) the
 * optional chain used to silently skip, leaving the promise hanging.
 * Now we fail loudly with a synchronous throw — the same shape the
 * `@Get('logout')` handler relies on.
 *
 * The cookie clear + 303 redirect are Express-coupled and stay on the
 * controller method — they need `res` (not present here) and the
 * controller's `appConfig`.
 */
export async function executeLogout(req: Request): Promise<void> {
  const passportReq = req as unknown as {
    logout?: (cb: (err: Error | null) => void) => void;
  };
  if (typeof passportReq.logout !== 'function') {
    throw new Error(
      'req.logout is not a function — Passport is not initialized on this request',
    );
  }
  await new Promise<void>((resolve, reject) => {
    passportReq.logout!((err: Error | null) => (err ? reject(err) : resolve()));
  });

  await new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Read `?returnTo=` from a request's query string. Returns undefined
 * when missing or non-string. Mirrors the same coercion in the
 * capture-returnTo middleware so both ends agree on the contract.
 */
function readQueryReturnTo(req: Request): string | undefined {
  const v = req.query?.['returnTo'];
  return typeof v === 'string' ? v : undefined;
}

/**
 * Read the Referer header and return its origin (or undefined).
 * Used as a backward-compatibility fallback so that callers that
 * pre-date `?returnTo=` (e.g. the FE before FE-1 lands) still land
 * back on the page they came from instead of jumping to production.
 */
function readRefererOrigin(req: Request): string | undefined {
  const ref = req.headers?.referer;
  if (typeof ref !== 'string' || ref.length === 0) return undefined;
  try {
    return new URL(ref).origin;
  } catch {
    return undefined;
  }
}

/**
 * Choose the first non-empty candidate from a priority list. Order:
 *   1. explicit candidate (session-stored or query)
 *   2. Referer origin (backward-compat for callers that don't send ?returnTo=)
 *   3. undefined → resolveReturnOrigin will return the first allowlist entry
 */
function pickCandidate(primary: string | undefined, referer: string | undefined): string | undefined {
  if (typeof primary === 'string' && primary.length > 0) return primary;
  if (typeof referer === 'string' && referer.length > 0) return referer;
  return undefined;
}