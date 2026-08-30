import type { Metadata } from 'next';
import { PageShell } from '@/components/chrome/site-header';
import { AudienceCards } from '@/components/home/audience-cards';
import { CensusReadout, CorpusCards } from '@/components/home/corpus-cards';
import { EntryPoints, ReadingConventions } from '@/components/home/entry-points';
import { JsonLd } from '@/components/json-ld';
import { SectionDivider } from '@/components/section-divider';
import { getCatalogView } from '@/lib/catalog';
import { getMessages, t } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';
import { blogPath, coursePath, homePath } from '@/lib/routes';
import { absoluteUrl, SITE_ORIGIN } from '@/lib/site';
import { notFound } from 'next/navigation';
import '@/components/home/home.css';

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
    <PageShell messages={messages} bleed>
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
      <div className="ls-home">
        <section className="ls-hero">
          <div className="ls-wrap">
            <p className="meta">{t(messages, 'home.eyebrow')}</p>
            <h1>{t(messages, 'home.title')}</h1>
            <p className="ls-dek">{t(messages, 'home.thesis')}</p>
            <CensusReadout census={view.census} messages={messages} />
            <div className="ls-cta">
              {featured ? (
                <a className="ls-btn ls-btn-pri" href={coursePath(locale, featured.slug)}>
                  {t(messages, 'home.ctaCourse')}
                </a>
              ) : null}
              <a className="ls-btn" href={blogPath(locale)}>
                {t(messages, 'home.ctaBrowse')}
              </a>
            </div>
          </div>
        </section>
        <SectionDivider
          label={t(messages, 'article.sectionDividerLabel')}
          className="my-8"
        />
        <div className="ls-wrap">
          <CorpusCards locale={locale} corpora={view.corpora} messages={messages} />
          <AudienceCards messages={messages} />
          <EntryPoints locale={locale} featured={featured} census={view.census} messages={messages} />
          <ReadingConventions messages={messages} />
        </div>
      </div>
    </PageShell>
  );
}
