'use client';

import { useMemo, useState } from 'react';
import { REPOS, type RepoId } from '@/lib/repos';
import type { ArticleListItem } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { articlePath } from '@/lib/routes';

type CorpusFilter = 'all' | RepoId;
type KindFilter = 'all' | ArticleListItem['kind'];
type SortKey = 'az' | 'za' | 'short' | 'long';

export function ArticleIndex({
  locale,
  articles,
  messages,
}: {
  locale: Locale;
  articles: ArticleListItem[];
  messages: Messages;
}) {
  const [corpus, setCorpus] = useState<CorpusFilter>('all');
  const [kind, setKind] = useState<KindFilter>('all');
  const [sort, setSort] = useState<SortKey>('az');

  const visible = useMemo(
    () =>
      articles
        .filter((article) => {
          if (corpus !== 'all' && article.repo !== corpus) return false;
          if (kind !== 'all' && article.kind !== kind) return false;
          return true;
        })
        .slice()
        .sort((a, b) => {
          switch (sort) {
            case 'az':
              return a.title.localeCompare(b.title);
            case 'za':
              return b.title.localeCompare(a.title);
            case 'short':
              return a.minutes - b.minutes || a.title.localeCompare(b.title);
            case 'long':
              return b.minutes - a.minutes || a.title.localeCompare(b.title);
            default:
              return 0;
          }
        }),
    [articles, corpus, kind, sort],
  );

  const groups = useMemo(() => {
    const byRepo = new Map<RepoId, Map<string, ArticleListItem[]>>();
    for (const article of visible) {
      let folders = byRepo.get(article.repo);
      if (!folders) {
        folders = new Map();
        byRepo.set(article.repo, folders);
      }
      const list = folders.get(article.folder) ?? [];
      list.push(article);
      folders.set(article.folder, list);
    }
    return byRepo;
  }, [visible]);

  const corpusFilters: Array<{ id: CorpusFilter; label: string }> = [
    { id: 'all', label: t(messages, 'blog.filterAll') },
    ...REPOS.map((repo) => ({ id: repo, label: t(messages, `corpora.${repo}.label`) })),
  ];
  const kindFilters: Array<{ id: KindFilter; label: string }> = [
    { id: 'all', label: t(messages, 'blog.filterAll') },
    { id: 'concept', label: t(messages, 'article.kindConcept') },
    { id: 'recipe', label: t(messages, 'article.kindRecipe') },
  ];
  const sortOptions: Array<{ id: SortKey; label: string }> = [
    { id: 'az', label: t(messages, 'blog.sortAz') },
    { id: 'za', label: t(messages, 'blog.sortZa') },
    { id: 'short', label: t(messages, 'blog.sortShortest') },
    { id: 'long', label: t(messages, 'blog.sortLongest') },
  ];

  function renderChip({
    selected,
    label,
    onClick,
  }: {
    selected: boolean;
    label: string;
    onClick: () => void;
  }) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={`blog-filter-chip ${selected ? 'blog-filter-chip--on' : 'blog-filter-chip--off'}`}
      >
        {label}
      </button>
    );
  }

  function renderCard(article: ArticleListItem) {
    const kindLabel =
      article.kind === 'concept'
        ? t(messages, 'article.kindConcept')
        : t(messages, 'article.kindRecipe');
    const kindClass =
      article.kind === 'concept'
        ? 'blog-card-kind blog-card-kind--concept'
        : 'blog-card-kind blog-card-kind--recipe';
    const corpusLabel = t(messages, `corpora.${article.repo}.label`);
    const desc = article.description;
    return (
      <li key={article.uid} className="group relative">
        <a
          href={articlePath(locale, article.repo, article.articleId)}
          className="ls-blog-card blog-card relative block rounded-lg border p-5 pl-6 no-underline transition-[transform,box-shadow,border-color,background] duration-300 group-hover:-translate-y-1"
        >
          <span
            aria-hidden="true"
            className="blog-card-bar absolute inset-y-0 left-0 w-1 origin-top scale-y-0 rounded-full bg-signal transition-transform duration-300 group-hover:scale-y-100"
          />
          <div className="blog-card-head flex items-center gap-2">
            <span className={kindClass} aria-label={`${t(messages, 'article.kind')}: ${kindLabel}`}>
              {kindLabel}
            </span>
            <span className="blog-card-corpus text-muted">{corpusLabel}</span>
            <span className="blog-card-corpus text-muted">·</span>
            <span className="blog-card-corpus text-muted">
              {t(messages, 'blog.readingTime', { minutes: article.minutes })}
            </span>
          </div>
          <h3 className="blog-card-title text-display mt-3 text-xl font-semibold">
            {article.title}
          </h3>
          {desc ? (
            <p className="blog-card-desc text-muted mt-3 text-sm">{desc}</p>
          ) : null}
        </a>
      </li>
    );
  }

  return (
    <div>
      <div className="blog-filter-bar mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div
          role="group"
          aria-label={t(messages, 'blog.filterCorpusLabel')}
          className="flex flex-wrap gap-2"
        >
          {corpusFilters.map((item) =>
            renderChip({
              selected: corpus === item.id,
              label: item.label,
              onClick: () => setCorpus(item.id),
            }),
          )}
        </div>
        <div
          role="group"
          aria-label={t(messages, 'blog.filterKindLabel')}
          className="flex flex-wrap gap-2"
        >
          {kindFilters.map((item) =>
            renderChip({
              selected: kind === item.id,
              label: item.label,
              onClick: () => setKind(item.id),
            }),
          )}
        </div>
        <label className="blog-sort ml-auto flex items-center gap-2 text-sm">
          <span className="text-muted">{t(messages, 'blog.sortLabel')}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="blog-sort-select rounded-md border px-3 py-1.5 text-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted mt-10">{t(messages, 'blog.empty')}</p>
      ) : (
        <div className="mt-10 space-y-12">
          {[...groups.entries()].map(([repo, folders]) => (
            <section key={repo} id={repo} aria-labelledby={`corpus-${repo}`}>
              <h2
                id={`corpus-${repo}`}
                className="blog-corpus-heading text-display text-2xl font-semibold"
              >
                {t(messages, `corpora.${repo}.label`)}
                <span className="blog-corpus-count ml-3 align-middle text-base font-normal text-muted">
                  {[...folders.values()].reduce((acc, l) => acc + l.length, 0)}
                </span>
              </h2>
              {[...folders.entries()].map(([folder, items]) => (
                <div key={folder} className="mt-6">
                  <h3 className="meta text-muted">{folder}</h3>
                  <ul className="mt-3 grid gap-4">{items.map(renderCard)}</ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
