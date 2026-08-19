import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/site-header';
import { ConceptGraphTeaser } from '@/components/home/concept-graph-teaser';
import { CorpusCards, DemoLabsPlaceholder, DemoPlaceholder } from '@/components/home/corpus-cards';
import { EntryPoints, ReadingConventions } from '@/components/home/entry-points';
import { JsonLd } from '@/components/json-ld';
import { getCatalogView } from '@/lib/catalog';
import { getMessages, t } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';
import { homePath } from '@/lib/routes';
import { absoluteUrl, SITE_ORIGIN } from '@/lib/site';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = getMessages(locale);
  const url = absoluteUrl(homePath(locale));
  return {
    title: t(messages, 'home.title'),
    description: t(messages, 'home.description'),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(messages, 'site.name'),
      title: t(messages, 'home.title'),
      description: t(messages, 'home.description'),
      locale,
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const featured = view.courses[0];

  return (
    <PageShell messages={messages}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              '@id': `${SITE_ORIGIN}/#site`,
              name: t(messages, 'site.name'),
              url: SITE_ORIGIN,
              inLanguage: locale,
              publisher: { '@id': `${SITE_ORIGIN}/#org` },
            },
            {
              '@type': 'Organization',
              '@id': `${SITE_ORIGIN}/#org`,
              name: t(messages, 'site.orgName'),
              url: t(messages, 'site.orgUrl'),
            },
          ],
        }}
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <header>
          <p className="meta">{t(messages, 'home.eyebrow')}</p>
          <h1 className="mt-3 text-4xl">{t(messages, 'home.title')}</h1>
          <p className="mt-6 max-w-[var(--measure-prose)] text-lg">{t(messages, 'home.thesis')}</p>
        </header>
        <DemoPlaceholder messages={messages} />
      </div>
      <div className="mt-16 space-y-16">
        <CorpusCards locale={locale} corpora={view.corpora} messages={messages} />
        <DemoLabsPlaceholder messages={messages} />
        <ConceptGraphTeaser graph={view.graph} messages={messages} />
        <EntryPoints locale={locale} featured={featured} messages={messages} />
        <ReadingConventions messages={messages} />
      </div>
    </PageShell>
  );
}
