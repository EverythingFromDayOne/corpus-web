import { z } from 'zod';

/**
 * Corpus repos that are MOUNTED — a GitHub repo of markdown articles, submoduled
 * under `content/`. Four, confirmed by the session 1 audit.
 *
 * `auth`, `authz`, and `websec` were registered here on the assumption that they
 * were corpora. They are not — see `DemoSourceId`. Assuming a repo is a corpus
 * because its name ends in `-concepts` was the error; the audit was designed to
 * catch exactly this and did.
 */
export const RepoId = z.enum(['nextjs', 'react', 'angular', 'nestjs']);
export type RepoId = z.infer<typeof RepoId>;

/**
 * Corpora that EXIST but are not mounted — no GitHub remote yet, so they cannot
 * be submoduled and produce no articles.
 *
 * `dsa-concepts` is local-only: 13 verified articles, 118/118 code blocks,
 * 539/539 tests, and no remote. Tracked in `progress.md` under Debt D1.
 *
 * A `related` ref pointing here WARNS rather than failing. Deleting `dsa` outright
 * would make every such link an unresolved ref, and `verify-links` hard-fails on
 * those — which would push authors toward deleting correct cross-references.
 */
export const PlannedRepoId = z.enum(['dsa']);
export type PlannedRepoId = z.infer<typeof PlannedRepoId>;

/**
 * Runnable demo applications, NOT article corpora. No `docs/`, no frontmatter,
 * no adapters, and they produce zero articles.
 *
 *   auth   -> demo-auth-concepts
 *   authz  -> demo-authz-concepts
 *   websec -> demo-attacked-web
 *
 * Their role on the site is undecided — see `docs/adr/0002-demo-labs.md`. They are
 * registered here for one reason only: a `related` ref pointing at one must resolve
 * to something recognisable and WARN, rather than hard-failing the build as an
 * unknown repo.
 */
export const DemoSourceId = z.enum(['auth', 'authz', 'websec']);
export type DemoSourceId = z.infer<typeof DemoSourceId>;

/** Anything the system recognises: mounted corpora, planned corpora, demo apps. */
export const KnownRepoId = z.union([RepoId, PlannedRepoId, DemoSourceId]);
export type KnownRepoId = z.infer<typeof KnownRepoId>;

export function isMounted(repo: KnownRepoId): repo is RepoId {
  return RepoId.safeParse(repo).success;
}

export function isDemoSource(repo: KnownRepoId): repo is DemoSourceId {
  return DemoSourceId.safeParse(repo).success;
}

/** Maps a mount point to the GitHub repo it is a submodule of. */
export const REPO_ORIGINS: Record<KnownRepoId, string> = {
  nextjs: 'EverythingFromDayOne/nextjs-concepts',
  react: 'EverythingFromDayOne/react-concepts',
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
  react: false,
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
 * All CONFIRMED by the session 1 audit: `main` for `nextjs` and `nestjs`,
 * `master` for everything else. The earlier blanket assumption of `main` was
 * wrong for three of the four corpora — every wrong entry is a silently 404ing
 * "View source" link across an entire corpus. Debt D4 is closed.
 */
export const REPO_DEFAULT_BRANCH: Record<KnownRepoId, string> = {
  nextjs: 'main',
  react: 'master',
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
  react: 'React',
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
 * The corpus author's own workflow label, carried through for potential UI
 * display. It must never be read as a publication or completeness signal —
 * adaptation is the real publication gate. An article that adapts is published;
 * this field is a bookmark the author left for themselves.
 *
 * Corpus frontmatter writes this as a string (`draft`, `review`,
 * `needs-upgrade`, ...) or as an object (`{ drafted, reviewed }` /
 * `{ upgraded, reviewed }`). Adapters encode the object form as a stable
 * canonical string (`drafted:true,reviewed:false`) so the value stays
 * comparable without collapsing which flags were set.
 */
export const AuthoringStage = z.string().min(1);
export type AuthoringStage = z.infer<typeof AuthoringStage>;

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
    /^(nextjs|react|angular|nestjs|dsa|auth|authz|websec)\/[a-z0-9-]+$/,
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
  /**
   * How this ref must be treated at resolution time:
   *   article — mounted corpus, must resolve to a real article or FAIL
   *   planned — corpus exists but has no remote yet, WARN
   *   demo    — points at a runnable demo app, not an article, WARN
   */
  resolution: z.enum(['article', 'planned', 'demo']),
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
