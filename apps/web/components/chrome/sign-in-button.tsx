'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSignIn } from './sign-in-context';
import type { Messages } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';

/**
 * D26 sub-slice A — sign-in popup UX (PR #184, original).
 * D26 sub-slice A.1 — follow-up bugfix pass (4 bugs from Huy's Vercel
 * preview click-through).
 * D26 sub-slice A.2 — 2 further fixes from Echo's independent review
 * of A.1 (see below, marked "Bug 1 (A.2 fix)" and "Bug 5").
 * D26 sub-slice A.3 — 2 more fixes from Echo's LIVE click-through of
 * the A.2 diff on Vercel preview (see "Bug 6" below and the docstring
 * in `sign-in-context.tsx` for the postMessage-side half of the fix).
 *
 * The 4 bugs fixed in A.1 were all found by clicking through the Vercel
 * preview of PR #184 with a real Google account. The fixes are surgical —
 * the popup-open, polling, cleanup, accessibility, and disabled-union
 * behaviour introduced in A stay; only the four specific failure modes
 * below were addressed:
 *
 *   1. State resets on navigation. SignInButton held `processing` in
 *      local `useState`; `<SiteHeader>` (its only mount site) is
 *      re-instantiated on every App Router route change, so the button
 *      label reset to "Sign in" mid-flow. Fix: hoist `processing` to
 *      `SignInContext` (see `./sign-in-context.tsx`). The Provider lives
 *      in `app/[locale]/layout.tsx`, mounted once per locale tree, so it
 *      survives the SiteHeader remounts.
 *
 *      Bug 1 (A.2 fix — Echo caught this): the A.1 Context hoist alone
 *      did NOT fix Huy's repro. `<SiteHeader>`'s nav links
 *      (`nav-links.tsx`) and logo/pill-CTA were plain `<a href>` tags,
 *      not `next/link` — a real full-document browser navigation, which
 *      unmounts and remounts the ENTIRE React tree including
 *      `SignInProvider`. Context state cannot survive a hard reload any
 *      more than local `useState` could. Fix: `nav-links.tsx` and the
 *      logo/pill-CTA in `site-header.tsx` now use `next/link`, which
 *      keeps the navigation client-side and inside the same React tree,
 *      so `SignInProvider` (and its `processing` flag) genuinely
 *      survives the route change. (Other raw `<a href>` sites in the
 *      app — article breadcrumbs/page-nav — are out of scope for this
 *      fix; tracked separately, see docs/DEBT.md.)
 *
 *   2. Polling antipattern. The 2 s poll was the ONLY success signal,
 *      so the parent always waited up to 2 s after the popup wrote the
 *      cookie. Fix: primary success signal is now `window.postMessage`
 *      from `apps/web/app/auth/google/callback/page.tsx`, which the
 *      API's success redirect now lands on (Bug 2.1 — one-line change
 *      in `apps/api/src/modules/auth/auth.controller.ts`). Polling stays
 *      only as a slow (7 s) safety net in case the message path fails.
 *
 *   2.2. 401-debounce bug. `last401AtRef` was re-stamped on every poll
 *      tick that returned 401, which meant the 5 s post-close debounce
 *      never actually got exercised (a 401 at second 7 with the popup
 *      closed at second 2 reset the clock to second 7, not second 2).
 *      Fix: stamp the anchor only on the popup open→closed transition,
 *      not on 401 receipts. The 5 s debounce WINDOW stays — the bug
 *      was the anchor, not the window length.
 *
 *   4. Blanket 60 s force-revert. The `setTimeout(timeoutMs)` that
 *      force-reset `processing` at 60 s regardless of popup state is
 *      removed entirely. Slow OAuth or slow user should not flash the
 *      button back to "Sign in" while the popup is still legitimately
 *      open.
 *
 *   5. Post-close-debounce race (A.2 fix — Echo caught this). The
 *      server writes the session cookie and 302s the popup to the
 *      callback route BEFORE that route's own `useEffect` (which posts
 *      `oauth-success`) has a chance to run — a real ~100–400 ms gap.
 *      Closing the popup inside that gap meant no success message ever
 *      arrived, yet login had already succeeded. Worse, the old
 *      `POST_CLOSE_DEBOUNCE_MS` (5 s) was SHORTER than
 *      `POLL_INTERVAL_MS` (7 s), so the safety-net poll never got a
 *      chance to run before the debounce force-reverted the button.
 *      Fix: fire one immediate `/me` check the moment the popup is
 *      observed closed; only fall through to the 5 s debounce-based
 *      revert if that immediate check comes back 401 or errors. See
 *      the effect below for the full race explanation.
 *
 *   6. /me always 401 regardless of cookie validity (A.3 fix — Echo
 *      caught this via a LIVE click-through, not just code review).
 *      `apps/api/src/main.ts` never called `app.use(passport.initialize())`
 *      / `app.use(passport.session())` — `PassportModule.register({...})`
 *      only wires DI providers, it does not touch the actual Express
 *      instance. `SessionAuthGuard` (used by `GET /me`) checks
 *      `req.isAuthenticated?.()`, a method Passport monkey-patches onto
 *      `req` only as a side effect of `passport.authenticate()` running.
 *      The two `AuthGuard('google')` OAuth routes worked "by accident"
 *      because that side effect happened to run on them; `/me` uses
 *      `SessionAuthGuard` directly with no `AuthGuard('google')` in
 *      front of it, so the patch never applied and `/me` 401'd even
 *      with a fully valid session cookie. Fix: `main.ts` now calls
 *      `app.use(passport.initialize())` and `app.use(passport.session())`
 *      right after `sessionMiddleware`, before CORS/routes register.
 *
 *   7. Poll never stops after a successful postMessage login (A.3 fix —
 *      Echo caught this). `SignInContext`'s postMessage handler only
 *      called `setProcessing(false)` on success — it had no reference
 *      to the `<SignInButton>` instance's local `pollTimerRef` /
 *      `closeWatcherRef` / `popupRef`, so the button's 7 s `/me` poll
 *      (and close watcher) kept running in the background even after
 *      the button visually showed "Sign in" again. Before the Bug 6
 *      fix above, `/me` always 401'd, so the poll's own
 *      `if (res.ok) revert()` success path could never fire either —
 *      the poll ran forever until unmount or a full reload. Fix: the
 *      button now registers its `revert` callback with the provider
 *      (`registerRevert`, see `sign-in-context.tsx`); the provider
 *      calls that callback on postMessage success instead of just
 *      flipping `processing`, so the button's own timers/popup ref get
 *      cleared too.
 *
 * Out of scope (per `prompts/session-d26-signin-popup-ux-a1.md`):
 * avatar/sign-out/profile (slice B), POST /progress/migrate (slice C),
 * refresh tokens, RBAC, /auth/logout CSRF, /me rename, NEXT_PUBLIC_API_URL
 * architecture, any new npm package, any Vietnamese string or vi.json
 * entry, the failure-path (?auth=error) redirect, and any change to the
 * pre-existing `href === '/auth/google'` env-disabled guard (D55's
 * canonical surface for unset NEXT_PUBLIC_API_URL).
 */

type Props = {
  messages: Messages;
};

const POST_CLOSE_DEBOUNCE_MS = 5_000;
const CLOSE_WATCH_INTERVAL_MS = 250;
const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 600;

// D26 slice B — the 7_000 ms safety-net /me `setInterval` previously
// living in `openAuthPopup` was removed. The SignInProvider now owns
// the authoritative `/me` fetch (one per locale-tree mount, plus on
// `corpus:auth-changed` events), so the button no longer needs its own
// background poll. The two remaining success paths are the
// `oauth-success` postMessage (handled in `sign-in-context.tsx`, which
// calls our registered `revert`) and the post-close effect's
// `provider.refresh()` (which delegates the actual `/me` fetch to the
// same provider).

export function SignInButton({ messages }: Props) {
  const { processing, setProcessing, registerRevert, meState, refresh } =
    useSignIn();
  // D55 canonical surface: apiUrl falls back to '' when
  // NEXT_PUBLIC_API_URL is unset, which makes authPath literally
  // '/auth/google' — the envDisabled guard below relies on that exact
  // string, so the fallback must go through the shared `apiUrl` module
  // (see `@/lib/config`) rather than reading `process.env` directly here.
  const authPath = `${apiUrl}/auth/google`;
  const envDisabled = authPath === '/auth/google';

  // Popup-specific state stays LOCAL (spec §1: only the boolean-ish
  // display flag is hoisted). These refs describe a single open popup;
  // they must not outlive the click that opened it, or the message-driven
  // revert path (Bug 2) would have no popup handle to close.
  const popupRef = useRef<Window | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closeWatcherRef = useRef<number | null>(null);

  /**
   * `popupClosed` is a React state flag (not a ref) so the post-close
   * debounce effect below can react to the transition. It flips true
   * exactly once per click — at the moment the watcher detects
   * `popup.closed === true`. Bug 2.2 fix: it does NOT flip on a 401 tick.
   */
  const [popupClosed, setPopupClosed] = useState(false);

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }
  function clearCloseWatcher() {
    if (closeWatcherRef.current !== null) {
      window.clearInterval(closeWatcherRef.current);
      closeWatcherRef.current = null;
    }
  }

  /**
   * Reset all local state to "idle" and tell the context the button is
   * no longer in flight. Called from the message-driven revert path
   * (Bug 2 — primary) and the post-close-debounce revert path (Bug 2.2
   * fallback when `/me` confirmed the popup closed before login
   * completed).
   */
  const revert = useCallback(() => {
    clearCloseTimer();
    clearCloseWatcher();
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setPopupClosed(false);
    setProcessing(false);
    // Stable across renders: closes only over refs (stable identity by
    // definition) and the `setProcessing` setter from `useSignIn()`,
    // which — like any `useState` setter — has a stable identity for the
    // lifetime of the component. `useCallback` here lets the post-close
    // debounce effect below list `revert` as a dependency and satisfy
    // `react-hooks/exhaustive-deps` without an eslint-disable.
  }, [setProcessing]);

  // A.3 fix (Echo caught this): register this button's `revert` with the
  // provider so a postMessage success (handled in `sign-in-context.tsx`)
  // can clear THIS button's poll timer / close watcher / popup ref, not
  // just flip the shared `processing` flag. Unregister on unmount so a
  // stale callback into an unmounted component never gets called.
  useEffect(() => {
    registerRevert(revert);
    return () => {
      registerRevert(null);
    };
  }, [registerRevert, revert]);

  /**
   * Wire up the popup lifecycle:
   *  - open the popup (or fall back to a tab if popups are blocked)
   *  - mount a 250 ms watcher that detects the popup's open→closed
   *    transition and stamps `popupClosed` (Bug 2.2 fix). The post-close
   *    effect below reacts to that flag.
   *  - if no `oauth-success` postMessage and no `/me` confirmation of
   *    a fresh session lands within the 5 s post-close debounce, revert
   *    (close was the user's choice, treat as cancel)
   *
   * Bug 4 — no 60 s blanket force-revert. The popup is allowed to stay
   * open indefinitely as long as the user hasn't closed it.
   *
   * Slice B — the 7 s `/me` safety-net poll that used to live here is
   * gone. The SignInProvider owns `/me`, and triggers `refresh()` on
   * `corpus:auth-changed` events. The only async work this function
   * does is open the window.
   */
  function openAuthPopup() {
    const left = Math.round(
      window.screenX + (window.outerWidth - POPUP_WIDTH) / 2,
    );
    const top = Math.round(
      window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2,
    );
    const features =
      `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},` +
      `left=${left},top=${top},` +
      `popup=yes,noopener=no,noreferrer=no`;

    const popup = window.open(authPath, 'google-oauth', features);
    if (!popup) {
      // Popup blocked: nothing to revert, nothing to poll. The user must
      // unblock popups and click again. Spec says no error surfaced.
      return;
    }
    popupRef.current = popup;
    setPopupClosed(false);
    setProcessing(true);

    // Bug 2.2 — stamp the anchor ONLY on the close transition.
    // We poll the popup's `.closed` flag at 250 ms (faster than the
    // /me re-check on close so the user-visible revert feels
    // immediate). Until the transition happens we leave the state
    // alone, so 401s on subsequent /me ticks cannot reset the
    // debounce clock.
    closeWatcherRef.current = window.setInterval(() => {
      if (popup.closed) {
        const watcher = closeWatcherRef.current;
        if (watcher !== null) window.clearInterval(watcher);
        closeWatcherRef.current = null;
        setPopupClosed(true);
      }
    }, CLOSE_WATCH_INTERVAL_MS);

    // Slice B — the 7 s safety-net `/me` poll previously living here
    // was removed: the `SignInProvider` (see `sign-in-context.tsx`)
    // now owns the authoritative `/me` fetch and broadcasts
    // `corpus:auth-changed` for siblings to react to, so the button
    // no longer needs its own background interval. The two remaining
    // success paths are the `oauth-success` postMessage (handled in
    // `sign-in-context.tsx`, which calls our registered `revert`)
    // and the post-close effect's one-shot `/me` re-check below.
  }

  function handleClick() {
    if (envDisabled || processing) return;
    openAuthPopup();
  }

  /**
   * Post-close-debounce revert watcher (Bug 2.2 fallback, refined for
   * Echo's 2026-09-16 review of A.1, and again for D26 slice B).
   *
   * Original bug: this effect scheduled a single `setTimeout` that
   * called `revert()` unconditionally after `POST_CLOSE_DEBOUNCE_MS`,
   * regardless of whether the sign-in had actually succeeded. That's
   * a real race: `auth.controller.ts`'s `req.login()` writes the
   * session cookie server-side and THEN 302s the popup to
   * `/auth/google/callback`, whose own `useEffect` (the thing that
   * posts `oauth-success` to this window) only runs after that page
   * has loaded and hydrated — a ~100–400 ms window. If the user
   * closes the popup inside that window, no `oauth-success` message
   * ever arrives, yet the login already succeeded. The old code would
   * then just revert() after 5s and report "Sign in" even though
   * `corpus_session` has a live row — and the 5s debounce was SHORTER
   * than the 7s safety-net poll interval, so the poll structurally
   * never got a chance to catch it either.
   *
   * Slice B fix: the button no longer owns its own `/me` poll. The
   * provider does. When the popup is observed closed, we call the
   * provider's `refresh()` (which fetches `/me` and broadcasts an
   * `auth-changed` event). When the response lands, `meState` flips
   * one of two ways:
   *  - `signed-in` — the `<AuthSurface>` re-renders, this button
   *    unmounts, the unregister-on-unmount effect below runs and the
   *    pending `refresh()` is harmless.
   *  - `signed-out` — the popup was closed before login completed
   *    (truly a cancel). Fall through to the 5 s debounce revert.
   * No second fetch happens — the work was already done by `refresh`.
   */
  useEffect(() => {
    if (!popupClosed) return;
    if (!processing) return;

    refresh();
  }, [popupClosed, processing, refresh]);

  /**
   * Once `refresh()` resolves (meState has flipped in response to the
   * post-close event), either branch from the effect above has
   * happened. This follow-up effect watches `meState`:
   *  - `signed-in` → the `<AuthSurface>` swap to `<UserMenu>` has
   *    unmounted us (or is about to); nothing to do here. The
   *    unregister-on-unmount path also clears the revert callback so
   *    the provider can't call into a stale closure.
   *  - `signed-out` → real cancel, schedule the 5 s debounce revert.
   *  - `loading` → the refresh is still in flight; wait for the next
   *    render.
   * Splitting across two effects is necessary because the async
   * resolution of `refresh()` and the synchronous state flip are two
   * different React reconciliation events.
   */
  useEffect(() => {
    if (!popupClosed) return;
    if (!processing) return;
    if (meState === 'signed-in') return;

    closeTimerRef.current = window.setTimeout(() => {
      revert();
    }, POST_CLOSE_DEBOUNCE_MS);

    return () => {
      clearCloseTimer();
    };
  }, [popupClosed, processing, meState, revert]);

  /**
   * Cleanup on unmount: close popup if open, clear timers.
   * (Bug 4 — no 60 s timeout to clear; the only `setTimeout` we own is
   * the post-close debounce timer in the effect above. Slice B — no
   * poll interval either; the SignInProvider owns `/me` now.)
   */
  useEffect(() => {
    return () => {
      clearCloseTimer();
      clearCloseWatcher();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, []);

  const label = processing
    ? t(messages, 'topbar.signInProcessing')
    : t(messages, 'topbar.signIn');
  const className =
    `topbar-signin${processing ? ' topbar-signin--processing' : ''}` +
    `${envDisabled ? ' topbar-signin--disabled' : ''}`;

  return (
    <button
      type="button"
      className={className}
      aria-label={t(messages, 'topbar.signInAriaLabel')}
      aria-disabled={envDisabled || processing}
      disabled={envDisabled || processing}
      onClick={handleClick}
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}