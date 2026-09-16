'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSignIn } from './sign-in-context';
import type { Messages } from '@/lib/i18n';
import { t } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';

/**
 * D26 sub-slice A — sign-in popup UX (PR #184, original).
 * D26 sub-slice A.1 — follow-up bugfix pass (this file's current state).
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

const POLL_INTERVAL_MS = 7_000;
const POST_CLOSE_DEBOUNCE_MS = 5_000;
const CLOSE_WATCH_INTERVAL_MS = 250;
const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 600;

export function SignInButton({ messages }: Props) {
  const { processing, setProcessing } = useSignIn();
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
  const pollTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closeWatcherRef = useRef<number | null>(null);

  /**
   * `popupClosed` is a React state flag (not a ref) so the post-close
   * debounce effect below can react to the transition. It flips true
   * exactly once per click — at the moment the watcher detects
   * `popup.closed === true`. Bug 2.2 fix: it does NOT flip on a 401 tick.
   */
  const [popupClosed, setPopupClosed] = useState(false);

  function clearPoll() {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }
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
   * (Bug 2 — primary), the post-close-debounce revert path (Bug 2.2
   * fallback), and the slow-poll /me success path (legacy safety net).
   */
  const revert = useCallback(() => {
    clearPoll();
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

  /**
   * Wire up the popup lifecycle:
   *  - open the popup (or fall back to a tab if popups are blocked)
   *  - start a 7 s poll against GET /me as a safety net
   *  - mount a 250 ms watcher that detects the popup's open→closed
   *    transition and stamps `popupClosed` (Bug 2.2 fix)
   *  - if no /me success signal arrives within the 5 s post-close
   *    debounce, revert (close was the user's choice, treat as cancel)
   *
   * Bug 4 — no 60 s blanket force-revert. The popup is allowed to stay
   * open indefinitely as long as the user hasn't closed it.
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
    // We poll the popup's `.closed` flag at 250 ms (faster than the 7 s
    // safety-net /me poll so the user-visible revert feels immediate).
    // Until the transition happens we leave the state alone, so 401s on
    // subsequent /me ticks cannot reset the debounce clock.
    closeWatcherRef.current = window.setInterval(() => {
      if (popup.closed) {
        const watcher = closeWatcherRef.current;
        if (watcher !== null) window.clearInterval(watcher);
        closeWatcherRef.current = null;
        setPopupClosed(true);
      }
    }, CLOSE_WATCH_INTERVAL_MS);

    // Bug 2 — slow (7 s) safety-net /me poll. The primary success signal
    // is the postMessage from the callback page; this poll only matters
    // if that message didn't fire (e.g. user manually navigates the
    // popup to a non-callback URL after writing the cookie somehow).
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/me`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        if (res.ok) {
          revert();
        }
        // 401s deliberately DO NOT stamp the close anchor anymore —
        // Bug 2.2 fix. Only the actual popup close transition does.
      } catch {
        // Network error: keep polling, don't surface anything.
      }
    }, POLL_INTERVAL_MS);
  }

  function handleClick() {
    if (envDisabled || processing) return;
    openAuthPopup();
  }

  /**
   * Post-close-debounce revert watcher (Bug 2.2 fallback). When the
   * popup has been observed closed AND `POST_CLOSE_DEBOUNCE_MS` has
   * elapsed without an `oauth-success` message from the callback page,
   * treat the close as user-cancelled.
   *
   * `revert()` itself sets `setPopupClosed(false)` and
   * `setProcessing(false)` — either of which causes this effect to
   * re-evaluate and no-op. So the message-driven primary revert
   * (Bug 2) naturally cancels any in-flight debounce timer via the
   * `clearCloseTimer()` call inside `revert()`.
   */
  useEffect(() => {
    if (!popupClosed) return;
    if (!processing) return;
    closeTimerRef.current = window.setTimeout(() => {
      revert();
    }, POST_CLOSE_DEBOUNCE_MS);
    return () => {
      clearCloseTimer();
    };
  }, [popupClosed, processing, revert]);

  /**
   * Cleanup on unmount: stop polling, close popup if open, clear timers.
   * (Bug 4 — no 60 s timeout to clear; the only `setTimeout` we own is
   * the post-close debounce timer in the effect above.)
   */
  useEffect(() => {
    return () => {
      clearPoll();
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