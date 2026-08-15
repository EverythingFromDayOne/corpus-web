import { z } from 'zod';
import { ArticleUid, Slug } from './common.js';

/**
 * Curation lives in the SITE repo (`curation/`). It is presentation and sequencing,
 * never claims. Nothing here is allowed to assert anything about how a framework
 * behaves — if it needs to, it belongs in the corpus.
 */

/**
 * A path is an ORDERED LIST OF EXISTING ARTICLES plus editorial framing.
 * It owns no content. One article can appear in three paths. This is what lets the
 * site have lesson-by-lesson UX without duplicating a single article, and without a
 * renumbering event every time an article is inserted mid-wave.
 */
export const PathDefinition = z
  .object({
    schema: z.literal(1),
    slug: Slug,
    title: z.string().min(1),
    description: z.string().min(1).max(300),
    /** Why these articles, in this order. Shown on the path overview page. */
    rationale: z.string().min(1),
    estimatedHours: z.number().positive().optional(),
    items: z
      .array(
        z.object({
          article: ArticleUid,
          /** Optional one-line framing for why this article sits at this position. */
          note: z.string().optional(),
        }),
      )
      .min(2),
  })
  .superRefine((path, ctx) => {
    const seen = new Set<string>();
    path.items.forEach((item, i) => {
      if (seen.has(item.article)) {
        ctx.addIssue({
          code: 'custom',
          path: ['items', i],
          message: `${item.article} appears twice in this path`,
        });
      }
      seen.add(item.article);
    });
  });
export type PathDefinition = z.infer<typeof PathDefinition>;

/**
 * Injects an interactive component into an article WITHOUT editing the article.
 *
 * This is the mechanism that keeps the corpus portable. The moment an article
 * contains `<EventLoopSim />` it stops rendering on GitHub, which is currently its
 * only reader.
 */
export const OverrideInjection = z.object({
  /** Insert immediately after the section with this anchor. */
  afterSection: z.string().min(1),
  /** Component name, resolved against the packages/mdx-components registry. */
  component: z.string().regex(/^[A-Z][A-Za-z0-9]*$/, 'must be a PascalCase component name'),
  props: z.record(z.string(), z.unknown()).default({}),
});

export const OverrideFile = z.object({
  schema: z.literal(1),
  article: ArticleUid,
  inject: z.array(OverrideInjection).min(1),
});
export type OverrideFile = z.infer<typeof OverrideFile>;
