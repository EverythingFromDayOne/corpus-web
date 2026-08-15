import { z } from 'zod';
import {
  ArticleKind,
  ArticleRef,
  ArticleUid,
  Baseline,
  Difficulty,
  FolderPath,
  RepoId,
  Slug,
  Status,
} from './common.js';

/**
 * The one shape the rest of the system sees.
 *
 * Seven corpora with seven slightly different frontmatter conventions normalise
 * into this. When a corpus changes its frontmatter, exactly one adapter changes
 * — never 120 article files, and never this type.
 */
export const Article = z.object({
  /** `${repo}/${articleId}`. Stable forever. The FK target for every progress row. */
  uid: ArticleUid,
  repo: RepoId,
  /** Filename slug. Never a sequence number. */
  articleId: Slug,
  kind: ArticleKind,
  /** Folder inside the corpus, used for the sidebar tree and the URL path. */
  folder: FolderPath,

  title: z.string().min(1),
  /**
   * The dek — the one-line subtitle under the H1, and the meta description.
   * Required. Added to the five framework corpora in the Q1 frontmatter pass; an article
   * without one is a build failure, not a fallback to the first paragraph.
   */
  description: z.string().min(1).max(300),

  wave: z.number().int().positive().nullable(),
  difficulty: Difficulty.nullable(),
  baseline: Baseline,
  status: Status,
  related: z.array(ArticleRef),

  /** Path within the corpus repo, e.g. `docs/concepts/rendering/foo.md`. */
  sourcePath: z.string().min(1),
  /**
   * GitHub URL for the "View source" link. Built from REPO_ORIGINS + sourcePath
   * + the corpus's default branch.
   *
   * `null` when the corpus is private — the URL would resolve to a 404 for every
   * reader, and a dead affordance is worse than an absent one. The renderer must
   * hide the control rather than render a broken link.
   */
  sourceUrl: z.string().url().nullable(),
  /**
   * sha256 of the article body, hex.
   *
   * The pivot for catalog sync: an unchanged hash is a no-op. A changed hash flags
   * affected `lesson_progress` rows for OPTIONAL invalidation — never automatic.
   * A typo fix must not wipe a reader's completion.
   */
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type Article = z.infer<typeof Article>;

/** Headings extracted from the body. Drives the TOC rail and `lesson_sections`. */
export const ArticleSection = z.object({
  anchor: z.string().min(1),
  heading: z.string().min(1),
  depth: z.union([z.literal(2), z.literal(3)]),
  ordinal: z.number().int().nonnegative(),
});
export type ArticleSection = z.infer<typeof ArticleSection>;

export const ArticleWithSections = Article.extend({
  sections: z.array(ArticleSection),
});
export type ArticleWithSections = z.infer<typeof ArticleWithSections>;
