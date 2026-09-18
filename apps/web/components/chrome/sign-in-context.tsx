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
 * (the postMessage success path, `sign-in-button`'s post-close
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
   *  success path and by `sign-in-button`'s post-close watcher.
   *  Pure React-side state setter — no event dispatch, no pub-sub
   *  bus. External surfaces that need to trigger a refresh must call
   *  this directly. */
  refresh: () => void;
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

  return (
    <SignInContext.Provider
      value={{ processing, setProcessing, registerRevert, meState, me, refresh }}
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
