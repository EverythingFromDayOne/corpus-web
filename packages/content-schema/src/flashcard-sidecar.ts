import { z } from 'zod';
import { Slug } from './common.js';

/**
 * Inline flashcard strip mounted into an article (not the SRS `DeckSidecar`
 * in `sidecars.ts`). Front/back pairs only — no `correctIndex`, no options,
 * no explanation. Placement is `afterSection` (empty = end of article).
 *
 * Lives beside the article as `{stem}.flashcard.yaml` in the corpus, or as
 * override `props` for `component: Flashcard`.
 */
export const FlashcardCard = z.object({
  front: z.string().min(1),
  back: z.string().min(1),
});
export type FlashcardCard = z.infer<typeof FlashcardCard>;

export const FlashcardSidecar = z.object({
  id: Slug,
  title: z.string().min(1),
  afterSection: z.string(),
  cards: z.array(FlashcardCard).min(1),
});
export type FlashcardSidecar = z.infer<typeof FlashcardSidecar>;

/**
 * File envelope: a single strip, or `schema`/`article_id` plus one strip
 * or an array of strips.
 */
export const FlashcardSidecarFile = z.union([
  FlashcardSidecar,
  z.object({
    schema: z.literal(1),
    article_id: Slug,
    flashcard: z.union([FlashcardSidecar, z.array(FlashcardSidecar).min(1)]),
  }),
]);
export type FlashcardSidecarFile = z.infer<typeof FlashcardSidecarFile>;

export function normaliseFlashcardSidecars(file: FlashcardSidecarFile): FlashcardSidecar[] {
  if ('flashcard' in file) {
    return Array.isArray(file.flashcard) ? file.flashcard : [file.flashcard];
  }
  return [file];
}
