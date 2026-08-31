import type { CourseView } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { coursePath, lessonPath } from '@/lib/routes';

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
  const desc = course.description;
  const level = course.level;
  return (
    <a
      href={coursePath(locale, course.slug)}
      className={`course-card ls-blog-card relative block rounded-lg border p-6 pl-7 no-underline transition-[transform,box-shadow,border-color,background] duration-300 group-hover:-translate-y-1 ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="course-card-bar absolute inset-y-0 left-0 w-1 origin-top scale-y-0 rounded-full transition-transform duration-300 group-hover:scale-y-100"
      />
      <div className="course-card-head flex flex-wrap items-center gap-2">
        <span className="course-card-crumb text-muted">
          {t(messages, `corpora.${course.corpora[0] ?? 'react'}.label`)}
        </span>
        <span className="course-card-crumb text-muted">·</span>
        <span className="course-card-crumb text-muted">
          {t(messages, 'courses.lessons', { count: course.lessonCount })}
        </span>
        <span className="course-card-crumb text-muted">·</span>
        <span className="course-card-crumb text-muted">
          {t(messages, 'courses.readingTime', { minutes: course.minutes })}
        </span>
        {level ? (
          <>
            <span className="course-card-crumb text-muted">·</span>
            <span className="course-card-level">
              {t(messages, 'courses.level', { level })}
            </span>
          </>
        ) : null}
      </div>
      <h2 className="course-card-title text-display mt-3 text-2xl font-semibold">
        {course.title}
      </h2>
      {desc ? (
        <p className="course-card-desc text-muted mt-3 text-sm">{desc}</p>
      ) : null}
      {course.rationale ? (
        <p className="course-card-rationale text-muted mt-4 border-graphite border-l-2 pl-3 text-sm italic">
          {course.rationale}
        </p>
      ) : null}
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
