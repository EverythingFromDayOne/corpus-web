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

type SignInContextValue = {
  processing: boolean;
  setProcessing: (next: boolean) => void;
  registerRevert: (fn: (() => void) | null) => void;
};

const SignInContext = createContext<SignInContextValue | null>(null);

export function SignInProvider({ children }: { children: ReactNode }) {
  const [processing, setProcessing] = useState(false);
  // Holds the currently-mounted `<SignInButton>`'s `revert` callback, so
  // a postMessage success can clean up that button's local timers/popup
  // ref, not just flip the display flag. See A.3 docstring above.
  const revertRef = useRef<(() => void) | null>(null);

  const registerRevert = useCallback((fn: (() => void) | null) => {
    revertRef.current = fn;
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
    }
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  return (
    <SignInContext.Provider value={{ processing, setProcessing, registerRevert }}>
      {children}
    </SignInContext.Provider>
  );
}

export function useSignIn() {
  const ctx = useContext(SignInContext);
  if (!ctx) throw new Error('SignInProvider missing');
  return ctx;
}
