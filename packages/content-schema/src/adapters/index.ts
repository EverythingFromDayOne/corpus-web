import { z } from 'zod';
import type { RepoId } from '../common.js';
import { createAdapter } from './factory.js';
import type { RepoAdapter } from './types.js';

export * from './types.js';
export * from './shared.js';
export { createAdapter } from './factory.js';

/**
 * ⚠ UNVERIFIED. Field names below are authored from each corpus repo's own
 * roadmap.md / progress.md conventions, not from reading the article files.
 * Session 2 task 1 runs every adapter against its submodule and reports each
 * mismatch. Correct THIS FILE when they disagree — never the corpus.
 *
 * All four share a documented sibling schema, so these specs are informed guesses
 * rather than hypotheses — but still guesses. Session 2 runs them for real.
 *
 * NO adapter exists for:
 *   dsa                  — planned corpus, no remote yet
 *   auth, authz, websec  — runnable demo apps, not corpora (session 1 audit)
 */
export const ADAPTERS: Record<RepoId, RepoAdapter> = {
  nextjs: createAdapter({
    repo: 'nextjs',
    include: ['docs/concepts/**/*.md', 'docs/recipes/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'next_baseline',
    framework: 'Next.js',
    extend: { next_baseline: z.string().optional() },
  }),

  react: createAdapter({
    repo: 'react',
    include: ['docs/concepts/**/*.md', 'docs/recipes/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'react_baseline',
    framework: 'React',
    extend: {
      react_baseline: z.string().optional(),
      primary_concept: z.string().optional(),
    },
  }),

  angular: createAdapter({
    repo: 'angular',
    include: ['docs/concepts/**/*.md', 'docs/recipes/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'angular_baseline',
    framework: 'Angular',
    extend: { angular_baseline: z.string().optional() },
  }),

  nestjs: createAdapter({
    repo: 'nestjs',
    include: ['docs/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'nest_baseline',
    framework: 'NestJS',
    extend: { nest_baseline: z.string().optional() },
  }),

};

export function adapterFor(repo: RepoId): RepoAdapter {
  return ADAPTERS[repo];
}
