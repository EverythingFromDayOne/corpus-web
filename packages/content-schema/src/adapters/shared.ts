import { z } from 'zod';
import {
  ArticleKind,
  ArticleRef,
  Difficulty,
  isDemoSource,
  isMounted,
  KnownRepoId,
  REPO_DEFAULT_BRANCH,
  REPO_IS_PRIVATE,
  REPO_ORIGINS,
  Status,
} from '../common.js';
import { AdapterError } from './types.js';

/**
 * Fields every corpus carries in some form. Per-repo schemas extend this rather
 * than restate it, so a convention change that is genuinely suite-wide is one edit.
 *
 * NOT YET VERIFIED against the real corpus files — authored from the conventions
 * recorded in each repo's own roadmap.md and progress.md. Session 2 task 1 runs
 * these against all seven submodules and reports every mismatch. Treat a parse
 * failure as evidence about this file, not about the article.
 *
 * Session 1 audited all seven candidate repos. Four are markdown corpora and share
 * this shape. Three — `auth`, `authz`, `websec` — are runnable demo apps with no
 * `docs/` folder and no frontmatter, and have no adapter at all.
 *
 * These field names are still UNVERIFIED against the four real corpora; session 2
 * runs them and reports every mismatch.
 */
export const BaseFrontmatter = z.object({
  /**
   * Session 2 audit: no article in any of the four corpora carries a `title`
   * key. Titles live as the body's H1, matching the fumadocs finding from
   * session 1. Optional here; `deriveTitle()` falls back to the H1 and throws
   * if neither exists. The one corpus file that DOES set `title` in
   * frontmatter (`nextjs/docs/recipes/index.md`) is a listing page excluded
   * from article discovery entirely — see `isIndexFile`.
   */
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  /**
   * Session 2 audit: `status` is a plain string in `nextjs`/`angular`
   * (`draft`, `review`, `needs-upgrade`, ...) but an OBJECT in `react`/`nestjs`
   * concept files and in some `angular` recipes (`{ drafted, reviewed }` /
   * `{ upgraded, reviewed }`). `normaliseStatus` accepts both shapes.
   */
  status: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  wave: z.union([z.number(), z.string()]).optional(),
  difficulty: z.string().optional(),
  related: z.array(z.string()).optional(),
});

/** Maps corpus mount points and full repo names onto a RepoId. */
const REPO_ALIASES: Record<string, KnownRepoId> = {
  nextjs: 'nextjs',
  'nextjs-concepts': 'nextjs',
  react: 'react',
  'react-concepts': 'react',
  reactjs: 'react',
  'reactjs-concepts': 'react',
  angular: 'angular',
  'angular-concepts': 'angular',
  nestjs: 'nestjs',
  'nestjs-concepts': 'nestjs',
  nest: 'nestjs',
  dsa: 'dsa',
  'dsa-concepts': 'dsa',
  auth: 'auth',
  authn: 'auth',
  'demo-auth-concepts': 'auth',
  authz: 'authz',
  'demo-authz-concepts': 'authz',
  websec: 'websec',
  attacked: 'websec',
  'demo-attacked-web': 'websec',
};

/**
 * Collapse a corpus `status` value onto the two states the site cares about.
 * Anything not explicitly complete is a draft — the safe direction. A draft that
 * renders in production is a worse failure than a finished article that doesn't.
 *
 * Session 2 audit found `status` written two ways across the corpora:
 *   - a plain string (`nextjs`, `angular` concepts): `draft`, `review`, `stub`,
 *     `needs-upgrade`, ...
 *   - an object (`react`/`nestjs` concepts, some `angular` recipes):
 *     `{ drafted: true, reviewed: false }` or `{ upgraded: true, reviewed: false }`
 *
 * The object form's subfields are not a documented convention — guessing that
 * `reviewed: true` means "complete" would be exactly the invented semantics
 * adapters must not supply. Every object shape collapses to `draft`
 * unconditionally, same as any unrecognised string.
 */
export function normaliseStatus(raw: string | Record<string, unknown> | undefined): Status {
  if (typeof raw !== 'string') return 'draft';
  const value = raw.trim().toLowerCase();
  return value === 'complete' || value === 'published' || value === 'final'
    ? 'complete'
    : 'draft';
}

export function normaliseWave(
  raw: number | string | undefined,
  repo: KnownRepoId,
  sourcePath: string,
): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) {
    throw new AdapterError(repo, sourcePath, `wave must be a positive integer, got ${String(raw)}`);
  }
  return n;
}

export function normaliseDifficulty(
  raw: string | undefined,
  repo: KnownRepoId,
  sourcePath: string,
): Difficulty | null {
  if (!raw) return null;
  const parsed = Difficulty.safeParse(raw.trim().toLowerCase());
  if (!parsed.success) {
    throw new AdapterError(
      repo,
      sourcePath,
      `unknown difficulty "${raw}" — vocabulary is foundational | intermediate | advanced`,
    );
  }
  return parsed.data;
}

/**
 * Parse one entry from a `related` block.
 *
 * Supported forms, all present in the corpus:
 *   how-react-renders                    same repo, concept
 *   recipes/search-race-condition        same repo, recipe (prefix confirmed session 6)
 *   concepts/how-react-renders           same repo, explicit concept prefix
 *   reactjs-concepts/how-react-renders   cross-repo
 *   reactjs/rendering/how-react-renders  cross-repo with folder, folder discarded
 *
 * The last segment is always the article id. Everything before it is scope.
 */
export function parseRelated(
  raw: string,
  defaultRepo: KnownRepoId,
  sourcePath: string,
): ArticleRef {
  const trimmed = raw.trim().replace(/\.mdx?$/, '').replace(/^\.\//, '');
  if (!trimmed) {
    throw new AdapterError(defaultRepo, sourcePath, 'empty entry in `related`');
  }

  const segments = trimmed.split('/').filter(Boolean);
  const articleId = segments.pop();
  if (!articleId) {
    throw new AdapterError(defaultRepo, sourcePath, `unparseable related ref "${raw}"`);
  }

  let repo: KnownRepoId = defaultRepo;
  let kind: ArticleKind = 'concept';

  for (const segment of segments) {
    const alias = REPO_ALIASES[segment.toLowerCase()];
    if (alias) repo = alias;
    else if (segment === 'recipes' || segment === 'recipe') kind = 'recipe';
  }

  const resolution = isMounted(repo) ? 'article' : isDemoSource(repo) ? 'demo' : 'planned';
  return { repo, articleId, kind, resolution, raw };
}

/**
 * Session 2 audit: zero articles across all four corpora carry a `title` key —
 * every one relies on the body's H1, which is also why fumadocs' schema was
 * loosened in session 1. `deriveTitle` prefers an explicit frontmatter title
 * (so a corpus can opt back in later) and falls back to the first `# ` heading
 * in the body. Neither present is a real failure, not a default.
 */
export function deriveTitle(
  raw: string | undefined,
  body: string,
  repo: KnownRepoId,
  sourcePath: string,
): string {
  const explicit = raw?.trim();
  if (explicit) return explicit;

  const match = /^#\s+(.+)$/m.exec(body);
  const heading = match?.[1]?.trim();
  if (!heading) {
    throw new AdapterError(
      repo,
      sourcePath,
      'no `title` in frontmatter and no `# ` H1 heading in the body to derive one from',
    );
  }
  return heading;
}

/**
 * Session 2 audit: `nextjs/docs/recipes/index.md` is a hand-authored listing
 * page inside the recipes tree — it has `title` but no `article_id`/`recipe_id`
 * and would otherwise be mistaken for a malformed article. Filename-based, not
 * content-based, so it applies uniformly across corpora without guessing at
 * any one file's intent.
 */
export function isIndexFile(sourcePath: string): boolean {
  return sourcePath.split('/').pop() === 'index.md';
}

/** Returns null for private corpora — see REPO_IS_PRIVATE. */
export function buildSourceUrl(repo: KnownRepoId, sourcePath: string): string | null {
  if (REPO_IS_PRIVATE[repo]) return null;
  return `https://github.com/${REPO_ORIGINS[repo]}/blob/${REPO_DEFAULT_BRANCH[repo]}/${sourcePath}`;
}

/**
 * The dek is required. If the Q1 frontmatter pass has not reached this file yet,
 * fail with the exact path so the fix lands in the corpus repo. Deriving it from
 * the first paragraph was considered and rejected: ~30% of articles open with a
 * callout, and the derived text reads badly as a meta description.
 */
export function requireDescription(
  raw: string | undefined,
  repo: KnownRepoId,
  sourcePath: string,
): string {
  const value = raw?.trim();
  if (!value) {
    throw new AdapterError(
      repo,
      sourcePath,
      'missing `description` — run the corpus description pass (prompts/corpus-description-pass.md)',
    );
  }
  return value;
}
