'use client';

/**
 * Mobile navigation cluster (client boundary).
 *
 * Thin client wrapper that owns the open/closed state for the
 * hamburger-trigger + drawer pair. Kept separate from <SiteHeader>
 * so the rest of the header (logo, nav links, search/theme/auth
 * controls) stays server-rendered. Only this cluster crosses the
 * client boundary — it pulls in `useSignIn` for the signed-in
 * account row + the `corpus:open-search` event bridge into
 * <SearchDialog>, both of which already require client scope.
 *
 * State machine (matches header-redesign spec §4):
 *   - `closed` ↔ `opened`, local to this component
 *   - Route changes remount <SiteHeader> (and therefore this cluster)
 *     in the App Router, so the open-state is implicitly reset to
 *     `closed` on every navigation — no persisted storage, no URL
 *     param, no context provider.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSignIn } from './sign-in-context';
import { MobileNavTrigger } from './mobile-nav-trigger';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { t, type Messages } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';
import { homePath, coursesPath, blogPath } from '@/lib/routes';
import type { Locale } from '@/lib/locales';

export function MobileNavCluster({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();
  const { me } = useSignIn();

  // Drawer is portaled to document.body so it escapes the .topbar
  // containing block created by `backdrop-filter: blur(12px)` on
  // `.topbar` (globals.css line 133). Without the portal, `position:
  // fixed; inset: 0` resolves against the topbar's box instead of
  // the viewport — the backdrop button then inherits the topbar
  // height (~57px) and only the header strip is clickable to close.
  // The trigger stays in the topbar; only the drawer teleports.
  useEffect(() => {
    setMounted(true);
  }, []);

  const navHrefs = [
    { slug: 'home', href: homePath(locale) },
    { slug: 'courses', href: coursesPath(locale) },
    { slug: 'articles', href: blogPath(locale) },
  ];

  // Sign-out href for the drawer. Pattern mirrors UserMenu (FE-1 step 4
  // — `?returnTo=${window.location.origin}` so post-logout lands on
  // the same origin instead of the first WEB_ORIGIN entry). Computed
  // post-mount because `window` is not available at SSR time; BE-1's
  // Referer fallback covers the gap if the user clicks before
  // hydration.
  const [signOutHref, setSignOutHref] = useState(`${apiUrl}/auth/logout`);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSignOutHref(
      `${apiUrl}/auth/logout?returnTo=${encodeURIComponent(window.location.origin)}`,
    );
  }, []);
  const themeLabel = t(messages, 'nav.themeToggle');

  return (
    <>
      <MobileNavTrigger
        ref={triggerRef}
        messages={messages}
        open={open}
        onToggle={() => setOpen((v) => !v)}
        controlsId={dialogId}
      />
      {mounted
        ? createPortal(
            <MobileNavDrawer
              id={dialogId}
              messages={messages}
              open={open}
              onClose={() => setOpen(false)}
              triggerRef={triggerRef}
              navHrefs={navHrefs}
              signedInName={me?.name ?? undefined}
              signedInEmail={me?.email ?? undefined}
              signOutHref={signOutHref}
              onOpenSearch={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('corpus:open-search'));
                }
              }}
              themeLabel={themeLabel}
              languageLabel={t(messages, 'nav.language')}
            />,
            document.body
          )
        : null}
    </>
  );
}
