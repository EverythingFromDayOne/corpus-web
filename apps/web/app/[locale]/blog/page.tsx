import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleIndex } from '@/components/blog/article-index';
import { PageShell } from '@/components/chrome/site-header';
import { JsonLd } from '@/components/json-ld';
import { SectionDivider } from '@/components/section-divider';
import { getCatalogView } from '@/lib/catalog';
import { getMessages, t } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';
import { blogPath } from '@/lib/routes';
import { absoluteUrl, ogImageUrl, OG_IMAGE_ALT, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, SITE_ORIGIN } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = getMessages(locale);
  const url = absoluteUrl(blogPath(locale));
  return {
    title: t(messages, 'blog.title'),
    description: t(messages, 'blog.description'),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(messages, 'site.name'),
      title: t(messages, 'blog.title'),
      description: t(messages, 'blog.description'),
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
      title: t(messages, 'blog.title'),
      description: t(messages, 'blog.description'),
      images: [ogImageUrl()],
    },
  };
}

export default async function BlogIndexPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const url = absoluteUrl(blogPath(locale));

  return (
    <PageShell messages={messages}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: t(messages, 'blog.title'),
          url,
          isPartOf: { '@id': `${SITE_ORIGIN}/#site` },
        }}
      />
      <header>
        <p className="meta">{t(messages, 'breadcrumb.articles')}</p>
        <h1 className="mt-3 text-4xl">{t(messages, 'blog.title')}</h1>
        <p className="mt-4 max-w-[var(--measure-prose)]">{t(messages, 'blog.description')}</p>
      </header>
      <SectionDivider
        label={t(messages, 'article.sectionDividerLabel')}
        className="my-10"
      />
      <ArticleIndex locale={locale} articles={view.articles} messages={messages} />
    </PageShell>
  );
}
