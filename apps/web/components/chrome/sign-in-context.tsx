'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * D26 sub-slice A.1 — sign-in in-flight state hoisted to a Context so it
 * survives a `<SiteHeader>` remount across route changes.
 *
 * Pre-fix, `<SignInButton>` held `processing` in `useState` locally. The
 * button is rendered inside `<SiteHeader>`, which is re-instantiated on
 * every route change because it's a child of the App Router per-segment
 * tree (the layout at `app/[locale]/layout.tsx` re-runs with new params
 * each navigation). Local component state does not survive that remount,
 * so navigating mid-flow reset the button label back to "Sign in" while
 * the popup was still open — UX bug Huy flagged on the Vercel preview
 * of PR #184.
 *
 * The fix mirrors the existing `ArticleChromeProvider` precedent in
 * `apps/web/components/article/article-shell.tsx`: a small
 * `createContext` + `use*` hook pair, with the provider mounted once at
 * the `[locale]/layout.tsx` level (the highest level at which
 * `<SignInButton>` is rendered) and a `use*` hook that throws if used
 * outside the provider so future misuse fails loudly.
 *
 * Scope-of-record (per `prompts/session-d26-signin-popup-ux-a1.md` §1):
 * this context exposes ONLY the boolean-ish state (`processing` and a
 * setter). The popup window reference, the polling interval ref, the
 * fetch logic, and the popup lifecycle (open / poll / close / reset)
 * stay local to the `<SignInButton>` instance that actually called
 * `window.open` — moving them here would break "as long as the popup
 * is open, let it run" (Bug 4's removal of the blanket 60 s timeout)
 * because the popup ref would outlive the click that opened it.
 *
 * The postMessage listener (Bug 2) IS mounted by the provider, not the
 * button, for the same remount-survival reason: the listener has to
 * outlive every `<SignInButton>` instance across the locale tree, and
 * the provider is the one thing that does.
 *
 * D26 sub-slice A.3 (Echo's live click-through of PR #184 caught this):
 * on a successful `oauth-success` postMessage, this provider used to
 * call ONLY `setProcessing(false)` — it had no way to reach into the
 * `<SignInButton>` instance that actually opened the popup and clear
 * ITS local `pollTimerRef` / `closeWatcherRef` / `popupRef`. The button
 * visually updated to "Sign in" (looked correct), but its 7 s `/me`
 * poll kept running indefinitely in the background — before the D26
 * A.3 `main.ts` Passport fix, `/me` always 401'd, so the poll's own
 * `if (res.ok) revert()` success path never fired either, meaning the
 * poll genuinely ran forever until unmount or a full reload. Fix: the
 * button registers its own `revert` callback with the provider via
 * `registerRevert` on mount and unregisters on unmount; the provider
 * calls that registered callback (which owns and clears ALL of the
 * button's local refs) instead of just flipping `processing`. Falls
 * back to `setProcessing(false)` directly if no button happens to be
 * registered (there is currently exactly one `<SignInButton>` mount
 * site — in `site-header.tsx` — so this is a defensive fallback, not
 * an expected path).
 */

/**
 * D26 sub-slice B — `/me` fetch + signed-in state, hoisted to the
 * `<SignInProvider>` so the `<UserMenu>` and `<SignInButton>` swap
 * inside one `<AuthSurface>` client component, keyed off a single
 * source of truth that fetches `GET /me` once per locale-tree mount.
 *
 * Re-fetch is triggered by `refresh()` callers in the React tree
 * (the postMessage success path, the provider's own post-close
 * watcher) — there is no `corpus:auth-changed` window event bus.
 *
 * **History (D58 hotfix 2026-09-18):** slice B initially shipped a
 * `corpus:auth-changed` `CustomEvent` that fired on every `refresh()`
 * and a window listener that called `refresh()` on every event. With
 * no external dispatcher in the codebase, that pair formed a
 * deterministic self-trigger loop (refresh → dispatchEvent →
 * listener → refresh → dispatchEvent …). Huy surfaced it on the
 * Vercel preview as `/me` firing continuously. Both halves removed
 * in this commit; `refresh()` is now pure React-side state. If an
 * external dispatcher is needed later (e.g. a `signOut()` Server
 * Action), it should call `refresh()` directly via an exposed
 * `window.__signIn` escape hatch — not a self-reinforcing event.
 *
 * **D75.c Round 2 (2026-09-23, this commit):** popup close-detection
 * was hoisted from `<SignInButton>` into this provider. Background:
 * the v0.2.0 hotfix on PR #206 (Round 1) made the drawer's popup
 * survive the button's unmount by introducing `onPopupOpened` +
 * `handingOffRef` — the popup handoff intentionally unmounts the
 * button instance in the same React commit as `window.open()` so the
 * drawer can close around the live OAuth popup. The post-close
 * detection (250 ms `popup.closed` poll + 5 s debounce revert) used
 * to live in the button's local state, which is exactly what the
 * handoff destroys. The new path unmounted the button before the
 * close-watcher could fire, leaving the button stuck on
 * "Signing in…" forever when the user cancelled by closing the
 * popup before completing auth. CDP-confirmed on
 * `develop.nxhhuy.tech` 488px viewport (probe
 * `~/.hermes/cache/scratch/verify-cancel-path.mjs`). The provider
 * now owns `watchPopup(popup)` — a 250 ms `popup.closed` poll plus
 * a 5 s debounce revert — independent of which `<SignInButton>`
 * instance (if any) is currently mounted. `<SignInButton>`'s old
 * `closeWatcherRef` / `popupClosed` state / `closeTimerRef` and the
 * two local effects driving refresh + debounce are removed; this
 * provider is the single owner for that responsibility, and the
 * button just calls `watchPopup(popup)` after `setProcessing(true)`.
 */

export type MeState = 'loading' | 'signed-in' | 'signed-out';

/**
 * Mirrors `MeResponse` from `apps/api/src/modules/auth/me.controller.ts`.
 * Re-declared here — `apps/web` does not depend on `apps/api` types
 * (per `.cursor/rules/40-web-nextjs.mdc`), and the generated
 * `@corpus/api-client` does not yet contain a `/me` operation (slice B
 * scope does not include running the OpenAPI generator). The two stay
 * structurally identical because both ends are owned in this repo.
 */
export interface MeResponse {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string | null;
}

/**
 * D75.c Round 2 — close-detection cadence and post-close debounce
 * window for popup-cancel recovery. Both moved here from
 * `<SignInButton>` so they survive the drawer's `onPopupOpened`
 * handoff (which intentionally unmounts the button instance). Values
 * unchanged from the button-local versions to preserve observable
 * behaviour for the topbar's existing non-handoff path, which
 * previously owned the same debounce — see the docstring on the
 * provider for the full rationale.
 */
const CLOSE_WATCH_INTERVAL_MS = 250;
const POST_CLOSE_DEBOUNCE_MS = 5_000;

type SignInContextValue = {
  processing: boolean;
  setProcessing: (next: boolean) => void;
  registerRevert: (fn: (() => void) | null) => void;
  /** Slice B — `signed-out` while `/me` is in-flight or 401; flips
   *  to `signed-in` when `/me` returns 2xx with a real user JSON; a
   *  null `me` always pairs with a non-`signed-in` state. */
  meState: MeState;
  me: MeResponse | null;
  /** Slice B — re-run the `/me` fetch. Called by the postMessage
   *  success path and by this provider's post-close watcher.
   *  Pure React-side state setter — no event dispatch, no pub-sub
   *  bus. External surfaces that need to trigger a refresh must call
   *  this directly. */
  refresh: () => void;
  /**
   * D75.c Round 2 — register a freshly-opened OAuth popup for
   * close-detection at the provider level. Called by
   * `<SignInButton>` immediately after `setProcessing(true)`.
   *
   * The provider polls `popup.closed` at `CLOSE_WATCH_INTERVAL_MS`
   * (250 ms) — independent of any `<SignInButton>` mount state —
   * and on the open→closed transition:
   *
   *   - If `processing` is already `false` (the postMessage-success
   *     path usually wins this race: the callback page posts
   *     `oauth-success` BEFORE closing itself, so the success
   *     handler flips `processing=false` before this provider
   *     observes close), do nothing — race-safe no-op.
   *   - Otherwise, call `refresh()` and, if the response is still
   *     `signed-out` after `POST_CLOSE_DEBOUNCE_MS` (5 s), revert
   *     `processing` to `false`. The debounce window mirrors the
   *     button's old behaviour exactly; only the OWNER of the timer
   *     moved, not its semantics.
   *
   * Only one popup is ever meaningfully open at a time — same
   * invariant the button enforced locally — so a new call clears any
   * prior interval. Passing `null` is a no-op (the popup-blocked
   * branch doesn't open a window, so there is nothing to watch).
   */
  watchPopup: (popup: Window | null) => void;
};

const SignInContext = createContext<SignInContextValue | null>(null);

function getApiUrl(): string {
  // Mirror `apps/web/lib/config.ts`'s `apiUrl` export shape without
  // pulling that module's module-level evaluation into this provider's
  // import graph (this provider is loaded on the server boundary via
  // the locale layout, but `apiUrl` itself only matters on the client
  // — the value is fine to read here because Next inlines public env
  // vars at build time, so `process.env.NEXT_PUBLIC_API_URL ?? ''`
  // evaluates to the same string). Direct read keeps this file's
  // import surface narrow (used only by the slash-slash-me fetch).
  return process.env.NEXT_PUBLIC_API_URL ?? '';
}

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${getApiUrl()}/me`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MeResponse;
    return data;
  } catch {
    return null;
  }
}

export function SignInProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState(false);
  // Holds the currently-mounted `<SignInButton>`'s `revert` callback, so
  // a postMessage success can clean up that button's local timers/popup
  // ref, not just flip the display flag. See A.3 docstring above.
  const revertRef = useRef<(() => void) | null>(null);

  // Slice B — `/me` state. Starts `loading`; flips to `signed-in` if
  // the response is 2xx with a parseable body, `signed-out` otherwise.
  // A second fetch (popup success, manual `signOut()`, defensive after
  // error) is triggered by calling `refresh()`.
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meState, setMeState] = useState<MeState>('loading');

  // D75.c Round 2 — popup close-detection state, hoisted from
  // `<SignInButton>` so the open→closed transition survives the
  // drawer's `onPopupOpened` handoff (which unmounts the button
  // instance). Flips true exactly once per registered popup, at the
  // moment the close-watcher interval detects `popup.closed === true`.
  // Reset to `false` when a new popup is registered via `watchPopup`
  // or when the post-close debounce revert fires (success race or
  // true cancel).
  const [popupObservedClosed, setPopupObservedClosed] = useState(false);
  // Refs backing the close-watcher interval. `closeIntervalRef` holds
  // the active `setInterval` handle (cleared on every new `watchPopup`
  // call — only one popup open at a time — and on provider unmount).
  // `popupRef` is read-only state used purely for diagnostics if
  // needed; the interval closes over `popup` directly via its
  // `setInterval` callback, not via this ref.
  const closeIntervalRef = useRef<number | null>(null);
  // D75.c Round 2 — ref mirror of `processing` so the close-watcher
  // interval can read the CURRENT value at each tick, not the value
  // captured when `watchPopup` was called. This is what makes the
  // `if (!processing) return;` race-safety check work: the success
  // path flips `processing` to `false` (via `setProcessing(false)`
  // in the postMessage handler), and the interval's next tick sees
  // the fresh value. Without the ref mirror the tick would read a
  // stale `true` from the `useCallback` closure and incorrectly
  // schedule a debounce revert for a sign-in that already succeeded.
  // Effect below keeps the mirror in sync after every render.
  const processingRef = useRef(false);

  const registerRevert = useCallback((fn: (() => void) | null) => {
    revertRef.current = fn;
  }, []);

  /**
   * Run one `/me` fetch and store the result. The function is stable
   * (only sets state — no per-call closure over changing inputs).
   *
   * No `corpus:auth-changed` window event is dispatched here —
   * previous slice-B code did, and combined with a window listener
   * that called `refresh()` on each event, that pair was a
   * deterministic self-trigger loop. Sibling components inside the
   * React tree pick up the new state via the `meState`/`me` re-render;
   * non-React callers must call `refresh()` directly.
   *
   * The `mountedRef` guard at the mount `useEffect` below relies on
   * this function being callable more than once without side-effect
   * amplification, but the guard itself prevents the second call from
   * firing — only the *first* invocation per provider lifetime
   * proceeds to the fetch. See that `useEffect` for the rationale.
   */
  const refresh = useCallback(() => {
    let cancelled = false;
    (async () => {
      const next = await fetchMe();
      if (cancelled) return;
      const nextState: Exclude<MeState, 'loading'> =
        next !== null ? 'signed-in' : 'signed-out';
      setMe(next);
      setMeState(nextState);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * D75.c Round 2 — register a freshly-opened OAuth popup for
   * close-detection. See the `watchPopup` field on
   * `SignInContextValue` for the full contract; the body here
   * implements it.
   *
   * Invariants:
   *   - The interval closes over the `popup` argument directly, NOT
   *     via a ref, so a `setInterval`-style late tick after a popup
   *     is closed and replaced never accidentally observes a stale
   *     window. (The interval is also cleared on every new call, so
   *     this is belt-and-braces.)
   *   - The `if (popup.closed) { ... }` check stamps `popupObservedClosed`
   *     exactly once; the interval clears itself in the same tick so
   *     a closed popup never gets polled again.
   *   - The `if (!processingRef.current) return;` short-circuit at the
   *     top of the tick is the race-safety guard: if the postMessage-
   *     success path already flipped `processing` to `false` (because
   *     the callback page posts BEFORE closing itself), this tick is
   *     a no-op. No spurious `refresh()` + no spurious debounce.
   *
   * The pending debounce `setTimeout` (scheduled by the effect below
   * on `signed-out`) is NOT tracked in a separate ref: when the
   * debounce effect's deps change — e.g. `popupObservedClosed`
   * flipping back to `false` from this `watchPopup` call — React
   * runs the previous run's cleanup, which clears the timer. So a
   * new popup-open naturally cancels any in-flight debounce revert
   * without a separate ref.
   */
  const watchPopup = useCallback((popup: Window | null) => {
    if (popup === null) return; // popup-blocked branch; nothing to watch
    // Clear any prior popup's interval — invariant: at most one
    // popup open at a time, same as the button enforced locally.
    if (closeIntervalRef.current !== null) {
      window.clearInterval(closeIntervalRef.current);
      closeIntervalRef.current = null;
    }
    // Reset the close-observed flag so the two post-close effects
    // (refresh + debounce) start fresh. The interval itself starts
    // its first poll below; until it fires `popup.closed === true`,
    // `popupObservedClosed` stays false and the effects stay dormant.
    setPopupObservedClosed(false);
    closeIntervalRef.current = window.setInterval(() => {
      if (!popup.closed) return;
      const handle = closeIntervalRef.current;
      if (handle !== null) {
        window.clearInterval(handle);
        closeIntervalRef.current = null;
      }
      // Race-safety: if the success path already flipped processing
      // to false (e.g. callback page posts oauth-success then closes
      // itself — success race wins), this is a no-op. The post-close
      // effects below only run if popupObservedClosed flips true AND
      // processing is still true; if both are already aligned with
      // "done", nothing happens. `processingRef.current` is read here
      // because the interval closes over `processing` indirectly via
      // this ref — see the `processingRef` declaration for why.
      if (!processingRef.current) return;
      setPopupObservedClosed(true);
    }, CLOSE_WATCH_INTERVAL_MS);
  }, []);

  useEffect(() => {
    /**
     * Bug 2 / 2.1 — primary success signal is `window.postMessage` from
     * `apps/web/app/auth/google/callback/page.tsx`, NOT a 2 s poll.
     * The popup window (same-origin, both are `apps/web`) posts
     * `{ type: 'oauth-success' }` and then closes itself; we revert
     * the button state immediately on receipt — no waiting on the next
     * poll tick. Polling stays only as a slow (7 s) safety net in case
     * the message doesn't fire for some reason.
     *
     * Same-origin check uses `window.location.origin`, not `WEB_ORIGIN`
     * env: the popup is a route inside this same Next.js app, so its
     * origin is by construction identical to ours. Hardcoding the
     * `WEB_ORIGIN` env import here would couple client code to a
     * server-only contract for no benefit.
     *
     * Slice B — on `oauth-success`, also call `refresh()` so the
     * `meState` flips from `loading`/`signed-out` to `signed-in`
     * without waiting for the next layout effect to re-run, and
     * without making `<UserMenu>` poll. Keeps the "one fetch per
     * locale-tree mount" promise from §1 of the slice B prompt.
     */
    function handler(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown } | null;
      if (data === null || typeof data !== 'object') return;
      if (data.type !== 'oauth-success') return;
      // Self-removing after firing once: a second message from a stale
      // popup wouldn't have anything to do (button is already reverted),
      // and we don't want a no-op handler pinned on `window` for the rest
      // of the session. The provider's own cleanup effect also removes it
      // on unmount as a safety net.
      window.removeEventListener('message', handler);
      // A.3 fix: prefer the registered button's full `revert()` (clears
      // its poll/close-watcher/popup refs too) over a bare
      // `setProcessing(false)`, which only fixed the visible label and
      // left the button's background poll running.
      if (revertRef.current) {
        revertRef.current();
      } else {
        setProcessing(false);
      }
      // Slice B — flip `/me` to `signed-in` (or refresh if it
      // already was). The cookie has just been written by the
      // server; a fresh fetch sees it.
      refresh();
    }
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, [refresh]);

  // Slice B — one `/me` fetch per provider mount. The [locale]/layout
  // wraps every locale subtree, so this fires exactly once per locale
  // tree's lifetime — no per-component polling, no per-remount flicker.
  //
  // D58 Phase 2 (Huy-verified, 2026-09-18): under `reactStrictMode:
  // true` (`apps/web/next.config.mjs:7`), the mount-time effect runs
  // TWICE in dev (once at real mount, once at the StrictMode probe)
  // before either commit lands. Naively this would fire `/me` twice
  // back-to-back. The `mountedRef` guard below makes the second
  // invocation a no-op.
  //
  // Important invariants for this guard (do NOT change without
  // re-tracing the loop):
  //
  //   * `mountedRef` is set to `true` AFTER the early-return check,
  //     never reset. Resetting in cleanup would re-arm the flag for
  //     the second probe, defeating the guard.
  //   * StrictMode dev invokes cleanup → mount → effect again; if a
  //     later refactor adds an `AbortController.abort()`-style cleanup
  //     for an in-flight fetch, the FIRST mount's `mountedRef.current
  //     = true` persists across the cleanup, and the probe's `refresh()`
  //     call is the one that's suppressed — exactly the desired shape.
  //   * The `refresh()` callback is `useCallback(..., [])` so its
  //     reference is stable; the effect's deps `[refresh]` therefore
  //     never refires after the StrictMode double-invoke settles.
  //   * This guard makes `/me` fire at most once per SignInProvider
  //     lifetime in dev. In production (`reactStrictMode: false`),
  //     the effect runs once and the guard is a no-op cost.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    refresh();
  }, [refresh]);

  // D75.c Round 2 — keep `processingRef` in sync with `processing`
  // after every render. Effect runs synchronously after the render
  // commits, so a `setProcessing(false)` from the postMessage handler
  // is reflected in the ref by the time the next interval tick (≤250
  // ms later) reads it. Without this sync, the interval would read
  // a stale `true` and incorrectly schedule a debounce revert for a
  // sign-in that already succeeded.
  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  /**
   * D75.c Round 2 — when the close-watcher observes the popup
   * closed AND we're still in `processing` state (i.e. the success
   * race didn't win), kick off a fresh `/me` fetch. The follow-up
   * effect below decides whether `meState === 'signed-in'` (success
   * race) skips the debounce or `meState === 'signed-out'` (true
   * cancel) schedules the 5 s revert.
   *
   * Splitting refresh + debounce into two effects is necessary
   * because the async `/me` resolution and the synchronous
   * `meState` flip are two different React reconciliation events —
   * collapsing them into one would race against the fetch landing.
   *
   * Mirror of the original button-local effect (now removed); the
   * OWNER moved here, not the behaviour.
   */
  useEffect(() => {
    if (!popupObservedClosed) return;
    if (!processing) return;
    refresh();
  }, [popupObservedClosed, processing, refresh]);

  /**
   * D75.c Round 2 — once `refresh()` resolves from the effect above
   * and `meState` has flipped, schedule the 5 s post-close debounce
   * revert UNLESS the response was `signed-in`. If `signed-in`, the
   * `<AuthSurface>` swap to `<UserMenu>` has unmounted (or is
   * unmounting) `<SignInButton>`; the unregister-on-unmount path also
   * clears the button's registered revert callback so nothing can
   * call into a stale closure. We still reset `popupObservedClosed`
   * here so the interval/state doesn't linger for the next click.
   *
   * If the response is `signed-out` (true cancel), schedule the
   * debounce. When it fires, flip `processing` back to `false` and
   * clear the observation flag so the next click starts fresh.
   *
   * `loading` means the fetch is still in flight; this effect
   * re-fires on the next `meState` change with no harm done — the
   * `if (!popupObservedClosed || !processing) return;` guards keep
   * it dormant until the post-close conditions hold.
   *
   * Returning `clearTimeout` from this effect handles three re-entry
   * paths for free: a new `watchPopup` call flips
   * `popupObservedClosed → false` (cleanup runs); a `meState` flip to
   * `signed-in` triggers an early reset+return (cleanup runs); and
   * provider unmount runs the cleanup too. So no separate ref to
   * track the pending timeout is needed.
   */
  useEffect(() => {
    if (!popupObservedClosed) return;
    if (!processing) return;
    if (meState === 'signed-in') {
      // Success race won after the close observation — reset state
      // and skip the debounce. `<AuthSurface>` is about to (or has)
      // unmount the button; clearing the flag keeps `meState` /
      // `processing` in sync for the next click.
      setPopupObservedClosed(false);
      return;
    }
    const handle = window.setTimeout(() => {
      setPopupObservedClosed(false);
      setProcessing(false);
    }, POST_CLOSE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
    };
  }, [popupObservedClosed, processing, meState, setProcessing]);

  // D75.c Round 2 — clear the close-watcher interval on provider
  // unmount as a safety net. In practice the provider lives for the
  // entire locale-tree lifetime (mounted at `[locale]/layout.tsx`,
  // see the D26 A.1 docstring at the top of this file), so unmount
  // only fires on a full app teardown — but a leftover interval
  // across a hot-reload would silently leak, and `setInterval` IDs
  // survive `strictMode` dev double-mount probes if not cleared.
  useEffect(() => {
    return () => {
      if (closeIntervalRef.current !== null) {
        window.clearInterval(closeIntervalRef.current);
        closeIntervalRef.current = null;
      }
    };
  }, []);

  return (
    <SignInContext.Provider
      value={{
        processing,
        setProcessing,
        registerRevert,
        meState,
        me,
        refresh,
        watchPopup,
      }}
    >
      {children}
    </SignInContext.Provider>
  );
}

export function useSignIn() {
  const ctx = useContext(SignInContext);
  if (!ctx) throw new Error('SignInProvider missing');
  return ctx;
}

// Exported for chrome-flow smoke testing — see
// `apps/web/test/chrome/sign-in-once-per-mount.test.ts`. The export
// is read-only by construction: callers can invoke `fetchMe()` but
// cannot swap the implementation. Mount-time useEffect cycling and
// StrictMode probes are exercised by manual Vercel click-through
// (D58 row (b) on PR #185 follow-up 4), not by this harness.
export { fetchMe };
