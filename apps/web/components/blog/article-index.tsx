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
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [kind, setKind] = useState<KindFilter>('all');
  const [sort, setSort] = useState<SortKey>('az');

  // Stable map of (repo → folder → articles[]) for the sidebar tree.
  const tree = useMemo(() => {
    const byRepo = new Map<RepoId, Map<string, ArticleListItem[]>>();
    for (const article of articles) {
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
  }, [articles]);

  // Pane content: filtered + sorted articles for the active corpus / folder.
  const paneArticles = useMemo(() => {
    return articles
      .filter((article) => {
        if (corpus !== 'all' && article.repo !== corpus) return false;
        if (activeFolder !== null && article.folder !== activeFolder) return false;
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
      });
  }, [articles, corpus, activeFolder, kind, sort]);

  // Pane header: corpus eyebrow + folder name + total count.
  const paneCorpus = corpus === 'all' ? null : corpus;
  const paneFolder = activeFolder;
  const paneCount = paneArticles.length;

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
      <li key={article.uid} className="group relative min-w-0">
        <a
          href={articlePath(locale, article.repo, article.articleId)}
          className="ls-blog-card blog-card relative block rounded-lg border p-5 pl-6 no-underline transition-[transform,box-shadow,border-color,background] duration-300 group-hover:-translate-y-2"
        >
          <span
            aria-hidden="true"
            className="blog-card-bar absolute inset-y-0 left-0 w-1 origin-top scale-y-0 rounded-full transition-transform duration-300 group-hover:scale-y-100"
          />
          <div className="blog-card-head flex flex-wrap items-center gap-x-2 gap-y-0.5">
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

  const allCount = articles.length;

  return (
    <div className="blog-layout mt-8 grid gap-8">
      {/* Sidebar tree (left) */}
      <aside className="blog-sidebar" aria-label={t(messages, 'blog.sidebarLabel')}>
        <button
          type="button"
          className={`blog-tree-corpus blog-tree-corpus--all ${corpus === 'all' && activeFolder === null ? 'blog-tree-folder--on' : ''}`}
          onClick={() => {
            setCorpus('all');
            setActiveFolder(null);
          }}
        >
          <span>{t(messages, 'blog.sidebarAll')}</span>
          <span className="blog-tree-folder-count">{allCount}</span>
        </button>
        {[...REPOS].map((repo) => {
          const folders = tree.get(repo);
          if (!folders || folders.size === 0) return null;
          const corpusTotal = [...folders.values()].reduce((acc, l) => acc + l.length, 0);
          const isCorpusOpen = corpus === repo;
          return (
            <div key={repo} className="blog-tree-section">
              <button
                type="button"
                className={`blog-tree-corpus ${isCorpusOpen ? 'blog-tree-corpus--on' : ''}`}
                onClick={() => {
                  setCorpus(repo);
                  setActiveFolder(null);
                }}
              >
                <span>{t(messages, `corpora.${repo}.label`)}</span>
                <span className="blog-tree-corpus-count">{corpusTotal}</span>
              </button>
              <div className="blog-tree-folders">
                <button
                  type="button"
                  className={`blog-tree-folder ${isCorpusOpen && activeFolder === null ? 'blog-tree-folder--on' : ''}`}
                  onClick={() => {
                    setCorpus(repo);
                    setActiveFolder(null);
                  }}
                >
                  <span>{t(messages, 'blog.sidebarAllFolders')}</span>
                  <span className="blog-tree-folder-count">{corpusTotal}</span>
                </button>
                {[...folders.entries()]
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([folder, items]) => (
                    <button
                      key={folder}
                      type="button"
                      className={`blog-tree-folder ${isCorpusOpen && activeFolder === folder ? 'blog-tree-folder--on' : ''}`}
                      onClick={() => {
                        setCorpus(repo);
                        setActiveFolder(folder);
                      }}
                    >
                      <span className="blog-tree-folder-name">{folder}</span>
                      <span className="blog-tree-folder-count">{items.length}</span>
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </aside>

      {/* Main pane (right). The `ls-ambient-grid` + `ls-ambient-glow`
         modifiers apply the sydexa-video-driven background spec
         (PR #131, `prompts/design-spec-2026-08-background.md` §2): a
         faint 24×24 line-grid at ~6% opacity (less than the home
         hero's 8% because the cards are in front) plus a quiet
         mid-right cool corner glow at ~18%. Both modifiers are
         no-op when the spec's tokens are missing. */}
      <div className="blog-pane ls-ambient-grid ls-ambient-glow">
        <div className="blog-pane-head">
          <span className="blog-pane-eyebrow">
            {paneCorpus ? t(messages, `corpora.${paneCorpus}.label`) : t(messages, 'blog.sidebarAll')}
          </span>
          <h2 className="blog-pane-title">
            {paneFolder ?? (paneCorpus ? t(messages, 'blog.sidebarAllFolders') : t(messages, 'blog.sidebarAll'))}
          </h2>
          <span className="blog-pane-count">
            {t(messages, 'blog.paneCount', { count: paneCount })}
          </span>
        </div>

        <div className="blog-filter-bar blog-pane-filters">
          <span className="blog-filter-label">{t(messages, 'blog.filterKindLabel')}</span>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t(messages, 'blog.filterKindLabel')}>
            {kindFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={kind === item.id}
                onClick={() => setKind(item.id)}
                className={`blog-filter-chip ${kind === item.id ? 'blog-filter-chip--on' : 'blog-filter-chip--off'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="blog-sort ml-auto flex items-center gap-2">
            <span className="text-muted">{t(messages, 'blog.sortLabel')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="blog-sort-select rounded-md border px-3 py-1.5"
            >
              {sortOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {paneArticles.length === 0 ? (
          <p className="blog-pane-empty text-muted mt-10">{t(messages, 'blog.empty')}</p>
        ) : (
          <ul className="blog-cards mt-6 grid gap-4">{paneArticles.map(renderCard)}</ul>
        )}
      </div>
    </div>
  );
}