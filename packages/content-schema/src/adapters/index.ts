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
 * Confidence tiers:
 *   nextjs, reactjs, angular, nestjs — documented sibling schema, moderate
 *   auth, authz                     — no recorded convention, LOW
 *   websec                          — role itself unestablished, PLACEHOLDER
 *
 * `dsa` has NO adapter. It is a planned corpus with no GitHub remote, so it is
 * never mounted and never produces articles. When the remote is created, add its
 * spec here and move it from `PlannedRepoId` to `RepoId`.
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

  reactjs: createAdapter({
    repo: 'reactjs',
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

  /**
   * ⚠⚠ LOWEST CONFIDENCE IN THE FILE. `demo-auth-concepts` and
   * `demo-authz-concepts` carry a `demo-` prefix, report HTML as their primary
   * language, and have no frontmatter convention on record. The specs below are
   * a guess that they follow the sibling schema.
   *
   * They may not be markdown corpora at all — they may be demo applications with
   * docs attached, in which case they need a different `include` and possibly a
   * hand-written adapter rather than a factory spec. `demo-attacked-web` sitting
   * beside them suggests a target app plus two doc sets, which would be a
   * different shape from every other corpus.
   *
   * Session 2 task 1 audits these FIRST, before the four known-good ones.
   */
  auth: createAdapter({
    repo: 'auth',
    include: ['docs/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'stack_baseline',
    framework: 'Authentication',
    extend: { stack_baseline: z.string().optional() },
  }),

  authz: createAdapter({
    repo: 'authz',
    include: ['docs/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'stack_baseline',
    framework: 'Authorization',
    extend: { stack_baseline: z.string().optional() },
  }),

  /**
   * ⚠⚠⚠ PLACEHOLDER. `demo-attacked-web` was confirmed by the user as part of the
   * set, but its ROLE is not established. Three possibilities, all live:
   *
   *   1. a corpus of its own (articles about web attack surfaces)
   *   2. a deliberately vulnerable target app the auth/authz articles attack, whose
   *      code is EXTRACTED into those articles — in which case it is a demo source,
   *      not a corpus, and needs submoduling for `verify-code-blocks` but no adapter
   *   3. both — an app with an articles folder beside it
   *
   * It reports 7 security alerts where every sibling reports 1, which is what an
   * intentionally vulnerable application looks like. If (2) turns out to be true,
   * DELETE this adapter and register the repo as a demo source instead.
   *
   * Session 2 audits this one before anything else.
   */
  websec: createAdapter({
    repo: 'websec',
    include: ['docs/**/*.md'],
    conceptIdKey: 'article_id',
    recipeIdKey: 'recipe_id',
    folderKey: 'concept_folder',
    baselineKey: 'stack_baseline',
    framework: 'Web Security',
    extend: { stack_baseline: z.string().optional() },
  }),
};

export function adapterFor(repo: RepoId): RepoAdapter {
  return ADAPTERS[repo];
}
