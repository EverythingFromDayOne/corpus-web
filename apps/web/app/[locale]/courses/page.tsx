import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageShell } from '@/components/chrome/site-header';
import { CourseCard } from '@/components/courses/course-card';
import { JsonLd } from '@/components/json-ld';
import { getCatalogView } from '@/lib/catalog';
import { getMessages, t } from '@/lib/i18n';
import { isLocale } from '@/lib/locales';
import { coursesPath } from '@/lib/routes';
import { absoluteUrl, SITE_ORIGIN } from '@/lib/site';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const messages = getMessages(locale);
  const url = absoluteUrl(coursesPath(locale));
  return {
    title: t(messages, 'courses.indexTitle'),
    description: t(messages, 'courses.indexDescription'),
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: t(messages, 'site.name'),
      title: t(messages, 'courses.indexTitle'),
      description: t(messages, 'courses.indexDescription'),
      locale,
    },
  };
}

export default async function CoursesPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const messages = getMessages(locale);
  const view = await getCatalogView();
  const url = absoluteUrl(coursesPath(locale));

  return (
    <PageShell messages={messages}>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: t(messages, 'courses.indexTitle'),
          url,
          isPartOf: { '@id': `${SITE_ORIGIN}/#site` },
        }}
      />
      <header>
        <p className="meta">{t(messages, 'breadcrumb.courses')}</p>
        <h1 className="mt-3 text-4xl">{t(messages, 'courses.indexTitle')}</h1>
        <p className="mt-4 max-w-[var(--measure-prose)]">{t(messages, 'courses.indexDescription')}</p>
      </header>
      <ul className="mt-10 grid gap-4">
        {view.courses.map((course) => (
          <li key={course.slug}>
            <CourseCard locale={locale} course={course} messages={messages} />
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
