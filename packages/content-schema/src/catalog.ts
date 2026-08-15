import { z } from 'zod';
import { ArticleWithSections } from './article.js';
import { ArticleUid, RepoId } from './common.js';
import { PathDefinition } from './curation.js';

/**
 * `catalog.json` — the only artifact the API knows about content.
 *
 * Produced by scripts/build-catalog.mjs at build time, POSTed to
 * `api/catalog/sync` on deploy. The API upserts `lessons` keyed on
 * (repo, article_id) and marks vanished rows archived — never deleted, because
 * `lesson_progress` points at them and articles get renamed and moved.
 */
export const Catalog = z.object({
  schema: z.literal(1),
  /** ISO timestamp of the build that produced this catalog. */
  builtAt: z.string().datetime(),
  /** Submodule tag per corpus, so a catalog is traceable to exact content. */
  sources: z.record(RepoId, z.object({ tag: z.string(), commit: z.string() })),
  articles: z.array(ArticleWithSections),
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
});
export type LinkReport = z.infer<typeof LinkReport>;
