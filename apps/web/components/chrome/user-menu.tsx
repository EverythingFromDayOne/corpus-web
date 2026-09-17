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
 * `<a href>` to a future `/api/auth/sign-out` endpoint (slice C).
 * Slicing rationale (see `prompts/session-d26-avatar-logout-b.md` §5):
 *  - the `<a>` is a real browser navigation, not a React handler, so
 *    the server can choose the response shape (currently a 302 to
 *    `/`, eventually a confirmation page). A `<button onClick>` would
 *    require a fetch + a manual reload and is fragile against the
 *    server having set `HttpOnly` (which it has, by design).
 *  - the `<a href>` keeps the dropdown working even if JS fails to
 *    hydrate or the user has NoScript on. The button still works
 *    with JS, too — both paths land at the same URL.
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
 *  - Close on outside click: handled by `<details>`'s native
 *    "click on a summary toggles, click outside does nothing" — and
 *    we close on `Escape` via a `keydown` listener for parity with
 *    the search dialog.
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

  // Esc closes the menu when it's open. The platform already supports
  // toggle-by-click and open-by-Enter/Space on `<summary>` for free,
  // so this effect is the only keyboard handler we need.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (detailsRef.current?.open) detailsRef.current.open = false;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Sign-out link. Slice C will turn this into `POST /auth/sign-out`
  // (CSRF-protected) and `apps/api` will own it; until then this is a
  // plain GET that drops the cookie server-side and 302s to the home
  // page.
  // NB: the api-url centralisation lives in `@/lib/config` (D55's
  // `apiUrl`). The fallback to '' mirrors the rest of the codebase's
  // handling of `NEXT_PUBLIC_API_URL`-unset environments. `apiUrl` is
  // module-scoped (inlined at build time per Next's `NEXT_PUBLIC_*`
  // convention) so re-evaluating `${apiUrl}/auth/sign-out` every render
  // is the same string each time — no memoisation needed.
  const signOutHref = `${apiUrl}/auth/sign-out`;

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
