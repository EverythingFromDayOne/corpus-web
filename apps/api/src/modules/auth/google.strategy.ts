import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { AuthService, type GoogleProfile } from './auth.service.js';

/**
 * Google OAuth 2.0 Passport strategy. Wired in `AuthModule.forRootAsync`
 * so the three Google env vars are read from the validated `AppEnv` at
 * module-init time. If the env is missing, the `AuthModule` itself is
 * not registered — see `isAuthEnabled()` and `app.module.ts`.
 *
 * The strategy validates:
 *   - The `id_token` Google returns on the callback is signed by
 *     Google and the `aud` claim matches our `GOOGLE_CLIENT_ID`. This
 *     is `passport-google-oauth20`'s job — we don't verify the JWT by
 *     hand.
 *   - The `access_token` Google issued is exchanged for the userinfo
 *     bundle via the strategy's built-in `userProfile` call.
 *
 * On success we hand the profile to `AuthService.upsertByGoogleProfile`
 * and persist the user's UUID under `req.user.id`. The Passport
 * `session: true` option in `auth.controller.ts` is what causes
 * Passport to call our serializer and store the UUID in the session.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    clientID: string,
    clientSecret: string,
    callbackURL: string,
  ) {
    super({
      clientID,
      clientSecret,
      callbackURL,
      // `scope: ['openid', 'email', 'profile']` is the minimum set
      // that returns `sub`, `email`, `name`, `picture`. We do NOT
      // request extra scopes; the prompt is explicit that this slice
      // is login-only, not contact-list or Gmail access.
      scope: ['openid', 'email', 'profile'],
    });
  }

  /**
   * Passport `verify` callback. Called by `passport-google-oauth20`
   * after a successful OAuth dance with the userinfo payload. We map
   * the Google shape to our internal `GoogleProfile`, upsert the user
   * row, and hand Passport the persisted `User` for the session.
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; emails?: Array<{ value: string; verified?: boolean }>; displayName?: string; photos?: Array<{ value: string }>; _json?: { locale?: string } },
    done: VerifyCallback,
  ): Promise<void> {
    const googleProfile: GoogleProfile = {
      googleSub: profile.id,
      email: profile.emails?.[0]?.value ?? null,
      name: profile.displayName ?? null,
      avatarUrl: profile.photos?.[0]?.value ?? null,
      locale: profile._json?.locale ?? null,
    };
    try {
      const user = await this.authService.upsertByGoogleProfile(googleProfile);
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
