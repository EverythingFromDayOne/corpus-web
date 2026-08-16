import { z } from 'zod';
import type { RepoId } from '../common.js';
import { createAdapter } from './factory.js';
import type { RepoAdapter } from './types.js';

export * from './types.js';
export * from './shared.js';
export { createAdapter } from './factory.js';

/**
 * Corrected by the session 2 audit (`docs/audit/frontmatter-2026-08-16.md`)
 * against the real files in all four submodules. Three findings drove every
 * change below — see that report for the full per-repo breakdown:
 *
 * 1. `nextjs` and `angular` wrap articles in a `docs/` directory
 *    (`docs/concepts/**`, `docs/recipes/**`). `react` and `nestjs` do not —
 *    concept categories are top-level directories in the repo root
 *    (`architecture/`, `foundations/`, ...) and recipes live at top-level
 *    `recipes/<category>/`. The original specs assumed the `docs/` wrapper
 *    everywhere, so `react` and `nestjs` matched **zero** files.
 * 2. No article in any corpus carries a `title` frontmatter key — every one
 *    relies on the body's H1 (`deriveTitle` in `shared.ts`).
 * 3. `status` is a plain string in `nextjs`/`angular` concepts but an object
 *    in `react`/`nestjs` concepts and some `angular` recipes
 *    (`normaliseStatus` in `shared.ts`).
 *
 * NO adapter exists for:
 *   dsa                  — planned corpus, no remote yet
 *   auth, authz, websec  — runnable demo apps, not corpora (session 1 audit)
 */
export const ADAPTERS: Record<RepoId, RepoAdapter> = {
  nextjs: createAdapter({
    repo: 'nextjs',
    conceptsRoot: 'docs/concepts',
    recipesRoot: 'docs/recipes',
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'next_baseline',
    framework: 'Next.js',
    extend: { next_baseline: z.string().optional() },
  }),

  /**
   * No `docs/` wrapper. Concept categories are top-level directories
   * (`architecture/`, `concurrent/`, `ecosystem/`, `effects/`, `forms/`,
   * `foundations/`, `rendering/`, `server/`, `state/` as of the audit — listed
   * for the record, not enforced; `conceptsRoot: null` picks up a new category
   * automatically rather than silently dropping it). Recipes are
   * `recipes/<category>/<slug>.md`.
   */
  react: createAdapter({
    repo: 'react',
    conceptsRoot: null,
    recipesRoot: 'recipes',
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
    conceptsRoot: 'docs/concepts',
    recipesRoot: 'docs/recipes',
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'angular_baseline',
    framework: 'Angular',
    extend: { angular_baseline: z.string().optional() },
  }),

  /**
   * No `docs/` wrapper, same shape as `react`. `demos/`, `prompts/`, and
   * `scripts/` sit alongside the concept categories at the repo root and are
   * not content — excluded explicitly, since (unlike `react`) this repo mixes
   * non-content directories in at the same level as concept categories.
   */
  nestjs: createAdapter({
    repo: 'nestjs',
    conceptsRoot: null,
    recipesRoot: 'recipes',
    excludeDirs: ['demos', 'prompts', 'scripts'],
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
