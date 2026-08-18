import type { Root } from 'mdast';
import { z } from 'zod';
import {
  ArticleKind,
  ArticleRef,
  AuthoringStage,
  Difficulty,
  isDemoSource,
  isMounted,
  KnownRepoId,
  REPO_DEFAULT_BRANCH,
  REPO_IS_PRIVATE,
  REPO_ORIGINS,
} from '../common.js';
import { findTitleHeading } from '../sections.js';
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
   * session 1. Optional here; `deriveTitle()` falls back to the body's own H1
   * and throws if neither exists. The one corpus file that DOES set `title` in
   * frontmatter (`nextjs/docs/recipes/index.md`) is a listing page excluded
   * from article discovery entirely — see `isIndexFile`.
   */
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  /**
   * Raw authoring-stage value from corpus frontmatter. A plain string in
   * `nextjs`/`angular` (`draft`, `review`, `needs-upgrade`, ...) and an object
   * in `react`/`nestjs` concept files and some `angular` recipes
   * (`{ drafted, reviewed }` / `{ upgraded, reviewed }`).
   * `normaliseAuthoringStage` carries it through as a comparable string; it
   * is not a publication gate.
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
 * Carry a corpus `status` value through as a typed, comparable string for
 * display. Authoring stage is not a publication gate — adaptation success is
 * the sole publication gate. An article that adapts renders, and this field
 * is only the author's own workflow bookmark.
 *
 * Session 2 audit found `status` written two ways across the corpora:
 *   - a plain string (`nextjs`, `angular` concepts): `draft`, `review`, `stub`,
 *     `needs-upgrade`, ...
 *   - an object (`react`/`nestjs` concepts, some `angular` recipes):
 *     `{ drafted: true, reviewed: false }` or `{ upgraded: true, reviewed: false }`
 *
 * Strings are trimmed and lowercased for consistency only — `review` and
 * `needs-upgrade` stay distinct. Objects are encoded as a stable canonical
 * string (`drafted:true,reviewed:false`) so field order in the corpus does
 * not produce two different-looking stages for the same data, and so which
 * flags were set is not collapsed away.
 */
export function normaliseAuthoringStage(
  raw: string | Record<string, unknown> | undefined,
): AuthoringStage {
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();
    return trimmed || 'unspecified';
  }
  if (raw && typeof raw === 'object') {
    const encoded = Object.keys(raw)
      .sort()
      .map((key) => `${key}:${String(raw[key])}`)
      .join(',');
    return encoded || 'unspecified';
  }
  return 'unspecified';
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
 * (so a corpus can opt back in later) and falls back to the body's own H1.
 * Neither present is a real failure, not a default.
 *
 * The H1 is located by walking the parsed body — see `findTitleHeading`. The
 * first implementation matched `/^#\s+(.+)$/m` against the raw text, which is
 * a line scanner and cannot tell a heading from a line of shell that happens
 * to start with `# `. It read `# TypeScript projects also need the Babel core
 * types:` out of a fenced block in `react/rendering/react-compiler-deep-dive.md`
 * and accepted it as that article's title, silently, which is worse than the
 * loud failure the article had earned: it has no H1 at all.
 *
 * Pass the `Root` rather than the string wherever the caller has already
 * parsed the body for `extractSections`, so each file is parsed once.
 */
export function deriveTitle(
  raw: string | undefined,
  body: string | Root,
  repo: KnownRepoId,
  sourcePath: string,
): string {
  const explicit = raw?.trim();
  if (explicit) return explicit;

  const heading = findTitleHeading(body);
  if (!heading) {
    throw new AdapterError(
      repo,
      sourcePath,
      'no `title` in frontmatter and no H1 in the body to derive one from — ' +
        'a `# ` line inside a code fence, an indented code block, or a blockquote is not a heading',
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
