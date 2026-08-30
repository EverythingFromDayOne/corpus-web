'use client';

import { useMemo, useState } from 'react';
import { REPOS, type RepoId } from '@/lib/repos';
import type { ArticleListItem } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { articlePath } from '@/lib/routes';

type Filter = 'all' | RepoId;

export function ArticleIndex({
  locale,
  articles,
  messages,
}: {
  locale: Locale;
  articles: ArticleListItem[];
  messages: Messages;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => (filter === 'all' ? articles : articles.filter((article) => article.repo === filter)),
    [articles, filter],
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

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: t(messages, 'blog.filterAll') },
    ...REPOS.map((repo) => ({ id: repo, label: t(messages, `corpora.${repo}.label`) })),
  ];

  return (
    <div>
      <div role="group" aria-label={t(messages, 'blog.filterLabel')} className="mt-8 flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              filter === item.id
                ? 'border-signal text-signal'
                : 'border-graphite text-muted hover:text-display'
            }`}
          >
            {item.label}
          </button>
        ))}
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
                          className="border-graphite bg-surface hover:border-signal block rounded-md border p-4 pl-5 no-underline transition-colors duration-300"
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
