import type { CourseView } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { coursePath, lessonPath } from '@/lib/routes';

function corporaLabel(course: CourseView, messages: Messages): string {
  return course.corpora.map((repo) => t(messages, `corpora.${repo}.label`)).join(', ');
}

export function CourseCard({
  locale,
  course,
  messages,
  className,
}: {
  locale: Locale;
  course: CourseView;
  messages: Messages;
  className?: string;
}) {
  return (
    <a
      href={coursePath(locale, course.slug)}
      className={`border-graphite bg-surface hover:border-signal block rounded-md border p-6 pl-7 no-underline transition-colors duration-300 ${className ?? ''}`}
    >
      <h2 className="text-2xl">{course.title}</h2>
      <p className="mt-3">{course.description}</p>
      <p className="meta mt-4">
        {t(messages, 'courses.lessons', { count: course.lessonCount })}
        {' · '}
        {t(messages, 'courses.readingTime', { minutes: course.minutes })}
        {' · '}
        {t(messages, 'courses.drawnFrom', { corpora: corporaLabel(course, messages) })}
      </p>
    </a>
  );
}

export function CurriculumList({
  locale,
  course,
  messages,
}: {
  locale: Locale;
  course: CourseView;
  messages: Messages;
}) {
  return (
    <ol className="mt-6 space-y-4">
      {course.items.map((item, index) => (
        <li key={item.article} className="border-graphite border-b pb-4">
          <a
            href={lessonPath(locale, course.slug, item.articleId)}
            className="text-display text-lg no-underline hover:underline"
          >
            <span className="meta mr-2">{t(messages, 'courses.position', { n: index + 1 })}</span>
            {item.title}
          </a>
          {item.note ? <p className="text-muted mt-2 text-sm">{item.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
