import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cacheLife } from 'next/cache';
import { z } from 'zod';
import { REPOS, type RepoId } from './repos';
import { WORDS_PER_MINUTE } from './site';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

const Repo = z.enum(REPOS);
const Difficulty = z.enum(['foundational', 'intermediate', 'advanced']);

const ListingCatalog = z
  .object({
    articles: z.array(
      z.object({
        uid: z.string(),
        repo: Repo,
        articleId: z.string(),
        folder: z.string(),
        title: z.string(),
        description: z.string(),
        kind: z.enum(['concept', 'recipe']),
        difficulty: Difficulty.nullable(),
        baseline: z.object({ framework: z.string(), version: z.string() }),
        sourcePath: z.string(),
      }),
    ),
    failures: z.array(z.object({ repo: Repo })),
    paths: z.array(
      z.object({
        slug: z.string(),
        title: z.string(),
        description: z.string(),
        rationale: z.string(),
        items: z.array(
          z.object({
            article: z.string(),
            note: z.string().optional(),
          }),
        ),
      }),
    ),
    edges: z.array(z.object({ from: z.string(), to: z.string() })),
  })
  .passthrough();

type ListingCatalog = z.infer<typeof ListingCatalog>;
type DifficultyValue = z.infer<typeof Difficulty>;

export type ArticleListItem = {
  uid: string;
  repo: RepoId;
  articleId: string;
  folder: string;
  title: string;
  description: string;
  kind: 'concept' | 'recipe';
  minutes: number;
};

export type CorpusStats = {
  repo: RepoId;
  adapting: number;
  selected: number;
  baseline: { framework: string; version: string };
};

export type CourseItemView = {
  article: string;
  repo: RepoId;
  articleId: string;
  title: string;
  note: string | undefined;
  minutes: number;
};

export type CourseView = {
  slug: string;
  title: string;
  description: string;
  rationale: string;
  lessonCount: number;
  minutes: number;
  corpora: RepoId[];
  level: DifficultyValue | null;
  items: CourseItemView[];
};

export type GraphSummary = {
  nodes: Array<{ repo: RepoId; count: number }>;
  edges: Array<{ from: RepoId; to: RepoId; count: number }>;
};

export type CatalogView = {
  articles: ArticleListItem[];
  byUid: Record<string, ArticleListItem>;
  corpora: CorpusStats[];
  courses: CourseView[];
  graph: GraphSummary;
  liveUids: string[];
};

function countWords(raw: string): number {
  const stripped = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  return stripped.trim().match(/\S+/g)?.length ?? 0;
}

function minutesFromWords(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function mostCommonBaseline(
  articles: ListingCatalog['articles'],
  repo: RepoId,
): { framework: string; version: string } {
  const counts = new Map<string, { framework: string; version: string; n: number }>();
  for (const article of articles) {
    if (article.repo !== repo) continue;
    const key = `${article.baseline.framework}\0${article.baseline.version}`;
    const current = counts.get(key);
    if (current) current.n += 1;
    else counts.set(key, { ...article.baseline, n: 1 });
  }
  let best: { framework: string; version: string; n: number } | undefined;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  if (!best) {
    throw new Error(`No baseline for corpus ${repo}`);
  }
  return { framework: best.framework, version: best.version };
}

function loadCatalogView(): CatalogView {
  const catalog = ListingCatalog.parse(
    JSON.parse(readFileSync(join(ROOT, 'catalog.json'), 'utf8')) as unknown,
  );

  const articles: ArticleListItem[] = catalog.articles.map((article) => {
    const file = join(ROOT, 'content', article.repo, article.sourcePath);
    const words = existsSync(file) ? countWords(readFileSync(file, 'utf8')) : 0;
    const minutes = minutesFromWords(words);
    return {
      uid: article.uid,
      repo: article.repo,
      articleId: article.articleId,
      folder: article.folder,
      title: article.title,
      description: article.description,
      kind: article.kind,
      minutes,
    };
  });

  articles.sort((a, b) => {
    const repo = REPOS.indexOf(a.repo) - REPOS.indexOf(b.repo);
    if (repo !== 0) return repo;
    const folder = a.folder.localeCompare(b.folder);
    if (folder !== 0) return folder;
    return a.title.localeCompare(b.title);
  });

  const byUid: Record<string, ArticleListItem> = {};
  for (const article of articles) byUid[article.uid] = article;

  const corpora: CorpusStats[] = REPOS.map((repo) => {
    const adapting = catalog.articles.filter((article) => article.repo === repo).length;
    const failed = catalog.failures.filter((failure) => failure.repo === repo).length;
    return {
      repo,
      adapting,
      selected: adapting + failed,
      baseline: mostCommonBaseline(catalog.articles, repo),
    };
  });

  const courses: CourseView[] = catalog.paths.map((path) => {
    const items: CourseItemView[] = path.items.map((item) => {
      const article = byUid[item.article];
      if (!article) {
        throw new Error(`Path ${path.slug} references missing article ${item.article}`);
      }
      return {
        article: item.article,
        repo: article.repo,
        articleId: article.articleId,
        title: article.title,
        note: item.note,
        minutes: article.minutes,
      };
    });
    const corporaInCourse = [...new Set(items.map((item) => item.repo))].sort(
      (a, b) => REPOS.indexOf(a) - REPOS.indexOf(b),
    );
    const difficulties = new Set(
      path.items.map((item) => {
        const raw = catalog.articles.find((article) => article.uid === item.article);
        return raw?.difficulty ?? null;
      }),
    );
    const level = difficulties.size === 1 ? ([...difficulties][0] ?? null) : null;
    return {
      slug: path.slug,
      title: path.title,
      description: path.description,
      rationale: path.rationale,
      lessonCount: items.length,
      minutes: items.reduce((sum, item) => sum + item.minutes, 0),
      corpora: corporaInCourse,
      level,
      items,
    };
  });

  const edgeCounts = new Map<string, { from: RepoId; to: RepoId; count: number }>();
  for (const edge of catalog.edges) {
    const from = byUid[edge.from]?.repo;
    const to = byUid[edge.to]?.repo;
    if (!from || !to) continue;
    const key = `${from}->${to}`;
    const current = edgeCounts.get(key);
    if (current) current.count += 1;
    else edgeCounts.set(key, { from, to, count: 1 });
  }

  return {
    articles,
    byUid,
    corpora,
    courses,
    graph: {
      nodes: corpora.map((corpus) => ({ repo: corpus.repo, count: corpus.adapting })),
      edges: [...edgeCounts.values()],
    },
    liveUids: catalog.articles.map((article) => article.uid),
  };
}

export async function getCatalogView(): Promise<CatalogView> {
  'use cache';
  cacheLife('max');
  return loadCatalogView();
}

export function getCourse(view: CatalogView, slug: string): CourseView | undefined {
  return view.courses.find((course) => course.slug === slug);
}

/**
 * A `related` target becomes a href only when the article adapted.
 * Excluded and unresolved targets must render as plain text, never as links.
 */
export function relatedHref(
  view: CatalogView,
  locale: string,
  uid: string,
  toHref: (locale: string, uid: string) => string,
): string | null {
  if (!view.liveUids.includes(uid)) return null;
  return toHref(locale, uid);
}
