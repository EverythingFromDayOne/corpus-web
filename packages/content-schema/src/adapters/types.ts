import type { z } from 'zod';
import type { Article, ArticleSection } from '../article.js';
import type { KnownRepoId, RepoId } from '../common.js';

/** Everything the adapter is handed about one file on disk. */
export interface AdapterInput {
  /** Parsed YAML frontmatter, unvalidated. */
  frontmatter: unknown;
  /** Path relative to the corpus repo root, e.g. `docs/concepts/rendering/foo.md`. */
  sourcePath: string;
  /** Body with frontmatter stripped. Used for the hash and heading extraction. */
  body: string;
  /** sha256 of `body`, computed by the caller so hashing stays in one place. */
  contentHash: string;
  /** Headings already extracted by the caller. */
  sections: ArticleSection[];
}

/**
 * One adapter per corpus. The compatibility shim between seven repos that are
 * deliberately allowed to keep their own conventions and one internal shape.
 *
 * Rule: an adapter NORMALISES. It never guesses. If a required field is absent
 * the adapter throws with the source path and the field name — the fix belongs
 * in the corpus repo, not in a default value here.
 */
export interface RepoAdapter {
  repo: RepoId;
  /** Globs, relative to `content/<repo>/`, that select article files. */
  include: string[];
  /** Raw frontmatter schema for this corpus, before normalisation. */
  schema: z.ZodTypeAny;
  /** Normalise one file into the internal shape. */
  toArticle(input: AdapterInput): Article;
}

export class AdapterError extends Error {
  constructor(
    readonly repo: KnownRepoId,
    readonly sourcePath: string,
    message: string,
  ) {
    super(`[${repo}] ${sourcePath}: ${message}`);
    this.name = 'AdapterError';
  }
}
