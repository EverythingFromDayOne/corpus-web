'use client';

import { useEffect } from 'react';

/**
 * D26 sub-slice A.1 — flat OAuth success-redirect target.
 *
 * The API's Google OAuth callback (`apps/api/src/modules/auth/auth.controller.ts`,
 * `GET /auth/google/callback`) used to 302 to `${webOrigin}/` after writing the
 * session cookie. That made the popup itself land on the homepage — visually
 * disruptive (the user sees the homepage briefly flash in the popup) and
 * required the parent window to discover the new session via polling alone.
 *
 * Fix (Bug 2): the API now 302s to `${webOrigin}/auth/google/callback` (this
 * file) instead. This route does nothing useful as a page — its only job is:
 *   1. Tell the parent window the auth flow succeeded (`window.opener.postMessage`)
 *   2. Close itself
 *   3. Fall back to a same-origin redirect to `/` if the opener is gone
 *      (e.g. user navigated away or popup blocker severed the handle).
 *
 * The parent listens in `apps/web/components/chrome/sign-in-context.tsx`'s
 * `SignInProvider` and reacts by reverting the button state on receipt.
 *
 * Flat (no `[locale]` segment) on purpose: the auth callback must work
 * identically regardless of locale, and there is no locale-prefixed variant
 * of `/auth/google/callback` — the API redirect target is a single fixed URL.
 *
 * Failure-path note: the API's error redirect target (`${webOrigin}/?auth=error&reason=...`)
 * is intentionally NOT changed — error handling lives on the home page per the
 * `oauth-passport-google` skill. This route is the success path only.
 */
export default function GoogleOAuthCallbackPage() {
  useEffect(() => {
    // Same-origin postMessage: the parent window that opened this popup is
    // also running `apps/web`, so its `window.location.origin` is identical
    // to ours — no `WEB_ORIGIN` env read required. Hardcoding it here would
    // couple client code to a server-only contract and risk a port mismatch.
    const opener = window.opener;
    if (opener && !opener.closed) {
      opener.postMessage({ type: 'oauth-success' }, window.location.origin);
      window.close();
      // After `window.close()`, React's cleanup phase still runs but the
      // window is gone. Don't render anything past this point.
      return;
    }
    // No opener (popup blocker severed the handle, or the user opened this
    // URL directly): bounce to the homepage so the user lands on real content
    // rather than an empty white screen. A real location replace is fine
    // here — the route never carries meaningful state and is never
    // bookmarked.
    window.location.replace('/');
  }, []);

  return null;
}