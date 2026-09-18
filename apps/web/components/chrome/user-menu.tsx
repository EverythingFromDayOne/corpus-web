'use client';

import { useEffect, useRef } from 'react';
import { t, type Messages } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';
import { useSignIn, type MeResponse } from './sign-in-context';

/**
 * D26 sub-slice B — signed-in user surface.
 *
 * Replaces the `<SignInButton>`'s presence inside `<SiteHeader>` once
 * `useSignIn().meState === 'signed-in'`. Renders an avatar button
 * (image if `me.avatarUrl`, initial-letter fallback otherwise) inside
 * a native `<details>` element so the dropdown opens and closes with
 * zero JavaScript beyond what the platform already provides for free.
 *
 * The dropdown lists the user's `name` and `email`, then a plain
 * `<a href>` to the existing `GET /auth/logout` endpoint in
 * `apps/api/src/modules/auth/auth.controller.ts:145` — a live route
 * (PR #179) that destroys the session, clears the cookie, and 303-
 * redirects to the web origin's `/`. The spec at
 * `prompts/session-d26-avatar-logout-b.md` §5 is explicit that this
 * is the correct control and a plain `<a href>` is the contract:
 *  - the `<a>` is a real browser navigation, not a React handler, so
 *    the server controls the response shape (303 redirect to `/`).
 *    A `<button onClick>` would require a fetch + manual reload and
 *    is fragile against the server having set `HttpOnly` (which it
 *    has, by design).
 *  - the `<a href>` keeps the dropdown working even if JS fails to
 *    hydrate or the user has NoScript on. Both paths land at the
 *    same URL.
 *
 * Avatar element: a tiny circle. No new design primitives, no new
 * tokens — the CSS reuses the existing `--color-display` /
 * `--color-graphite` / `--color-muted` palette from `.topbar-signin`.
 *
 * Initial-letter fallback: derived from the first non-whitespace
 * character of `name` (or `email` if `name` is empty). Lower-cased
 * for consistency with how the rest of the topbar letterforms read.
 *
 * Accessibility notes:
 *  - `<summary aria-label>` carries the user-facing name when
 *    available, falling back to the i18n `topbar.signedInAriaLabel`.
 *  - `<details>/<summary>` natively manage focus + keyboard (Enter /
 *    Space), unlike a custom `role="menu"` pair that would need a
 *    custom `aria-expanded` + keydown handler to pass WCAG.
 *  - Close on outside click: a `mousedown` document listener checks
 *    whether the event target is inside the `<details>` ref; if not,
 *    the menu closes. The platform does not provide this for free,
 *    so it lives in a single `useEffect` next to the `Escape`
 *    handler — both share the same ref so the test for "open?" is
 *    one read, not two.
 *  - Avatar `<img>` has `alt={name}` when a name is present, and
 *    `alt` falls back to a generic locale string so screen-readers
 *    say "Huy's avatar" (or "User avatar" if no name).
 */

type Props = {
  messages: Messages;
};

function initialsOf(me: MeResponse | null): string {
  if (!me) return '?';
  const source =
    (me.name ?? me.email ?? '').trim().charAt(0) || '?';
  return source.toUpperCase();
}

export function UserMenu({ messages }: Props) {
  const { me } = useSignIn();
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Esc + click-outside close the menu when it's open. The platform
  // already supports toggle-by-click and open-by-Enter/Space on
  // `<summary>` for free, but `<details>` does NOT close on outside
  // click by itself, so we listen for `mousedown` on the document
  // and close if the target landed outside the `<details>` ref. Using
  // `mousedown` (not `click`) matches the spec — a click that begins
  // outside but ends on the trigger would otherwise leak focus into
  // the menu before closing it. Both listeners share this effect so
  // there's a single subscription / unsubscription pair per mount.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (detailsRef.current?.open) detailsRef.current.open = false;
    }
    function onPointerDown(event: MouseEvent) {
      const root = detailsRef.current;
      if (!root?.open) return;
      const target = event.target;
      if (target instanceof Node && root.contains(target)) return;
      root.open = false;
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  // Sign-out link. The endpoint is the live `GET /auth/logout` route
  // in `apps/api/src/modules/auth/auth.controller.ts:145` — a 303
  // redirect that destroys the session, clears the session cookie,
  // and lands on `${WEB_ORIGIN}/`. The plain `<a href>` here triggers
  // a real navigation, not a React handler, so the server controls
  // the response shape and `HttpOnly` cookies are cleared correctly
  // server-side.
  //
  // NB: the api-url centralisation lives in `@/lib/config` (D55's
  // `apiUrl`). The fallback to '' mirrors the rest of the codebase's
  // handling of `NEXT_PUBLIC_API_URL`-unset environments. `apiUrl` is
  // module-scoped (inlined at build time per Next's `NEXT_PUBLIC_*`
  // convention) so re-evaluating `${apiUrl}/auth/logout` every render
  // is the same string each time — no memoisation needed.
  const signOutHref = `${apiUrl}/auth/logout`;

  const name = me?.name ?? me?.email ?? '';
  const ariaLabel = name
    ? t(messages, 'topbar.signedInAriaLabel', { name })
    : t(messages, 'topbar.signedInAriaLabelFallback');
  const initials = initialsOf(me);
  const avatarUrl = me?.avatarUrl ?? null;
  const email = me?.email ?? null;

  return (
    <details ref={detailsRef} className="user-menu">
      <summary
        className="user-menu-trigger"
        aria-label={ariaLabel}
        aria-haspopup="menu"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={t(messages, 'topbar.avatarFallbackAlt', { name })}
            className="user-menu-trigger-avatar"
            width={28}
            height={28}
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden="true" className="user-menu-trigger-fallback">
            {initials}
          </span>
        )}
      </summary>
      <div role="menu" className="user-menu-list">
        {name ? (
          <div
            role="presentation"
            className="user-menu-list-summary"
            aria-label={t(messages, 'topbar.userMenuSummary', { name })}
          >
            <span className="user-menu-list-name">{name}</span>
            {email ? (
              <span className="user-menu-list-email">{email}</span>
            ) : null}
          </div>
        ) : null}
        <a
          role="menuitem"
          href={signOutHref}
          className="user-menu-list-signout"
        >
          {t(messages, 'topbar.signOutLabel')}
        </a>
      </div>
    </details>
  );
}
