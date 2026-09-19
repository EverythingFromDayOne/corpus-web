import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { loadAppEnv } from '../../config/env-schema.js';

/**
 * Auth routes — three endpoints:
 *
 *   GET /auth/google           — kicks off the Google OAuth dance. Public.
 *                                Returns a 302 to accounts.google.com.
 *
 *   GET /auth/google/callback  — Google's redirect target. Public.
 *                                On success, Passport calls our strategy,
 *                                we upsert the user, and we 302 the
 *                                browser back to the configured
 *                                `post-callback` URL on the web origin.
 *                                On failure, we 302 with `?auth=error`
 *                                — never JSON at a browser.
 *
 *   GET  /auth/logout          — destroys the session row in
 *                                `corpus_session` and clears the cookie.
 *                                Authenticated-only. GET (not POST) because
 *                                SameSite=Lax already blocks the cross-origin
 *                                POST that CSRF would defend against, and a
 *                                plain link from the Next.js shell "log out"
 *                                control works without a hidden form. See
 *                                `.claude/skills/oauth-passport-google/SKILL.md`
 *                                §The contract for the canonical row.
 *
 * The success/failure redirect targets are computed from `WEB_ORIGIN`
 * env. They are always a same-origin path on the web app — never an
 * external URL — so we never leak the user's id_token or session id
 * into a third-party referer log.
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  /**
   * Begin the OAuth dance. `AuthGuard('google')` returns the
   * middleware that triggers Passport. No handler body — Passport
   * short-circuits the request.
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
   * We redirect the browser to `${WEB_ORIGIN}/` on success,
   * `${WEB_ORIGIN}/?auth=error` on failure.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 2.0 callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const env = await loadAppEnv();
    const webOrigin = env.WEB_ORIGIN.split(',')[0]?.trim() ?? '';

    // Passport's `failureRedirect` is the canonical way to do this;
    // we use `AuthGuard('google', { failureRedirect })` in a guard
    // metadata and read the failure case from `req.authInfo`. We do
    // it inline here so the redirect target is `WEB_ORIGIN` (not
    // hardcoded).
    if (!req.user) {
      this.logger.warn('google callback fired without req.user — failing');
      res.redirect(302, `${webOrigin}/?auth=error&reason=missing-user`);
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
    // The failure-path redirect above (`${webOrigin}/?auth=error&...`) is
    // intentionally untouched per the `oauth-passport-google` skill.
    this.logger.log(`google login ok for user.id=${(req.user as { id?: string }).id ?? '(unknown)'}`);
    res.redirect(302, `${webOrigin}/auth/google/callback`);
  }

  /**
   * Destroy the session. We:
   *  1. `req.logout()` to clear the passport slot.
   *  2. `req.session.destroy()` to remove the `corpus_session` row.
   *  3. Clear the cookie client-side.
   *
   * Returns 303 See Other with the cleared `Set-Cookie` header and a
   * Location header pointing at `${WEB_ORIGIN}/`. The caller is the
   * Next.js app on a same-origin GET link; the 303 keeps GET-after-GET
   * semantics clean (browsers don't replay the destructive action on
   * refresh).
   */
  @Get('logout')
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const env = await loadAppEnv();
    const webOrigin = env.WEB_ORIGIN.split(',')[0]?.trim() ?? '';

    await new Promise<void>((resolve) => req.logout?.(() => resolve()));
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
    // 303 keeps the redirect GET-after-POST semantics clean even when
    // the form was a GET — the browser follows with GET, no body.
    res.redirect(303, `${webOrigin}/`);
  }
}
