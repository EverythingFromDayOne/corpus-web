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
import { absoluteUrl, ogImageUrl, OG_IMAGE_ALT, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, SITE_ORIGIN } from '@/lib/site';
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
    title: t(messages, 'home.metaTitle'),
    description: t(messages, 'home.description'),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(messages, 'site.name'),
      title: t(messages, 'home.metaTitle'),
      description: t(messages, 'home.description'),
      locale,
      images: [
        {
          url: ogImageUrl(),
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: OG_IMAGE_ALT,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t(messages, 'home.metaTitle'),
      description: t(messages, 'home.description'),
      images: [ogImageUrl()],
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
        {/* Home hero. Drop film-grain and the redundant
           `bg-signal-dim opacity-25 blur-3xl` JSX bloom div per the
           sydexa-video-driven background spec §2 row for `.ls-hero`
           (PR #131, `prompts/design-spec-2026-08-background.md`):
           the spec keeps both `.ls-hero::before` warm upper-right
           aurora and `.ls-hero::after` cool lower-left aurora — the
           JSX bloom div is one of three layers fighting for the same
           warm-anchor point and reads as visual noise. The new
           `ls-ambient-grid` modifier adds the Rule 3 line-grid at
           the home-hero's spec'd 8% effective opacity (vs 6% on
           listing surfaces). `ls-ambient-glow` is deliberately NOT
           added here — the cool lower-left ::after pseudo IS the
           Rule 2 off-center accent; adding the modifier would
           re-introduce the double-bloom problem Rule 2 excludes. */}
        <section className="ls-hero ls-ambient-grid relative overflow-hidden">
          <div className="ls-wrap relative">
            <p className="meta">{t(messages, 'home.eyebrow')}</p>
            <h1 className="bg-gradient-to-b from-display to-signal bg-clip-text text-transparent">
              {t(messages, 'home.title')}
            </h1>
            <p className="ls-dek relative">{t(messages, 'home.thesis')}</p>
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
          label={t(messages, 'home.dividerCorpora')}
          className="my-8"
        />
        <div className="ls-wrap">
          <CorpusCards locale={locale} corpora={view.corpora} messages={messages} />
          <SectionDivider
            label={t(messages, 'home.dividerAudience')}
            className="my-10"
          />
          <AudienceCards messages={messages} />
          <SectionDivider
            label={t(messages, 'home.dividerEntry')}
            className="my-10"
          />
          <EntryPoints locale={locale} featured={featured} census={view.census} messages={messages} />
          <ReadingConventions messages={messages} />
        </div>
      </div>
    </PageShell>
  );
}
