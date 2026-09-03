import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ArticleView, corpusBreadcrumb } from '@/components/article/article-view';
import '@/components/article/blog-content.css';
import { JsonLd } from '@/components/json-ld';
import { LessonSkeleton } from '@/components/lesson-skeleton';
import {
  conceptNeighbors,
  getArticle,
  getCatalogView,
} from '@/lib/catalog';
import { readArticleMarkdown } from '@/lib/article-source';
import { getMessages, t } from '@/lib/i18n';
import { isLocale, LOCALES } from '@/lib/locales';
import { isRepoId } from '@/lib/repos';
import { articlePath, blogPath } from '@/lib/routes';
import { absoluteUrl, ogImageUrl, OG_IMAGE_ALT, OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT, SITE_ORIGIN } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string; corpus: string; slug: string }>;
};

export async function generateStaticParams() {
  const view = await getCatalogView();
  return view.articles.flatMap((article) =>
    LOCALES.map((locale) => ({
      locale,
      corpus: article.repo,
      slug: article.articleId,
    })),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, corpus, slug } = await params;
  if (!isLocale(locale) || !isRepoId(corpus)) notFound();
  const view = await getCatalogView();
  const article = getArticle(view, corpus, slug);
  if (!article) notFound();
  const url = absoluteUrl(articlePath(locale, article.repo, article.articleId));
  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: url,
      languages: { en: url, 'x-default': url },
    },
    openGraph: {
      type: 'article',
      url,
      siteName: t(getMessages(locale), 'site.name'),
      title: article.title,
      description: article.description,
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
      title: article.title,
      description: article.description,
      images: [ogImageUrl()],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { locale, corpus, slug } = await params;
  if (!isLocale(locale) || !isRepoId(corpus)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const article = getArticle(view, corpus, slug);
  if (!article) notFound();
  const markdown = await readArticleMarkdown(article);
  const { prev, next } = conceptNeighbors(view, article.uid);
  const canonical = articlePath(locale, article.repo, article.articleId);
  const crumbs = corpusBreadcrumb(locale, messages, article);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              '@id': `${absoluteUrl(canonical)}#article`,
              headline: article.title,
              description: article.description,
              inLanguage: locale,
              isPartOf: { '@id': `${SITE_ORIGIN}/#site` },
              publisher: { '@id': `${SITE_ORIGIN}/#org` },
              articleSection: article.folder,
              mainEntityOfPage: absoluteUrl(canonical),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: t(messages, 'breadcrumb.articles'),
                  item: absoluteUrl(blogPath(locale)),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: t(messages, `corpora.${article.repo}.label`),
                  item: absoluteUrl(`${blogPath(locale)}#${article.repo}`),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: article.title,
                },
              ],
            },
          ],
        }}
      />
      <Suspense fallback={<LessonSkeleton />}>
        <ArticleView
          locale={locale}
          messages={messages}
          view={view}
          article={article}
          markdown={markdown}
          chrome={{ variant: 'corpus' }}
          breadcrumb={crumbs}
          prev={prev}
          next={next}
          prevHref={prev ? articlePath(locale, prev.repo, prev.articleId) : null}
          nextHref={next ? articlePath(locale, next.repo, next.articleId) : null}
          prevLabel={t(messages, 'article.previous')}
          nextLabel={t(messages, 'article.next')}
          shareUrl={absoluteUrl(canonical)}
          postHeader
        />
      </Suspense>
    </>
  );
}
