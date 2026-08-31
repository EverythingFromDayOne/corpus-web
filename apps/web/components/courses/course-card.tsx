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
  const lastIndex = course.items.length - 1;

  return (
    <ol
      className="mt-6 ml-3"
      aria-label={t(messages, 'courses.curriculumTimelineLabel')}
    >
      {course.items.map((item, index) => {
        const isFirst = index === 0;
        const isLast = index === lastIndex;
        const ordinal = index + 1;

        return (
          <li
            key={item.article}
            className={`timeline-step relative pl-8 ${isLast ? '' : 'pb-6'}`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1.5 -left-[5px] inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-signal bg-base ${
                isFirst || isLast ? 'bg-signal' : ''
              }`}
            />
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute top-4 -left-[1px] h-full w-0.5 border-l border-graphite"
              />
            ) : null}
            <a
              href={lessonPath(locale, course.slug, item.articleId)}
              className="text-display text-lg no-underline hover:underline"
            >
              <span aria-hidden="true" className="text-muted meta mr-2 tabular-nums">
                {String(ordinal).padStart(2, '0')}
              </span>
              {item.title}
            </a>
            {item.note ? (
              <p className="text-muted border-graphite mt-2 ml-0 border-l-2 pl-3 text-sm italic">
                {item.note}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
