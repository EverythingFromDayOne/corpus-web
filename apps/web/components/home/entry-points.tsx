import type { CourseView } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { blogPath, coursePath } from '@/lib/routes';

export function EntryPoints({
  locale,
  featured,
  messages,
}: {
  locale: Locale;
  featured: CourseView | undefined;
  messages: Messages;
}) {
  return (
    <section aria-labelledby="entries-heading">
      <h2 id="entries-heading" className="text-2xl">
        {t(messages, 'home.entriesHeading')}
      </h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {featured ? (
          <li>
            <a
              href={coursePath(locale, featured.slug)}
              className="border-graphite bg-surface hover:border-muted block h-full rounded-md border p-5 no-underline"
            >
              <p className="meta">{t(messages, 'home.featuredEyebrow')}</p>
              <p className="text-display mt-2 text-lg">{t(messages, 'home.entryCourseTitle')}</p>
              <p className="text-muted mt-2 text-sm">{t(messages, 'home.entryCourseBody')}</p>
            </a>
          </li>
        ) : null}
        <li>
          <a
            href={blogPath(locale)}
            className="border-graphite bg-surface hover:border-muted block h-full rounded-md border p-5 no-underline"
          >
            <p className="text-display text-lg">{t(messages, 'home.entryDebugTitle')}</p>
            <p className="text-muted mt-2 text-sm">{t(messages, 'home.entryDebugBody')}</p>
          </a>
        </li>
        <li>
          <a
            href={blogPath(locale)}
            className="border-graphite bg-surface hover:border-muted block h-full rounded-md border p-5 no-underline"
          >
            <p className="text-display text-lg">{t(messages, 'home.entryBrowseTitle')}</p>
            <p className="text-muted mt-2 text-sm">{t(messages, 'home.entryBrowseBody')}</p>
          </a>
        </li>
      </ul>
    </section>
  );
}

export function ReadingConventions({ messages }: { messages: Messages }) {
  return (
    <section aria-labelledby="reading-heading">
      <h2 id="reading-heading" className="text-2xl">
        {t(messages, 'home.readingHeading')}
      </h2>
      <ul className="text-muted mt-4 list-disc space-y-2 pl-5">
        <li>{t(messages, 'home.readingConcept')}</li>
        <li>{t(messages, 'home.readingRecipe')}</li>
        <li>{t(messages, 'home.readingDifficulty')}</li>
        <li>{t(messages, 'home.readingBaseline')}</li>
      </ul>
    </section>
  );
}
