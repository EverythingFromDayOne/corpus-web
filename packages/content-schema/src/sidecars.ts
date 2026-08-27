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
  /**
   * Anchor of the section this question tests. Used only by the legacy
   * top-level `questions` list (grouped into blocks). Ignored when the
   * question sits inside a `quiz` block — that block's `afterSection` wins.
   */
  afterSection: z.string().optional(),
});
export type QuizQuestion = z.infer<typeof QuizQuestion>;

/**
 * One mounted quiz card. `afterSection: ''` means end of article; any other
 * string is a heading slug (`h2` or `h3`).
 */
export const QuizBlock = z.object({
  id: Slug,
  title: z.string().min(1).optional(),
  afterSection: z.string(),
  questions: z.array(QuizQuestion).min(1),
});
export type QuizBlock = z.infer<typeof QuizBlock>;

const QuizField = z.union([QuizBlock, z.array(QuizBlock).min(1)]);

function refineQuestion(
  q: QuizQuestion,
  ctx: z.RefinementCtx,
  path: (string | number)[],
) {
  const correct = q.options.filter((o) => o.correct).length;
  if (correct !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'options'],
      message: `question "${q.id}" has ${correct} correct options — exactly one required`,
    });
  }
  const labels = new Set(q.options.map((o) => o.label));
  if (labels.size !== q.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'options'],
      message: `question "${q.id}" has duplicate option labels`,
    });
  }
}

function questionsOf(sidecar: {
  questions?: QuizQuestion[];
  quiz?: QuizBlock | QuizBlock[];
}): QuizQuestion[] {
  if (sidecar.questions) return sidecar.questions;
  if (!sidecar.quiz) return [];
  return Array.isArray(sidecar.quiz)
    ? sidecar.quiz.flatMap((block) => block.questions)
    : sidecar.quiz.questions;
}

/**
 * Full quiz payload, including `correct` and `explanation`. Scoring is
 * `mode: 'local'` only (roadmap §7.4) — there is no server mode. The Quiz
 * component takes this shape and decides when to reveal the answer; the
 * network layer does not.
 *
 * Back-compat: PR #32 fixtures use top-level `questions`. New sidecars may
 * instead set `quiz` to one block or an array of blocks, each with its own
 * `afterSection`. Exactly one of `questions` / `quiz` is required.
 *
 * `toClientQuiz()` is only the unrevealed-options projection (no `correct`).
 */
export const QuizSidecar = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    questions: z.array(QuizQuestion).min(1).optional(),
    quiz: QuizField.optional(),
  })
  .superRefine((sidecar, ctx) => {
    const hasQuestions = sidecar.questions !== undefined;
    const hasQuiz = sidecar.quiz !== undefined;
    if (hasQuestions === hasQuiz) {
      ctx.addIssue({
        code: 'custom',
        path: hasQuestions ? ['quiz'] : ['questions'],
        message: 'provide exactly one of `questions` or `quiz`',
      });
      return;
    }

    if (sidecar.quiz) {
      const blocks = Array.isArray(sidecar.quiz) ? sidecar.quiz : [sidecar.quiz];
      const blockIds = blocks.map((block) => block.id);
      if (new Set(blockIds).size !== blockIds.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['quiz'],
          message: 'duplicate quiz block ids',
        });
      }
    }

    const questions = questionsOf(sidecar);
    questions.forEach((q, qi) => {
      refineQuestion(q, ctx, ['questions', qi]);
    });

    const ids = questions.map((q) => q.id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['questions'],
        message: 'duplicate question ids',
      });
    }
  });
export type QuizSidecar = z.infer<typeof QuizSidecar>;

/**
 * Collapse a sidecar into explicit quiz blocks. Legacy `questions` are
 * grouped by `afterSection` (missing/undefined → end of article). `quiz`
 * blocks pass through; a single object becomes a one-element array.
 */
export function normaliseQuizBlocks(sidecar: QuizSidecar): QuizBlock[] {
  if (sidecar.quiz) {
    return Array.isArray(sidecar.quiz) ? sidecar.quiz : [sidecar.quiz];
  }
  const questions = sidecar.questions ?? [];
  const groups = new Map<string, QuizQuestion[]>();
  for (const question of questions) {
    const key = question.afterSection ?? '';
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([afterSection, grouped], index) => ({
    id: `quiz-${index + 1}`,
    afterSection,
    questions: grouped,
  }));
}

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
    questions: questionsOf(sidecar).map((q) => ({
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

/**
 * Sibling sidecars — Flashcard, Callout, DragDrop — live in their own
 * files and are re-exported from `index.ts`. Quiz stays here because the
 * legacy `questions` / `quiz` envelope is this file's original contract.
 */
