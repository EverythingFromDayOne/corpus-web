import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ArticleChromeProvider } from '@/components/article/article-shell';
import { SearchDialog } from '@/components/chrome/search-dialog';
import { SignInProvider } from '@/components/chrome/sign-in-context';
import { SiteHeader } from '@/components/chrome/site-header';
import { SiteFooter } from '@/components/chrome/site-footer';
import { getMessages } from '@/lib/i18n';
import { isLocale, LOCALES } from '@/lib/locales';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);

  return (
    // D26 sub-slice A.1 — SignInProvider mounted at the locale-tree root
    // so the sign-in button's in-flight flag (Bug 1 fix) and the
    // postMessage listener (Bug 2 fix) survive `<SiteHeader>` remounts
    // across App Router route changes. Mirrors the `ArticleChromeProvider`
    // precedent in `./apps/web/components/article/article-shell.tsx`.
    // Sibling to ArticleChromeProvider (not nested) — the two providers
    // own disjoint state and don't need to coordinate.
    <SignInProvider>
      <ArticleChromeProvider>
        <SiteHeader locale={locale} messages={messages} />
        {children}
        <SearchDialog messages={messages} />
        <SiteFooter locale={locale} />
      </ArticleChromeProvider>
    </SignInProvider>
  );
}
