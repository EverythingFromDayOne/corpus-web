import { z } from 'zod';
import { Slug } from './common.js';

/**
 * Sidecars live in the CORPUS repo, beside the article:
 *   docs/concepts/foundations/js-patterns.md
 *   docs/concepts/foundations/js-patterns.quiz.yaml
 *   docs/concepts/foundations/js-patterns.deck.yaml
 *
 * Rationale: a quiz question is a claim about behaviour. Claims live under the
 * corpus's verified-claims discipline and its CI, not in the presentation layer.
 * Renderings live in `curation/overrides/` in the site repo. That is the whole rule.
 */

export const QuizOption = z.object({
  label: z.string().regex(/^[A-Z]$/, 'option labels are single uppercase letters'),
  body: z.string().min(1),
  correct: z.boolean().default(false),
});

export const QuizQuestion = z.object({
  id: Slug,
  prompt: z.string().min(1),
  /** Optional snippet shown above the options. Extracted, never hand-written. */
  code: z.string().optional(),
  language: z.string().default('ts'),
  options: z.array(QuizOption).min(2).max(6),
  /**
   * Shown after submission. Required — a quiz that marks you wrong without saying
   * why is a scoring mechanism, not a teaching one.
   */
  explanation: z.string().min(1),
  /** Anchor of the section this question tests. Places it correctly in the article. */
  afterSection: z.string().optional(),
});

/**
 * Full quiz payload, including `correct` and `explanation`. Scoring is
 * `mode: 'local'` only (roadmap §7.4) — there is no server mode. The Quiz
 * component takes this shape and decides when to reveal the answer; the
 * network layer does not.
 *
 * `toClientQuiz()` is only the unrevealed-options projection (no `correct`).
 */
export const QuizSidecar = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    questions: z.array(QuizQuestion).min(1),
  })
  .superRefine((sidecar, ctx) => {
    sidecar.questions.forEach((q, qi) => {
      const correct = q.options.filter((o) => o.correct).length;
      if (correct !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', qi, 'options'],
          message: `question "${q.id}" has ${correct} correct options — exactly one required`,
        });
      }
      const labels = new Set(q.options.map((o) => o.label));
      if (labels.size !== q.options.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', qi, 'options'],
          message: `question "${q.id}" has duplicate option labels`,
        });
      }
    });

    const ids = sidecar.questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['questions'], message: 'duplicate question ids' });
    }
  });
export type QuizSidecar = z.infer<typeof QuizSidecar>;

export const Flashcard = z.object({
  id: Slug,
  front: z.string().min(1),
  back: z.string().min(1),
  /** Anchor of the section this card is drawn from, for "read the source" links. */
  fromSection: z.string().optional(),
});

export const DeckSidecar = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    title: z.string().min(1),
    cards: z.array(Flashcard).min(1),
  })
  .superRefine((deck, ctx) => {
    const ids = deck.cards.map((c) => c.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['cards'], message: 'duplicate card ids' });
    }
  });
export type DeckSidecar = z.infer<typeof DeckSidecar>;

/**
 * Unrevealed-options projection for the Quiz component. `correct` is stripped.
 *
 * Scoring is `mode: 'local'` only (roadmap §7.4). There is no server mode and
 * no untrusted API response to hide the key from. This function shapes the
 * option list the component renders before submit; the component itself
 * decides when to reveal the answer, using the full `QuizSidecar` it already
 * holds. The strip stays useful even with no server boundary — `correct` must
 * not appear on the radios until after the reader submits.
 */
export function toClientQuiz(sidecar: QuizSidecar) {
  return {
    articleId: sidecar.article_id,
    questions: sidecar.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      code: q.code,
      language: q.language,
      afterSection: q.afterSection,
      options: q.options.map((o) => ({ label: o.label, body: o.body })),
    })),
  };
}
export type ClientQuiz = ReturnType<typeof toClientQuiz>;
