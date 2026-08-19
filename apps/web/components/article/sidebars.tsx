'use client';

import { useEffect, useState } from 'react';
import type { CourseView, SidebarGroup } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { articlePath, coursePath, lessonPath } from '@/lib/routes';
import { isRepoId, REPOS, type RepoId } from '@/lib/repos';
import { readProgress } from '@/lib/progress';
import { sidebarClassName, useArticleChrome } from './article-shell';

export function CorpusSidebar({
  locale,
  messages,
  repo,
  currentUid,
  groups,
  firstSlugs,
  collapseLabel,
}: {
  locale: Locale;
  messages: Messages;
  repo: RepoId;
  currentUid: string;
  groups: SidebarGroup[];
  firstSlugs: Partial<Record<RepoId, string>>;
  collapseLabel: string;
}) {
  const { desktopOpen, mobileOpen, toggle } = useArticleChrome();
  const [completed, setCompleted] = useState<Record<string, true>>({});

  useEffect(() => {
    setCompleted(readProgress().completed);
  }, [currentUid]);

  return (
    <aside className={sidebarClassName(desktopOpen, mobileOpen)} aria-label={t(messages, 'article.corpusNav')}>
      <div className="av-sbhd">
        <b>{t(messages, 'article.corpus')}</b>
        <button type="button" className="av-sbtog" aria-label={collapseLabel} onClick={toggle}>
          ‹
        </button>
      </div>
      <label className="sr-only" htmlFor="av-corpus-select">
        {t(messages, 'article.chooseCorpus')}
      </label>
      <select
        id="av-corpus-select"
        value={repo}
        onChange={(event) => {
          const next = event.target.value;
          if (!isRepoId(next)) return;
          const slug = firstSlugs[next];
          if (slug) window.location.href = articlePath(locale, next, slug);
        }}
      >
        {REPOS.map((id) => (
          <option key={id} value={id}>
            {t(messages, `corpora.${id}.label`)}
          </option>
        ))}
      </select>
      <input
        type="search"
        disabled
        aria-disabled="true"
        placeholder={t(messages, 'placeholders.search')}
      />
      {groups.map((group) => (
        <div key={group.folder} className="av-grp">
          <h4>
            {group.folder}
            <span>{group.articles.length}</span>
          </h4>
          {group.articles.map((article) => {
            const on = article.uid === currentUid;
            const done = Boolean(completed[article.uid]);
            return (
              <a
                key={article.uid}
                href={articlePath(locale, article.repo, article.articleId)}
                className={on ? 'on' : undefined}
                aria-current={on ? 'page' : undefined}
              >
                <i className={`av-dot${on ? ' now' : done ? ' done' : ''}`} />
                {article.title}
              </a>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

export function CurriculumSidebar({
  locale,
  messages,
  course,
  currentUid,
  collapseLabel,
}: {
  locale: Locale;
  messages: Messages;
  course: CourseView;
  currentUid: string;
  collapseLabel: string;
}) {
  const { desktopOpen, mobileOpen, toggle } = useArticleChrome();
  const [completed, setCompleted] = useState<Record<string, true>>({});

  useEffect(() => {
    setCompleted(readProgress().completed);
  }, [currentUid]);

  const doneCount = course.items.filter((item) => completed[item.article]).length;
  const ratio = course.lessonCount === 0 ? 0 : Math.round((doneCount / course.lessonCount) * 100);

  return (
    <aside className={sidebarClassName(desktopOpen, mobileOpen)} aria-label={t(messages, 'article.curriculumNav')}>
      <a className="av-back" href={coursePath(locale, course.slug)}>
        ← {course.title}
      </a>
      <div className="av-hd">
        <h2>{t(messages, 'courses.curriculumHeading')}</h2>
        <button type="button" className="av-sbtog" aria-label={collapseLabel} onClick={toggle}>
          ‹
        </button>
      </div>
      <div className="av-prog">
        <div className="av-pbar" aria-hidden="true">
          <svg viewBox="0 0 100 1" preserveAspectRatio="none" className="block h-full w-full">
            <rect className="fill-signal" x="0" y="0" width={ratio} height="1" />
          </svg>
        </div>
        <span className="av-prog-t">
          {doneCount} / {course.lessonCount}
        </span>
      </div>
      <ol className="av-lsn">
        {course.items.map((item, index) => {
          const on = item.article === currentUid;
          const done = Boolean(completed[item.article]);
          return (
            <li key={item.article}>
              <a
                href={lessonPath(locale, course.slug, item.articleId)}
                className={on ? 'on' : undefined}
                aria-current={on ? 'page' : undefined}
              >
                <span className="av-n">{String(index + 1).padStart(2, '0')}</span>
                <span>
                  {item.title}
                  <i className={`av-k${done ? ' done' : ''}`} />
                  {item.note ? <span className="av-note">{item.note}</span> : null}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
