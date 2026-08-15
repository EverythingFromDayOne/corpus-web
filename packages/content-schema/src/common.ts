import { z } from 'zod';

/**
 * Corpus repos that are MOUNTED — a GitHub repo exists and is submoduled under
 * `content/`. Seven, confirmed 2026-08-15.
 */
export const RepoId = z.enum([
  'nextjs',
  'reactjs',
  'angular',
  'nestjs',
  'auth',
  'authz',
  'websec',
]);
export type RepoId = z.infer<typeof RepoId>;

/**
 * Corpora that EXIST but are not mounted — no GitHub remote yet, so they cannot
 * be submoduled and produce no articles.
 *
 * `dsa-concepts` is local-only as of 2026-08-15: 13 verified articles, 118/118
 * code blocks, 539/539 tests, and no remote. Tracked in `progress.md` under Debt.
 *
 * This distinction exists for one reason: a `related` ref in another corpus that
 * points at a planned corpus must WARN, not fail. Deleting `dsa` outright would
 * make every such link an unresolved ref, and `verify-links` hard-fails on those
 * here. Warning on a link to known-but-unpublished work is correct; failing the
 * build over it is not.
 */
export const PlannedRepoId = z.enum(['dsa']);
export type PlannedRepoId = z.infer<typeof PlannedRepoId>;

/** Any corpus the system recognises, mounted or not. */
export const KnownRepoId = z.union([RepoId, PlannedRepoId]);
export type KnownRepoId = z.infer<typeof KnownRepoId>;

export function isMounted(repo: KnownRepoId): repo is RepoId {
  return RepoId.safeParse(repo).success;
}

/** Maps a mount point to the GitHub repo it is a submodule of. */
export const REPO_ORIGINS: Record<KnownRepoId, string> = {
  nextjs: 'EverythingFromDayOne/nextjs-concepts',
  reactjs: 'EverythingFromDayOne/react-concepts',
  angular: 'EverythingFromDayOne/angular-concepts',
  nestjs: 'EverythingFromDayOne/nestjs-concepts',
  auth: 'EverythingFromDayOne/demo-auth-concepts',
  authz: 'EverythingFromDayOne/demo-authz-concepts',
  websec: 'EverythingFromDayOne/demo-attacked-web',
  /** Planned — this remote does not exist yet. */
  dsa: 'EverythingFromDayOne/dsa-concepts',
};

/**
 * Visibility per corpus. All public as of 2026-08-15 — `nestjs-concepts` was
 * private and was switched to public rather than wiring a credential.
 *
 * The map is retained deliberately even though every value is `false`. A
 * corpus going private later is a silent failure with three distinct symptoms:
 * `actions/checkout` cannot clone it with `GITHUB_TOKEN` (scoped to this repo
 * only), Vercel builds fail the same way, and `sourceUrl` renders a link every
 * reader gets a 404 from. Keeping the switch means flipping one boolean instead
 * of rediscovering all three.
 */
export const REPO_IS_PRIVATE: Record<KnownRepoId, boolean> = {
  nextjs: false,
  reactjs: false,
  angular: false,
  nestjs: false,
  auth: false,
  authz: false,
  websec: false,
  dsa: false,
};

/**
 * Default branch per corpus. NOT uniform — `demo-authz-concepts` is on `master`,
 * and the sibling `AngularDemos` repo uses `development`, so assuming `main`
 * everywhere silently 404s every "View source" link from the affected corpora.
 *
 * Observed 2026-08-15 via `gh repo view` (session 1). Only `nextjs` and
 * `nestjs` use `main`. The rest, including `react-concepts` and
 * `angular-concepts`, are `master`.
 */
export const REPO_DEFAULT_BRANCH: Record<KnownRepoId, string> = {
  nextjs: 'main',
  reactjs: 'master',
  angular: 'master',
  nestjs: 'main',
  auth: 'master',
  authz: 'master',
  websec: 'master',
  /** Planned — assumed, no remote to check. */
  dsa: 'main',
};

/**
 * Display names for the sidebar and breadcrumbs.
 *
 * `auth` and `authz` are one character apart in a URL, which is a real
 * misreading risk. The mount points stay short to match the repo names; the
 * chrome always shows the full label so the distinction is never carried by
 * the slug alone.
 */
export const REPO_LABELS: Record<KnownRepoId, string> = {
  nextjs: 'Next.js',
  reactjs: 'React',
  angular: 'Angular',
  nestjs: 'NestJS',
  auth: 'Authentication',
  authz: 'Authorization',
  websec: 'Web Security',
  dsa: 'Data Structures & Algorithms',
};

export const ArticleKind = z.enum(['concept', 'recipe']);
export type ArticleKind = z.infer<typeof ArticleKind>;

/**
 * Confirmed vocabulary (reactjs-concepts session 6). Do not extend without
 * confirming against the corpus — an unrecognised value must fail loudly, not
 * silently normalise to `null`.
 */
export const Difficulty = z.enum(['foundational', 'intermediate', 'advanced']);
export type Difficulty = z.infer<typeof Difficulty>;

/**
 * Normalised publication state. Corpus repos carry richer values; adapters
 * collapse anything not explicitly complete into `draft`, which is the safe
 * direction — a draft that renders is worse than a finished article that doesn't.
 */
export const Status = z.enum(['draft', 'complete']);
export type Status = z.infer<typeof Status>;

/**
 * A slug. Never a sequence number — renumbering must never touch article files.
 * Lowercase, hyphenated, no path separators.
 */
export const Slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase hyphenated slug');

/** A folder path inside a corpus, e.g. `rendering` or `recipes/data-fetching`. */
export const FolderPath = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/, 'must be a lowercase hyphen/slash path');

/**
 * A globally unique article identifier: `${repo}/${articleId}`.
 *
 * The repo prefix is what makes cross-corpus linking possible at all, and it is
 * why the site can hard-fail on links the corpus repos can only warn about.
 */
export const ArticleUid = z
  .string()
  .regex(
    /^(nextjs|reactjs|angular|nestjs|auth|authz|websec|dsa)\/[a-z0-9-]+$/,
    'must be `<repo>/<slug>`',
  );
export type ArticleUid = z.infer<typeof ArticleUid>;

export function articleUid(repo: KnownRepoId, articleId: string): ArticleUid {
  return `${repo}/${articleId}`;
}

/**
 * A reference from one article to another, as written in a `related` block.
 *
 * Corpus forms, all supported:
 *   `how-react-renders`                      same repo, concept
 *   `recipes/search-race-condition`          same repo, recipe (prefix confirmed)
 *   `reactjs-concepts/how-react-renders`     cross-repo
 *   `reactjs/how-react-renders`              cross-repo, mount-point form
 */
export const ArticleRef = z.object({
  repo: KnownRepoId,
  /** True when the target corpus has no remote yet — resolution WARNS, never fails. */
  planned: z.boolean(),
  articleId: Slug,
  kind: ArticleKind,
  /** Exactly as written in the source, for error messages that point at real text. */
  raw: z.string(),
});
export type ArticleRef = z.infer<typeof ArticleRef>;

/** The framework and version an article's claims are pinned to. */
export const Baseline = z.object({
  framework: z.string().min(1),
  version: z.string().min(1),
});
export type Baseline = z.infer<typeof Baseline>;
