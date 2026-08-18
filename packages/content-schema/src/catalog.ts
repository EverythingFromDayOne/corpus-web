import { z } from 'zod';
import { ArticleWithSections } from './article.js';
import { ArticleUid, RepoId } from './common.js';
import { PathDefinition } from './curation.js';

/**
 * A file the adapter selected as an article and could not adapt, so it is
 * absent from `Catalog.articles`.
 *
 * There is no `uid` here on purpose: adaptation is what produces one, and every
 * failure is a file that did not get that far. `sourcePath` is the only stable
 * identity a failed file has.
 */
export const CatalogFailure = z.object({
  repo: RepoId,
  /** Repo-relative, e.g. `docs/concepts/caching/tags-and-invalidation.md`. */
  sourcePath: z.string().min(1),
  /** The `AdapterError` message, with its per-file prefix stripped so identical reasons group. */
  reason: z.string().min(1),
});
export type CatalogFailure = z.infer<typeof CatalogFailure>;

/** One `related` ref, as a graph edge between two article uids. */
export const LinkEdge = z.object({ from: ArticleUid, to: ArticleUid });
export type LinkEdge = z.infer<typeof LinkEdge>;

/**
 * A ref whose target is a real file that did not adapt.
 *
 * `to` is the uid the ref names, which no article in this catalog carries.
 * `sourcePath` is the excluded file itself, so an entry here joins directly to
 * the `CatalogFailure` that explains it rather than leaving a reader to guess
 * which of the excluded files this was.
 */
export const ExcludedTarget = z.object({
  from: ArticleUid,
  to: ArticleUid,
  sourcePath: z.string().min(1),
});
export type ExcludedTarget = z.infer<typeof ExcludedTarget>;

/**
 * A ref whose target exists in no corpus at all — no article, and no excluded
 * file either. Recorded in the catalog so a content-watch diff has a real
 * snapshot to compare; `verify-links` is the gate that fails on them.
 */
export const UnresolvedTarget = z.object({
  from: ArticleUid,
  raw: z.string(),
  reason: z.string(),
});
export type UnresolvedTarget = z.infer<typeof UnresolvedTarget>;

/**
 * `catalog.json` — the only artifact the API knows about content.
 *
 * Produced by scripts/build-catalog.mjs at build time, POSTed to
 * `api/catalog/sync` on deploy. The API upserts `lessons` keyed on
 * (repo, article_id) and marks vanished rows archived — never deleted, because
 * `lesson_progress` points at them and articles get renamed and moved.
 *
 * The catalog is emit-with-exclusions, not all-or-nothing: an article that
 * cannot adapt is left out of `articles` and recorded in `failures`, the same
 * way a draft is left out of a production render without failing the build.
 * `verify-catalog` then fails on a non-empty `failures`, so the gate keeps its
 * teeth while the artifact stops being hostage to the worst file in the corpus.
 *
 * Exclusion has a second cost the artifact has to carry: every `related` ref
 * pointing at an excluded or draft article is now a ref to a page with no route.
 * Those refs travel in `excludedTargets` and `draftTargets` so a renderer can
 * emit plain text rather than a link that 404s — see `LinkReport`. Refs whose
 * target exists in no corpus at all travel in `unresolvedTargets` the same way:
 * the artifact still writes, and `verify-links` is what fails on them.
 */
export const Catalog = z.object({
  schema: z.literal(1),
  /** ISO timestamp of the build that produced this catalog. */
  builtAt: z.string().datetime(),
  /** Submodule tag per corpus, so a catalog is traceable to exact content. */
  sources: z.record(RepoId, z.object({ tag: z.string(), commit: z.string() })),
  articles: z.array(ArticleWithSections),
  /** Selected files that did not adapt and are therefore absent from `articles`. */
  failures: z.array(CatalogFailure),
  paths: z.array(PathDefinition),
  /** Live cross-article graph. Every edge points at an article present in `articles`. */
  edges: z.array(LinkEdge),
  /**
   * Refs whose target is a real corpus file that this catalog does not contain —
   * every one of them is a file in `failures`. A renderer must emit these as
   * plain text, never as a link: the target has no route.
   */
  excludedTargets: z.array(ExcludedTarget),
  /**
   * Refs whose target adapted but is `draft`, in a build that is not showing
   * drafts. Same rendering rule as `excludedTargets` — plain text, no link.
   */
  draftTargets: z.array(LinkEdge),
  /**
   * Refs whose target exists in no corpus at all. Same rendering rule as
   * `excludedTargets` — plain text, no link. `verify-links` fails on a
   * non-empty list; `build-catalog` still writes so a catalog diff is
   * meaningful while that gate is red.
   */
  unresolvedTargets: z.array(UnresolvedTarget),
  /** Old id -> new id, from renames. Feeds `lesson_aliases` and Next `redirects()`. */
  aliases: z.array(LinkEdge),
});
export type Catalog = z.infer<typeof Catalog>;

/**
 * Result of resolving `related` blocks, classified by WHY a ref does or does not
 * land on a page. The four buckets for an `article`-resolution ref are `edges`,
 * `excludedTargets`, `draftTargets`, and `unresolvedTargets`. Only the last is
 * fatal, and only in `verify-links` — `build-catalog` records it and writes.
 *
 * The split exists so the build fails once on a root cause and never again on
 * its symptoms. One article that cannot adapt is one failure in
 * `Catalog.failures`; the refs pointing at it are that same failure seen from
 * the other end, and reporting them as unresolved buries the breakage that has
 * no other report anywhere.
 */
export const LinkReport = z.object({
  /** Target adapted and is renderable. The only bucket that becomes a live link. */
  edges: z.array(LinkEdge),
  /**
   * Target is a real corpus file that failed to adapt, so it is in
   * `Catalog.failures` and absent from `Catalog.articles`. WARNS. The root cause
   * is already reported once, by path and reason, in `failures` and by
   * `verify-frontmatter`; failing here too would restate it once per inbound
   * ref and bury the refs that point at nothing at all.
   */
  excludedTargets: z.array(ExcludedTarget),
  /**
   * Target adapted but is `draft`, and this build is not showing drafts. WARNS,
   * and is recorded so a renderer can degrade the ref to plain text. A link to
   * a page that 404s is a rendering bug; the ref itself is correct and becomes
   * live the day the article is marked complete.
   */
  draftTargets: z.array(LinkEdge),
  /**
   * Target exists in no corpus at all — no article, and no excluded file
   * either. FATAL for `verify-links`. Cross-repo links WARN in the corpus
   * repos because they cannot resolve standalone; here they CAN, so that gate
   * is deliberately stronger than the per-repo one. `build-catalog` records
   * the same list in `Catalog.unresolvedTargets` and still writes: the
   * artifact existing is what makes every downstream diff meaningful.
   */
  unresolvedTargets: z.array(UnresolvedTarget),
  /**
   * Points at a known corpus that has no remote yet — currently `dsa`.
   * WARNS, never fails. The work exists; it just is not published. Failing the
   * build over a link to unpublished-but-real work would push authors toward
   * deleting correct cross-references, which is the wrong incentive.
   */
  plannedTargets: z.array(
    z.object({ from: ArticleUid, raw: z.string(), repo: z.string() }),
  ),
  /**
   * Points at a runnable demo app rather than an article — `auth`, `authz`,
   * `websec`. WARNS. These are legitimate references; they just resolve to a
   * demo rather than to a page in the corpus.
   */
  demoTargets: z.array(
    z.object({ from: ArticleUid, raw: z.string(), repo: z.string() }),
  ),
});
export type LinkReport = z.infer<typeof LinkReport>;
