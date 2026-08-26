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
 */
import type { QuizGradeInput, GradeResult } from '@corpus/mdx-components';
import { getCatalogView } from './catalog';
import { loadArticleQuizWidgets } from './article-widgets';

export async function gradeQuizAnswer({
  articleUid,
  questionId,
  selectedLabel,
}: QuizGradeInput): Promise<GradeResult> {
  const view = await getCatalogView();
  const article = view.byUid[articleUid];
  if (!article) {
    throw new Error(`gradeQuizAnswer: unknown article "${articleUid}"`);
  }

  const question = loadArticleQuizWidgets(article)
    .flatMap((widget) => widget.sidecar.questions)
    .find((candidate) => candidate.id === questionId);
  if (!question) {
    throw new Error(`gradeQuizAnswer: unknown question "${questionId}" on "${articleUid}"`);
  }

  const correct = question.options.find((option) => option.correct);
  if (!correct) {
    throw new Error(`gradeQuizAnswer: question "${questionId}" has no correct option`);
  }
  if (!question.options.some((option) => option.label === selectedLabel)) {
    throw new Error(`gradeQuizAnswer: "${selectedLabel}" is not an option on "${questionId}"`);
  }

  return {
    selectedLabel,
    correctLabel: correct.label,
    isCorrect: selectedLabel === correct.label,
    explanation: question.explanation,
  };
}
