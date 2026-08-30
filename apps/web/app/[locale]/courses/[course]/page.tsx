import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/chrome/site-header';
import { CurriculumList } from '@/components/courses/course-card';
import { JsonLd } from '@/components/json-ld';
import { getCatalogView, getCourse } from '@/lib/catalog';
import { getMessages, t } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';
import { coursePath, coursesPath, homePath, lessonPath } from '@/lib/routes';
import { absoluteUrl, SITE_ORIGIN } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string; course: string }>;
};

export async function generateStaticParams() {
  const view = await getCatalogView();
  return view.courses.map((course) => ({ course: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, course: slug } = await params;
  if (!isLocale(locale)) return {};
  const view = await getCatalogView();
  const course = getCourse(view, slug);
  if (!course) return {};
  const url = absoluteUrl(coursePath(locale, course.slug));
  return {
    title: course.title,
    description: course.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(getMessages(locale), 'site.name'),
      title: course.title,
      description: course.description,
      locale,
    },
  };
}

export default async function CourseDetailPage({ params }: PageProps) {
  const { locale, course: slug } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const course = getCourse(view, slug);
  if (!course) notFound();

  const first = course.items[0];
  if (!first) notFound();
  const url = absoluteUrl(coursePath(locale, course.slug));
  const corpora = course.corpora.map((repo) => t(messages, `corpora.${repo}.label`)).join(', ');

  return (
    <PageShell messages={messages}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
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
                },
              ],
            },
            {
              '@type': 'ItemList',
              name: course.title,
              description: course.description,
              url,
              isPartOf: { '@id': `${SITE_ORIGIN}/#site` },
              numberOfItems: course.lessonCount,
              itemListElement: course.items.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.title,
                url: absoluteUrl(lessonPath(locale, course.slug, item.articleId)),
              })),
            },
          ],
        }}
      />
      <nav aria-label={t(messages, 'breadcrumb.label')} className="meta">
        <ol className="flex flex-wrap gap-2">
          <li>
            <a href={homePath(locale)}>{t(messages, 'breadcrumb.home')}</a>
            <span aria-hidden="true"> / </span>
          </li>
          <li>
            <a href={coursesPath(locale)}>{t(messages, 'breadcrumb.courses')}</a>
            <span aria-hidden="true"> / </span>
          </li>
          <li>{course.title}</li>
        </ol>
      </nav>
<header className="film-grain relative mt-6 overflow-hidden">        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-12 -inset-y-8 rounded-full bg-signal-dim opacity-25 blur-3xl"
        />
        <h1 className="relative text-4xl bg-gradient-to-b from-display to-signal bg-clip-text text-transparent">
          {course.title}
        </h1>
        <p className="relative mt-4 max-w-[var(--measure-prose)]">{course.description}</p>
        <p className="relative mt-6 max-w-[var(--measure-prose)] whitespace-pre-line">{course.rationale}</p>
        <p className="meta mt-6">
          {t(messages, 'courses.lessons', { count: course.lessonCount })}
          {' · '}
          {t(messages, 'courses.readingTime', { minutes: course.minutes })}
          {course.level ? ` · ${t(messages, 'courses.level', { level: course.level })}` : ''}
          {' · '}
          {t(messages, 'courses.drawnFrom', { corpora })}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={lessonPath(locale, course.slug, first.articleId)}
            className="border-graphite bg-surface text-display inline-flex rounded-md border px-4 py-2 no-underline"
          >
            {t(messages, 'courses.startFirst')}
          </a>
          <a
            href="#curriculum"
            className="border-graphite text-display inline-flex rounded-md border px-4 py-2 no-underline"
          >
            {t(messages, 'courses.viewCurriculum')}
          </a>
        </div>
      </header>
      <section id="curriculum" className="mt-16 scroll-mt-24">
        <h2 className="text-2xl">{t(messages, 'courses.curriculumHeading')}</h2>
        <CurriculumList locale={locale} course={course} messages={messages} />
      </section>
    </PageShell>
  );
}
