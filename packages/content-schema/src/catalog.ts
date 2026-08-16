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
  /** Resolved cross-article graph. Every edge here is guaranteed to resolve. */
  edges: z.array(z.object({ from: ArticleUid, to: ArticleUid })),
  /** Old id -> new id, from renames. Feeds `lesson_aliases` and Next `redirects()`. */
  aliases: z.array(z.object({ from: ArticleUid, to: ArticleUid })),
});
export type Catalog = z.infer<typeof Catalog>;

/** Result of resolving `related` blocks. Unresolved refs are a hard failure here. */
export const LinkReport = z.object({
  resolved: z.array(z.object({ from: ArticleUid, to: ArticleUid })),
  /**
   * Cross-repo links WARN in the corpus repos because they cannot resolve
   * standalone. Here they CAN, so here they are fatal. This gate is deliberately
   * stronger than the per-repo one.
   */
  unresolved: z.array(
    z.object({ from: ArticleUid, raw: z.string(), reason: z.string() }),
  ),
  /** Resolves, but the target is a draft. Fatal in production builds. */
  draftTargets: z.array(z.object({ from: ArticleUid, to: ArticleUid })),
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
