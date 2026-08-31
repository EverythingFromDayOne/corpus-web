import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ArticleChromeProvider } from '@/components/article/article-shell';
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
    <ArticleChromeProvider>
      <SiteHeader locale={locale} messages={messages} />
      {children}
      <SiteFooter locale={locale} />
    </ArticleChromeProvider>
  );
}
