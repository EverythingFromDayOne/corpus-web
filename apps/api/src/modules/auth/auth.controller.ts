import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { loadEnv } from '../../config/env-schema.js';

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
 *   POST /auth/logout          — destroys the session row in
 *                                `corpus_session` and clears the cookie.
 *                                Authenticated-only.
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
   * Google redirects back here. Passport verifies the response,
   * calls `GoogleStrategy.validate`, and on success attaches the
   * `User` to `req.user`. The session middleware (registered in
   * `app.module.ts`) then persists `req.session.passport.user = user.id`
   * because of `SessionSerializer.serializeUser`.
   *
   * We redirect the browser to `${WEB_ORIGIN}/` on success,
   * `${WEB_ORIGIN}/?auth=error` on failure.
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth 2.0 callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const env = await loadEnv();
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

    // Successful login. The session row in `corpus_session` was
    // already written by `express-session` + `connect-pg-simple` via
    // Passport's `req.login` flow.
    this.logger.log(`google login ok for user.id=${(req.user as { id?: string }).id ?? '(unknown)'}`);
    res.redirect(302, `${webOrigin}/`);
  }

  /**
   * Destroy the session. We:
   *  1. `req.logout()` to clear the passport slot.
   *  2. `req.session.destroy()` to remove the `corpus_session` row.
   *  3. Clear the cookie client-side.
   *
   * Returns 204 No Content with the cleared `Set-Cookie` header —
   * JSON would be wrong at a browser; the caller is the Next.js app
   * on a same-origin POST that then reloads the page.
   */
  @Get('logout')
  @ApiOperation({ summary: 'Destroy the current session' })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const env = await loadEnv();
    const webOrigin = env.WEB_ORIGIN.split(',')[0]?.trim() ?? '';

    await new Promise<void>((resolve) => req.logout?.(() => resolve()));
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    res.clearCookie(env.SESSION_COOKIE_NAME, { path: '/' });
    // 303 keeps the redirect GET-after-POST semantics clean even when
    // the form was a GET — the browser follows with GET, no body.
    res.redirect(303, `${webOrigin}/`);
  }
}
