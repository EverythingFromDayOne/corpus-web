import { z } from 'zod';
import type { Article } from '../article.js';
import { articleUid, type RepoId } from '../common.js';
import {
  BaseFrontmatter,
  buildSourceUrl,
  normaliseDifficulty,
  normaliseStatus,
  normaliseWave,
  parseRelated,
  requireDescription,
} from './shared.js';
import { AdapterError, type AdapterInput, type RepoAdapter } from './types.js';

interface AdapterSpec {
  repo: RepoId;
  include: string[];
  /** Frontmatter key holding the concept article id, e.g. `article_id`. */
  conceptIdKey: string;
  /** Frontmatter key holding the recipe article id, e.g. `recipe_id`. */
  recipeIdKey: string;
  /** Frontmatter key holding the folder, e.g. `concept_folder`. */
  folderKey: string;
  /** Frontmatter key holding the version baseline, e.g. `react_baseline`. */
  baselineKey: string;
  /** Human framework name recorded on the baseline. */
  framework: string;
  /** Extra per-repo frontmatter fields, merged into the base schema. */
  extend?: z.ZodRawShape;
}

/**
 * Builds an adapter from a spec.
 *
 * Every corpus differs only in field NAMES, not in field MEANING, so five
 * hand-written adapters would be five copies of one function with the strings
 * changed. The spec is the difference; the behaviour is shared. If a corpus ever
 * diverges in meaning rather than naming, write a real adapter for it and drop it
 * from this factory — do not add a flag.
 */
export function createAdapter(spec: AdapterSpec): RepoAdapter {
  const schema = BaseFrontmatter.extend(spec.extend ?? {}).passthrough();

  return {
    repo: spec.repo,
    include: spec.include,
    schema,

    toArticle(input: AdapterInput): Article {
      const { sourcePath, contentHash } = input;
      const parsed = schema.safeParse(input.frontmatter);
      if (!parsed.success) {
        throw new AdapterError(
          spec.repo,
          sourcePath,
          `frontmatter failed validation: ${parsed.error.issues
            .map((i) => `${i.path.join('.') || '(root)'} ${i.message}`)
            .join('; ')}`,
        );
      }

      const fm = parsed.data as Record<string, unknown>;
      const conceptId = asOptionalString(fm[spec.conceptIdKey]);
      const recipeId = asOptionalString(fm[spec.recipeIdKey]);

      if (conceptId && recipeId) {
        throw new AdapterError(
          spec.repo,
          sourcePath,
          `has both ${spec.conceptIdKey} and ${spec.recipeIdKey} — an article is one or the other`,
        );
      }

      const articleId = conceptId ?? recipeId;
      if (!articleId) {
        throw new AdapterError(
          spec.repo,
          sourcePath,
          `missing ${spec.conceptIdKey} or ${spec.recipeIdKey}`,
        );
      }

      const expectedId = basenameSlug(sourcePath);
      if (articleId !== expectedId) {
        throw new AdapterError(
          spec.repo,
          sourcePath,
          `id "${articleId}" does not match filename "${expectedId}" — the id is always the filename slug`,
        );
      }

      const folder = asOptionalString(fm[spec.folderKey]) ?? dirnamePath(sourcePath);
      const baselineVersion = asOptionalString(fm[spec.baselineKey]);
      if (!baselineVersion) {
        throw new AdapterError(spec.repo, sourcePath, `missing ${spec.baselineKey}`);
      }

      return {
        uid: articleUid(spec.repo, articleId),
        repo: spec.repo,
        articleId,
        kind: recipeId ? 'recipe' : 'concept',
        folder,
        title: String(fm.title),
        description: requireDescription(asOptionalString(fm.description), spec.repo, sourcePath),
        wave: normaliseWave(fm.wave as number | string | undefined, spec.repo, sourcePath),
        difficulty: normaliseDifficulty(
          asOptionalString(fm.difficulty),
          spec.repo,
          sourcePath,
        ),
        baseline: { framework: spec.framework, version: baselineVersion },
        status: normaliseStatus(asOptionalString(fm.status)),
        related: (Array.isArray(fm.related) ? (fm.related as string[]) : []).map((r) =>
          parseRelated(r, spec.repo, sourcePath),
        ),
        sourcePath,
        sourceUrl: buildSourceUrl(spec.repo, sourcePath),
        contentHash,
      };
    },
  };
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** `docs/concepts/rendering/how-react-renders.md` -> `how-react-renders` */
function basenameSlug(sourcePath: string): string {
  const file = sourcePath.split('/').pop() ?? '';
  return file.replace(/\.mdx?$/, '');
}

/** `docs/concepts/rendering/foo.md` -> `rendering` */
function dirnamePath(sourcePath: string): string {
  const parts = sourcePath.split('/').slice(0, -1);
  const docsIndex = parts.indexOf('docs');
  const scoped = docsIndex >= 0 ? parts.slice(docsIndex + 1) : parts;
  return scoped.join('/') || 'root';
}
