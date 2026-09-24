import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArticleHeaderToggle } from '@/components/article/article-shell';
import { t, type Messages } from '@/lib/i18n';
import { ThemeToggle } from './theme-toggle';
import { SearchTrigger } from './search-trigger';
import { NavLinks } from './nav-links';
import { NavProgressBar } from './nav-progress-bar';
import { AuthSurface } from './auth-surface';
import { MobileNavCluster } from './mobile-nav-cluster';
import { homePath } from '@/lib/routes';
import type { Locale } from '@/lib/locales';

/**
 * Site header (header-redesign PR #194):
 *  - Dropped the "START THE COURSE" pill entirely (no desktop, no
 *    mobile). Featured-course routing now lives in the home page
 *    hero on `/[locale]` (the existing `home.ctaCourse` button in
 *    `app/[locale]/page.tsx`) — no D71 needed.
 *  - The mobile hamburger + drawer pair is owned by
 *    `MobileNavCluster`, which is the only client boundary this
 *    header introduces. Everything else (logo, nav links, search,
 *    theme, auth) stays server-rendered; only the cluster crosses
 *    into client scope because it pulls `useSignIn` + dispatches the
 *    `corpus:open-search` window event for the drawer.
 *  - The cluster's open-state is local to it; App Router remounts
 *    this header (and therefore the cluster) on every navigation,
 *    so open-state is implicitly reset to `closed` per spec §4 —
 *    no persisted storage, no URL param, no context provider.
 */
export function SiteHeader({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  return (
    <header className="topbar">
      <NavProgressBar />
      <a
        href="#content"
        className="bg-signal text-ink sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1"
      >
        {t(messages, 'nav.skipToContent')}
      </a>
      <div className="topbar-wrap">
        <ArticleHeaderToggle label={t(messages, 'article.collapseSidebar')} />
        <Link href={homePath(locale)} className="font-mono text-sm font-semibold tracking-meta shrink-0 no-underline">
          <span className="text-display">{t(messages, 'site.nameLead')}</span>
          <span className="text-signal">{t(messages, 'site.nameTail')}</span>
        </Link>
        {/* Hairline divider between the brand wordmark and the primary
            nav. The dispatch read the previous layout as "one run of text"
            because there was zero separation: corpus.web → Home Courses
            Articles flowed at the same baseline with no break. A 1px tall
            rule at the centerline lets the brand terminate clearly without
            adding visible chrome. Hidden on mobile (≤640) where the nav is
            behind the drawer and the brand sits alone. */}
        <span aria-hidden="true" className="topbar-divider" />
        <NavLinks locale={locale} messages={messages} />
        <div className="topbar-tools">
          <SearchTrigger messages={messages} />
          <AuthSurface messages={messages} />
          <span className="topbar-theme-host">
            <ThemeToggle label={t(messages, 'nav.themeToggle')} />
          </span>
          <MobileNavCluster locale={locale} messages={messages} />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ messages }: { messages: Messages }) {
  return (
    <footer className="border-graphite mt-16 border-t">
      <div className="text-muted mx-auto flex max-w-page items-center justify-between gap-4 px-5 py-6 text-sm">
        <span className="meta">{t(messages, 'site.name')}</span>
        <a href={t(messages, 'site.orgUrl')} className="hover:text-display">
          {t(messages, 'site.orgLink')}
        </a>
      </div>
    </footer>
  );
}

export function PageShell({
  children,
  messages,
  bleed = false,
}: {
  children: ReactNode;
  messages: Messages;
  bleed?: boolean;
}) {
  return (
    <>
      {bleed ? (
        <div id="content">{children}</div>
      ) : (
        <div className="mx-auto max-w-page px-5 py-10">
          <div id="content">{children}</div>
        </div>
      )}
      <SiteFooter messages={messages} />
    </>
  );
}
