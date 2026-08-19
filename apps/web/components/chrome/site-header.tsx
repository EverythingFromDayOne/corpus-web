import type { ReactNode } from 'react';
import { ArticleHeaderToggle } from '@/components/article/article-shell';
import { t, type Messages } from '@/lib/i18n';
import { ThemeToggle } from './theme-toggle';
import { SearchPlaceholder } from './search-placeholder';
import { NavLinks } from './nav-links';
import { homePath } from '@/lib/routes';
import type { Locale } from '@/lib/locales';

export function SiteHeader({ locale, messages }: { locale: Locale; messages: Messages }) {
  return (
    <header className="border-graphite bg-ink/90 sticky top-0 z-50 border-b backdrop-blur-md">
      <a
        href="#content"
        className="bg-signal text-ink sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-1"
      >
        {t(messages, 'nav.skipToContent')}
      </a>
      <div className="mx-auto flex min-h-[var(--tb)] max-w-page flex-wrap items-center gap-4 px-5 py-3">
        <ArticleHeaderToggle label={t(messages, 'article.collapseSidebar')} />
        <a href={homePath(locale)} className="font-mono text-sm font-semibold tracking-meta no-underline">
          <span className="text-display">{t(messages, 'site.nameLead')}</span>
          <span className="text-signal">{t(messages, 'site.nameTail')}</span>
        </a>
        <NavLinks locale={locale} messages={messages} />
        <div className="ml-auto flex items-center gap-3">
          <SearchPlaceholder messages={messages} />
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

export function PageShell({ children, messages }: { children: ReactNode; messages: Messages }) {
  return (
    <>
      <div className="mx-auto max-w-page px-5 py-10">
        <div id="content">{children}</div>
      </div>
      <SiteFooter messages={messages} />
    </>
  );
}
