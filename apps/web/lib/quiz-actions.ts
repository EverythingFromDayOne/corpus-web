'use server';

/**
 * Grading Server Action — the only place the quiz answer key is read after
 * the article page's initial payload has been built. `article-markdown.tsx`
 * ships only `toClientQuizWidget()`'s output (no `correct`, no
 * `explanation`) to the `Quiz` client component; the client calls this
 * action, by reference, to grade the one question a reader just answered.
 *
 * This does not reintroduce a persisted/authoritative Nest `'server'`
 * scoring mode (roadmap §7.4): nothing is written to a database, no
 * `apps/api` call happens, and the result is not recorded anywhere. Scoring
 * stays advisory. This action only moves the plaintext `correct` comparison
 * across the RSC/client boundary so the concealment `unrevealedOptions()`
 * already intended — "must not appear on the radios until after the reader
 * submits" — actually holds at the network/payload level, not just in the
 * rendered UI.
 *
 * Session 165 (D43 close). The previous design called
 * `loadCatalogForAction()` which read `catalog.json` from disk at
 * request time. That worked on `pnpm start` (local production build)
 * but failed on Vercel's serverless Lambda with
 * `ENOENT /var/task/catalog.json` — the catalog is a gitignored
 * build artifact at repo root, never bundled. The action now imports
 * a static module emitted by `scripts/build-answer-keys.mjs` at
 * `prebuild` time. Turbopack bundles that module into the Lambda as
 * part of the app graph, so no fs read is required at request time.
 * `catalog.json` is still emitted and consumed by
 * `verify-catalog` / `verify-prerender` / Pagefind — those are
 * separate consumers that need the disk file.
 */
import type { QuizGradeInput, GradeResult } from '@corpus/mdx-components';
import { answerKeys, answerKeysByArticle } from './data/answer-keys';

const ARTICLE_UID_SET = new Set<string>(answerKeys.articleUids);

export async function gradeQuizAnswer({
  articleUid,
  questionId,
  selectedLabel,
}: QuizGradeInput): Promise<GradeResult> {
  if (!ARTICLE_UID_SET.has(articleUid)) {
    throw new Error(`gradeQuizAnswer: unknown article "${articleUid}"`);
  }

  const articleEntry = answerKeysByArticle[articleUid];
  if (!articleEntry) {
    // Defensive — should be unreachable because articleUids and byArticle
    // keys are derived from the same source set.
    throw new Error(`gradeQuizAnswer: no answer-key entry for "${articleUid}"`);
  }
  const question = articleEntry.quiz[questionId];
  if (!question) {
    throw new Error(`gradeQuizAnswer: unknown question "${questionId}" on "${articleUid}"`);
  }
  if (!question.validLabels.includes(selectedLabel)) {
    throw new Error(`gradeQuizAnswer: "${selectedLabel}" is not an option on "${questionId}"`);
  }

  return {
    selectedLabel,
    correctLabel: question.correctLabel,
    isCorrect: selectedLabel === question.correctLabel,
    explanation: question.explanation,
  };
}
