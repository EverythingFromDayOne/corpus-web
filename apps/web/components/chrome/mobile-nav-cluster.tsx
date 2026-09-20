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

import { useId, useRef, useState } from 'react';
import { useSignIn } from './sign-in-context';
import { MobileNavTrigger } from './mobile-nav-trigger';
import { MobileNavDrawer } from './mobile-nav-drawer';
import { t, type Messages } from '@/lib/i18n';
import { apiUrl } from '@/lib/config';
import { THEME_COOKIE } from '@/lib/site';
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogId = useId();
  const { me } = useSignIn();

  const navHrefs = [
    { slug: 'home', href: homePath(locale) },
    { slug: 'courses', href: coursesPath(locale) },
    { slug: 'articles', href: blogPath(locale) },
  ];

  const signOutHref = `${apiUrl}/auth/logout`;
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
      <MobileNavDrawer
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
        onToggleTheme={() => {
          // ThemeToggle owns its own state — for parity with the
          // existing desktop toggle, flip the root attribute +
          // cookie write directly here.
          if (typeof document === 'undefined') return;
          const root = document.documentElement;
          const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          root.setAttribute('data-theme', next);
          document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
        }}
        themeLabel={themeLabel}
        languageLabel={t(messages, 'nav.language')}
      />
    </>
  );
}
