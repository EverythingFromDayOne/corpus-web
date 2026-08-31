'use client';

import { useMemo, useState } from 'react';
import { REPOS, type RepoId } from '@/lib/repos';
import type { ArticleListItem } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { articlePath } from '@/lib/routes';

type CorpusFilter = 'all' | RepoId;
type KindFilter = 'all' | ArticleListItem['kind'];

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

  const visible = useMemo(
    () =>
      articles.filter((article) => {
        if (corpus !== 'all' && article.repo !== corpus) return false;
        if (kind !== 'all' && article.kind !== kind) return false;
        return true;
      }),
    [articles, corpus, kind],
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
        className={`rounded-md border px-3 py-1.5 text-sm ${
          selected
            ? 'border-signal text-signal'
            : 'border-graphite text-muted hover:text-display'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div>
      <div
        role="group"
        aria-label={t(messages, 'blog.filterCorpusLabel')}
        className="mt-8 flex flex-wrap gap-2"
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
        className="mt-3 flex flex-wrap gap-2"
      >
        {kindFilters.map((item) =>
          renderChip({
            selected: kind === item.id,
            label: item.label,
            onClick: () => setKind(item.id),
          }),
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted mt-10">{t(messages, 'blog.empty')}</p>
      ) : (
        <div className="mt-10 space-y-12">
          {[...groups.entries()].map(([repo, folders]) => (
            <section key={repo} id={repo} aria-labelledby={`corpus-${repo}`}>
              <h2 id={`corpus-${repo}`} className="text-2xl">
                {t(messages, `corpora.${repo}.label`)}
              </h2>
              {[...folders.entries()].map(([folder, items]) => (
                <div key={folder} className="mt-6">
                  <h3 className="meta">{folder}</h3>
                  <ul className="mt-3 grid gap-3">
                    {items.map((article) => (
                      <li key={article.uid} className="group relative">
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 rounded-full bg-signal transition-transform duration-300 group-hover:scale-y-100"
                        />
                        <a
                          href={articlePath(locale, article.repo, article.articleId)}
                          className="border-graphite bg-surface hover:border-signal block rounded-md border p-4 pl-5 no-underline transition-[transform,box-shadow,border-color] duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_4px_12px_color-mix(in_srgb,var(--color-ink)_30%,transparent)]"
                        >
                          <p className="text-display text-lg">{article.title}</p>
                          <p className="text-muted mt-2 text-sm">{article.description}</p>
                          <p className="meta mt-3">
                            {t(messages, `corpora.${article.repo}.label`)}
                            {' · '}
                            {t(messages, 'blog.readingTime', { minutes: article.minutes })}
                          </p>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
