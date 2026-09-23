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
 *   8. Cancel-path stuck after Round 1 handoff (D75.c Round 2 fix —
 *      Huy caught via independent CDP verification). The Round 1
 *      fix (Bug "drawer popup self-destruct") intentionally made the
 *      popup survive the button's unmount via `onPopupOpened` +
 *      `handingOffRef` — that's the only way the OAuth round-trip
 *      can complete with a drawer still around the live popup. But
 *      the old close-watcher (`closeWatcherRef` + `popupClosed` state
 *      + the two local effects driving refresh + 5 s debounce revert)
 *      lived inside the `<SignInButton>` component instance. After
 *      handoff, the button unmounts in the same React commit; the
 *      interval was cleared, the state setters became no-ops, and
 *      the `registerRevert(null)` cleanup meant the provider's
 *      success path also couldn't reach back into a now-dead
 *      closure. The result: the popup was live long enough for a
 *      real user cancel (manual close before completing OAuth) to
 *      matter, but the cancel path had no recovery — the button
 *      stayed stuck on "Signing in…" indefinitely. The fix is a
 *      OWNER move, not a behaviour change: popup close-detection
 *      now lives in `SignInContext.watchPopup(popup)` — the same
 *      250 ms poll + 5 s debounce revert the button used to own,
 *      but with the provider (always mounted at the locale tree)
 *      as the single owner. `<SignInButton>` calls
 *      `watchPopup(popup)` immediately after `setProcessing(true)`;
 *      the local `closeWatcherRef`, `popupClosed` state,
 *      `closeTimerRef`, the two post-close effects, and the
 *      `clearCloseTimer` / `clearCloseWatcher` helpers are removed
 *      entirely. Desktop topbar sign-in (no handoff) is unaffected
 *      — the provider's watcher fires identically for it.
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
  /**
   * v0.2.0 hotfix — drawer sign-in popup self-destruct (PR #206).
   *
   * Optional callback invoked ONLY after `window.open()` returned a
   * non-null popup window and the popup has been handed off to the
   * supplied refs. Intended surface for a wrapper whose own `onClick`
   * would otherwise close the drawer in the SAME synthetic event that
   * just opened the popup (mobile-nav-drawer.tsx:344 wraps the reused
   * `<SignInButton>` exactly that way). The flow is:
   *
   *   1. `handleClick` calls `event.stopPropagation()` so the wrapper
   *      never sees a successful popup-open click (envDisabled no-op
   *      clicks still bubble, which is what we want).
   *   2. `openAuthPopup` opens the window, sets `popupRef` /
   *      `setProcessing(true)`, then sets `handingOffRef.current = true`
   *      and synchronously calls `onPopupOpened?.()`. The wrapper's
   *      state flip (`setOpen(false)`) is batched into the same React
   *      commit, so `<SignInButton>` unmounts immediately.
   *   3. The unmount-cleanup effect (Bug 4-era "close any stale popup
   *      on unmount" code) reads `handingOffRef.current` and SKIPS
   *      `popupRef.current.close()` when it's true — otherwise it
   *      would close the popup it itself just opened. See the docstring
   *      in `mobile-nav-drawer.tsx` and the FE-2 follow-up notes in
   *      `~/.hermes/handoffs/v0.2.0/drawer-signin-bug-measurement.md`.
   *
   * Desktop topbar usage (`site-header.tsx` → `AuthSurface` →
   * `<SignInButton>`, no wrapper) leaves this prop `undefined`, so
   * none of the new logic activates.
   */
  onPopupOpened?: () => void;
};

const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 600;

// D26 slice B — the 7_000 ms safety-net /me `setInterval` previously
// living in `openAuthPopup` was removed. The SignInProvider now owns
// the authoritative `/me` fetch (one per locale-tree mount, plus on
// internal call sites like the postMessage success handler and the
// new Round 2 close-watcher), so the button no longer needs its own
// background poll. The success path is the `oauth-success` postMessage
// (handled in `sign-in-context.tsx`, which calls our registered
// `revert`); the cancel-path debounce revert runs from the provider's
// own effects — see `watchPopup` below.

// D75.c Round 2 — popup close-detection is OWNED by `SignInContext`
// (`watchPopup(popup)`) rather than this button. The 250 ms poll and
// the 5 s post-close debounce revert moved to the provider so they
// survive the drawer's `onPopupOpened` handoff (which unmounts this
// button instance in the same React commit as `window.open()`).
// `POST_CLOSE_DEBOUNCE_MS` and `CLOSE_WATCH_INTERVAL_MS` are now
// defined in `sign-in-context.tsx`; this button just calls
// `watchPopup(popup)` after `setProcessing(true)`.

/**
 * D75 Round 3 (regression-test extraction) — pure decision for what
 * `handleClick` / `openAuthPopup` should do given a `window.open()`
 * result. Pulled out as a hook-free, exported function so the
 * popup-blocked branch has unit-test coverage that does not require
 * a DOM renderer (see `apps/web/test/chrome/sign-in-popup-recovery.test.ts`).
 *
 * Contract (must match the original inlined branching in `openAuthPopup`):
 *   - `window.open` returned `null` (browser blocked the popup, e.g.
 *     Chrome's built-in blocker or a user-installed popup blocker
 *     extension): `processing` MUST stay `false` (so the user can
 *     retry), and `popupBlocked` MUST flip `true` (so the inline
 *     "Sign in blocked" message renders under the button).
 *   - `window.open` returned a `Window` (success): `processing` MUST
 *     flip `true` (the button label switches to "Signing in…"), and
 *     `popupBlocked` MUST reset to `false` (so any stale message from
 *     a previous blocked click does not linger while a real popup is
 *     open in front of the user).
 *
 * This is the ONLY place this decision is made; `openAuthPopup`
 * consults it instead of inlining the `if/else`. Per the dispatch's
 * "drive the real exported handler, not a re-implementation" bar.
 */
export function resolvePopupOpenOutcome(openResult: Window | null): {
  processing: boolean;
  popupBlocked: boolean;
} {
  if (openResult === null) {
    return { processing: false, popupBlocked: true };
  }
  return { processing: true, popupBlocked: false };
}

export function SignInButton({ messages, onPopupOpened }: Props) {
  // D75.c Round 2 — `watchPopup` is now the close-detection entry
  // point. The 250 ms poll and 5 s debounce live in `SignInContext`;
  // this button just hands the freshly-opened popup to the provider.
  // `meState` is no longer read here either — the provider watches
  // it on this button's behalf to decide whether the post-close
  // debounce fires or is short-circuited (success race).
  const { processing, setProcessing, registerRevert, watchPopup } = useSignIn();
  // D55 canonical surface: apiUrl falls back to '' when
  // NEXT_PUBLIC_API_URL is unset, which makes authPath literally
  // '/auth/google' — the envDisabled guard below relies on that exact
  // string, so the fallback must go through the shared `apiUrl` module
  // (see `@/lib/config`) rather than reading `process.env` directly here.
  const authPath = `${apiUrl}/auth/google`;
  const envDisabled = authPath === '/auth/google';

  // Helper: append `?returnTo=${window.location.origin}` so after the
  // OAuth round-trip the API redirects the popup back to the correct
  // callback host (FE-1 step 4). Mirrors the same plumbing on the
  // two sign-out sites (UserMenu and MobileNavCluster). Only callable
  // on the client — the popup only opens in response to a click.
  function buildAuthUrl(base: string): string {
    return `${base}?returnTo=${encodeURIComponent(window.location.origin)}`;
  }

  // Popup-specific state stays LOCAL (spec §1: only the boolean-ish
  // display flag is hoisted). These refs describe a single open popup;
  // they must not outlive the click that opened it, or the message-driven
  // revert path (Bug 2) would have no popup handle to close.
  //
  // D75.c Round 2 — `closeWatcherRef`, `closeTimerRef`, and the
  // `popupClosed` state were removed; the provider's `watchPopup`
  // owns the 250 ms poll + 5 s debounce revert instead. This button
  // only needs `popupRef` so its unmount-cleanup effect (or its
  // registered `revert` callback invoked by the provider's
  // postMessage handler) can still close a live popup if needed.
  const popupRef = useRef<Window | null>(null);
  /**
   * v0.2.0 hotfix — drawer sign-in popup self-destruct (PR #206).
   *
   * Set to `true` SYNCHRONOUSLY before `onPopupOpened?.()` is invoked,
   * telling the unmount-cleanup effect that the popup is being handed
   * off to a wrapping owner (the drawer's `onClose`) which is about to
   * unmount THIS button instance. Without this flag the cleanup effect
   * would treat the just-opened popup as a stale one and immediately
   * close it — destroying the OAuth round-trip 38 ms after creation
   * (measured via CDP `Target.targetDestroyed` on the dispatching
   * session's reproduce). See the `onPopupOpened` prop docstring for
   * the full flow. Never reset; the ref is component-instance-scoped
   * and the unmount-cleanup effect fires at most once per instance.
   */
  const handingOffRef = useRef(false);

  /**
   * v0.2.0 hotfix (PR #206) — stuck "Signing in…" must have an exit.
   *
   * `popupBlocked` flips true when `window.open()` returns null (the
   * browser blocked the popup, e.g. Chrome's built-in blocker when
   * not invoked from a trusted user gesture, or the user's popup
   * blocker extension). Without this signal the click is silently
   * swallowed — `processing` was never set in the null branch, so the
   * button stays interactive, but the user has no idea WHY their
   * click did nothing. Auto-cleared after 6 s by the effect below so
   * a stale message doesn't linger. Independent of Fix 1/1b: even with
   * the wrapper fix, a popup-blocked click is still a click with no
   * outcome, and the user needs feedback.
   */
  const [popupBlocked, setPopupBlocked] = useState(false);

  /**
   * Reset all local state to "idle" and tell the context the button is
   * no longer in flight. Called from the message-driven revert path
   * (Bug 2 — primary, handled in `sign-in-context.tsx`'s
   * postMessage listener which calls our registered `revert`).
   *
   * D75.c Round 2 — this body no longer touches `closeWatcherRef` /
   * `closeTimerRef` / `popupClosed`; those responsibilities moved to
   * `SignInContext.watchPopup`. The only state this callback still
   * owns locally is `popupRef` (for closing a stale popup if the
   * success path fires before the popup closes itself) and
   * `popupBlocked` (clear it so a stale inline message doesn't
   * linger after a successful sign-in).
   */
  const revert = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    setPopupBlocked(false);
    setProcessing(false);
    // Stable across renders: closes only over refs (stable identity by
    // definition) and the `setProcessing` setter from `useSignIn()`,
    // which — like any `useState` setter — has a stable identity for the
    // lifetime of the component. `useCallback` here lets the
    // `registerRevert` effect below list `revert` as a dependency and
    // satisfy `react-hooks/exhaustive-deps` without an eslint-disable.
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
   *  - hand the popup reference to `SignInContext.watchPopup(popup)`
   *    so close-detection survives this button's unmount (Round 1
   *    draws the popup handoff for `onPopupOpened`; Round 2 hoists
   *    close-detection to the provider for the same remount-survival
   *    reason)
   *  - if a wrapper is mounted (`onPopupOpened` prop), set the
   *    handoff flag and synchronously invoke the wrapper's close —
   *    the wrapper's state update batches with this function's
   *    return, so this button unmounts immediately after `window.open`
   *    returned. The provider's interval survives that unmount and
   *    keeps polling `popup.closed` until the OAuth round-trip
   *    resolves one way or the other.
   *
   * Bug 4 — no 60 s blanket force-revert. The popup is allowed to stay
   * open indefinitely as long as the user hasn't closed it.
   *
   * D75.c Round 2 — the 7 s `/me` safety-net poll that used to live
   * here is gone; the SignInProvider owns `/me` and exposes
   * `refresh()` for re-fetch (called once per locale-tree mount, and
   * on the close-watcher → debounce revert path described in
   * `sign-in-context.tsx`). This function's only async work is
   * `window.open()`.
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

    const popup = window.open(buildAuthUrl(authPath), 'google-oauth', features);
    // D75 Round 3 — consult the extracted decision function for the
    // boolean state to apply after `window.open()`. The function is
    // the ONLY place this branching lives; `openAuthPopup` itself only
    // forwards the result to its setters and to `watchPopup`. Same
    // observable behaviour as the prior inlined `if/else`, just
    // unit-testable. See `resolvePopupOpenOutcome` docstring above.
    const outcome = resolvePopupOpenOutcome(popup);
    setProcessing(outcome.processing);
    setPopupBlocked(outcome.popupBlocked);
    if (!popup) {
      // Popup blocked (browser built-in or user-installed popup blocker).
      // `processing` was never set in this branch (the brief's Fix 2
      // confirmation), so there is no stuck-state to revert — but the
      // click was a no-op from the user's perspective. Surface that
      // with `popupBlocked`, which renders an inline message under the
      // button (visually connected, not a toast) and auto-clears
      // after 6 s. v0.2.0 hotfix (PR #206).
      return;
    }
    popupRef.current = popup;

    // D75.c Round 2 — hand the freshly-opened popup off to the
    // provider, which owns the 250 ms `popup.closed` poll and the
    // 5 s post-close debounce revert. `watchPopup` survives this
    // button's unmount (the drawer's `onPopupOpened` callback below
    // triggers it), so the cancel-by-manual-close path can still
    // recover the button label after the user dismisses the popup
    // without completing OAuth. The button's own local close-watcher
    // (`closeWatcherRef` + `popupClosed` state) was removed because
    // it died with the button instance during handoff — see the
    // file-level docstring Bug 8 for the full reasoning.
    watchPopup(popup);

    // v0.2.0 hotfix (PR #206) — drawer sign-in popup self-destruct.
    // If a wrapping owner (the drawer's `onClose`) needs to react to
    // "popup successfully opened", set the handoff flag FIRST and only
    // then invoke the callback. The flag must be set synchronously
    // BEFORE the callback fires because the callback's state update
    // (`setOpen(false)`) is batched into the same React commit, which
    // triggers this button instance's unmount-cleanup effect to run
    // immediately after this function returns. Without the flag, that
    // cleanup would close `popupRef.current` — the popup we just
    // opened — destroying the OAuth round-trip 38 ms after creation.
    if (onPopupOpened) {
      handingOffRef.current = true;
      onPopupOpened();
    }
  }

  function handleClick(event: React.MouseEvent) {
    // v0.2.0 hotfix (PR #206) — drawer sign-in popup self-destruct.
    // Two envDisabled / already-processing clicks: leave the event alone
    // so the wrapper's `onClick={onClose}` fires (drawer closes, no
    // popup ever opened — that path is correct as-is). One real
    // popup-open click: stopPropagation so the wrapper does NOT also
    // close the drawer in the same commit. The drawer is then closed
    // explicitly via the `onPopupOpened` handoff inside `openAuthPopup`,
    // which also sets `handingOffRef` so the unmount-cleanup effect
    // preserves the just-opened popup.
    if (envDisabled || processing) return;
    event.stopPropagation();
    openAuthPopup();
  }

  // D75.c Round 2 — the two effects below (post-close `refresh()` +
  // 5 s debounce revert) previously drove popup-close recovery from
  // inside this button. They were removed because the drawer's
  // `onPopupOpened` handoff unmounts this button instance in the
  // same React commit as `window.open()`, so any locally-owned
  // interval, ref, or state setter becomes a no-op the moment the
  // user closes the popup. Both effects' responsibilities now live
  // in `SignInContext` (`sign-in-context.tsx`, the
  // `popupObservedClosed` state + the two mirror effects) — the
  // provider is always mounted at the locale tree, so close
  // detection survives every button instance. The desktop topbar's
  // existing non-handoff path is unaffected: the button there
  // unmounts only on route change (after the A.2 `next/link`
  // migration), and `popups.close` is handled either by the
  // postMessage success path or by the new provider-owned watcher.

  /**
   * Auto-clear `popupBlocked` after 6 s so the message doesn't linger
   * as a stale banner once the user has either re-clicked successfully
   * or navigated away. The 6 s window matches the user's plausible
   * "I should allow popups for this site and click again" attention
   * span — long enough to read and act, short enough to not feel like
   * a permanent sticky error. v0.2.0 hotfix (PR #206).
   */
  useEffect(() => {
    if (!popupBlocked) return;
    const timer = window.setTimeout(() => setPopupBlocked(false), 6_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [popupBlocked]);

  /**
   * Cleanup on unmount: close popup if open.
   *
   * D75.c Round 2 — the previous `clearCloseTimer()` /
   * `clearCloseWatcher()` calls were removed: those refs are gone.
   * The provider's `watchPopup` interval persists past this button's
   * unmount, by design — that's what makes the cancel path recover
   * after a drawer handoff. If this button unmounts for a reason
   * OTHER than the popup handoff (e.g. the user clicks sign-out from
   * another menu, or `AuthSurface` swaps to `<UserMenu>` because the
   * postMessage success landed first), closing the popup here is the
   * right behaviour: the popup is now stale.
   *
   * v0.2.0 hotfix (PR #206) — drawer sign-in popup self-destruct.
   * Skip the popup-close when `handingOffRef.current` is set: that's
   * the signal that the popup was JUST opened by this instance and is
   * intentionally being handed off to a wrapping owner (drawer's
   * `onClose`) which is about to unmount this button. Closing it here
   * would defeat the entire handoff. See the `onPopupOpened` prop
   * docstring for the full flow. Desktop topbar usage leaves
   * `handingOffRef.current === false` for the entire button lifetime,
   * so this guard is a no-op there — the unmount-cleanup still closes
   * the popup on a route change, which is the original and still-
   * correct behaviour (the user navigated away mid-sign-in, the popup
   * is now stale).
   */
  useEffect(() => {
    return () => {
      if (
        !handingOffRef.current &&
        popupRef.current &&
        !popupRef.current.closed
      ) {
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
    // Wrap the button + optional popup-blocked message in a single
    // <span> so consumers that render <SignInButton> as a direct
    // child of a flex/grid parent (e.g. <AuthSurface> inside
    // `.topbar-tools` in site-header.tsx) still see exactly ONE
    // layout child per SignInButton instance. The wrapper is
    // display: inline (default for <span>) so it takes no width
    // beyond its children; the popup-blocked message sits inline-
    // block below it via the flex/column layout on the wrapper.
    <span className="topbar-signin-host">
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
      {/*
        Popup-blocked inline message. Rendered as a sibling of the
        button (NOT inside it) so screen readers can announce the
        status independently and so the user can select the text.
        `aria-live="polite"` lets the SR interrupt its current read
        only when the message appears, never on the (more frequent)
        clear. `role="status"` reinforces the implicit status role so
        the announcement is consistent across SR vendors. v0.2.0
        hotfix (PR #206).
      */}
      {popupBlocked ? (
        <span
          className="topbar-signin-popup-blocked"
          role="status"
          aria-live="polite"
        >
          {t(messages, 'topbar.signInPopupBlocked')}
        </span>
      ) : null}
    </span>
  );
}
