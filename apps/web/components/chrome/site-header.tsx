import type { ReactNode } from 'react';
import { ArticleHeaderToggle } from '@/components/article/article-shell';
import { t, type Messages } from '@/lib/i18n';
import { ThemeToggle } from './theme-toggle';
import { SearchTrigger } from './search-trigger';
import { NavLinks } from './nav-links';
import { NavProgressBar } from './nav-progress-bar';
import { homePath } from '@/lib/routes';
import type { Locale } from '@/lib/locales';

export function SiteHeader({ locale, messages }: { locale: Locale; messages: Messages }) {
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
        <a href={homePath(locale)} className="font-mono text-sm font-semibold tracking-meta shrink-0 no-underline">
          <span className="text-display">{t(messages, 'site.nameLead')}</span>
          <span className="text-signal">{t(messages, 'site.nameTail')}</span>
        </a>
        <NavLinks locale={locale} messages={messages} />
        <div className="topbar-tools">
          <SearchTrigger messages={messages} />
          <ThemeToggle label={t(messages, 'nav.themeToggle')} />
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
