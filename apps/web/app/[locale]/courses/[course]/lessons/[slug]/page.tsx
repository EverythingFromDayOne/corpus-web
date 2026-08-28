import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleView, courseBreadcrumb } from '@/components/article/article-view';
import { JsonLd } from '@/components/json-ld';
import {
  courseNeighbors,
  getArticle,
  getCatalogView,
  getCourse,
} from '@/lib/catalog';
import { readArticleMarkdown } from '@/lib/article-source';
import { getMessages, t } from '@/lib/i18n';
import { isLocale, LOCALES } from '@/lib/locales';
import { articlePath, coursePath, coursesPath, homePath, lessonPath } from '@/lib/routes';
import { absoluteUrl, SITE_ORIGIN } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string; course: string; slug: string }>;
};

export async function generateStaticParams() {
  const view = await getCatalogView();
  return view.courses.flatMap((course) =>
    course.items.flatMap((item) =>
      LOCALES.map((locale) => ({
        locale,
        course: course.slug,
        slug: item.articleId,
      })),
    ),
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, course: courseSlug, slug } = await params;
  if (!isLocale(locale)) notFound();
  const view = await getCatalogView();
  const course = getCourse(view, courseSlug);
  const item = course?.items.find((entry) => entry.articleId === slug);
  if (!course || !item) notFound();
  const article = view.byUid[item.article];
  if (!article) notFound();
  const canonical = absoluteUrl(articlePath(locale, article.repo, article.articleId));
  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical,
      languages: { en: canonical, 'x-default': canonical },
    },
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: t(getMessages(locale), 'site.name'),
      title: article.title,
      description: article.description,
      locale,
    },
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { locale, course: courseSlug, slug } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const course = getCourse(view, courseSlug);
  const item = course?.items.find((entry) => entry.articleId === slug);
  if (!course || !item) notFound();
  const article = getArticle(view, item.repo, item.articleId);
  if (!article) notFound();
  const markdown = await readArticleMarkdown(article);
  const { prev, next } = courseNeighbors(course, slug);
  const canonicalPath = articlePath(locale, article.repo, article.articleId);
  const crumbs = courseBreadcrumb(locale, messages, course.title, course.slug, article.title);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'TechArticle',
              '@id': `${absoluteUrl(canonicalPath)}#article`,
              headline: article.title,
              description: article.description,
              inLanguage: locale,
              isPartOf: { '@id': `${SITE_ORIGIN}/#site` },
              publisher: { '@id': `${SITE_ORIGIN}/#org` },
              articleSection: article.folder,
              mainEntityOfPage: absoluteUrl(canonicalPath),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: t(messages, 'breadcrumb.home'),
                  item: absoluteUrl(homePath(locale)),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: t(messages, 'breadcrumb.courses'),
                  item: absoluteUrl(coursesPath(locale)),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: course.title,
                  item: absoluteUrl(coursePath(locale, course.slug)),
                },
                {
                  '@type': 'ListItem',
                  position: 4,
                  name: article.title,
                },
              ],
            },
          ],
        }}
      />
      <ArticleView
        locale={locale}
        messages={messages}
        view={view}
        article={article}
        markdown={markdown}
        chrome={{ variant: 'course', course }}
        breadcrumb={crumbs}
        prev={prev}
        next={next}
        prevHref={prev ? lessonPath(locale, course.slug, prev.articleId) : null}
        nextHref={next ? lessonPath(locale, course.slug, next.articleId) : null}
        prevLabel={t(messages, 'article.previousLesson')}
        nextLabel={t(messages, 'article.nextLesson')}
        lead={
          <div className="av-ph">
            <p className="av-lab">{t(messages, 'placeholders.comingSoon')}</p>
            <p className="mt-2">{t(messages, 'article.quizHint')}</p>
          </div>
        }
      />
    </>
  );
}
