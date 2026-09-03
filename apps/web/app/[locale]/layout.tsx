import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ArticleChromeProvider } from '@/components/article/article-shell';
import { SearchDialog } from '@/components/chrome/search-dialog';
import { SiteHeader } from '@/components/chrome/site-header';
import { SiteFooter } from '@/components/chrome/site-footer';
import { getMessages } from '@/lib/i18n';
import { isLocale, LOCALES } from '@/lib/locales';
import { getCatalogView } from '@/lib/catalog';

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
  const view = await getCatalogView();
  const featured = view.courses[0];

  return (
    <ArticleChromeProvider>
      <SiteHeader
        locale={locale}
        messages={messages}
        featured={featured ? { slug: featured.slug, title: featured.title } : undefined}
      />
      {children}
      <SearchDialog messages={messages} />
      <SiteFooter locale={locale} />
    </ArticleChromeProvider>
  );
}
