'use server';

/**
 * Grading Server Action for the drag-and-drop widget. `article-markdown.tsx`
 * ships only `toClientDragDropWidget()`'s output (no `accepts`, no
 * `correctSlots`) to the `DragDrop` client component; the client calls this
 * action to grade the current placement.
 *
 * Nothing is written to a database. Scoring stays advisory. `wrongSlotIds`
 * is returned so the client can flash and empty the wrong slots without
 * holding the answer key.
 *
 * Session 165 (D43 close). Same fix as `quiz-actions.ts`: previously
 * called `loadCatalogForAction()` which read `catalog.json` and the
 * curation YAMLs from disk at request time, failing on Vercel with
 * ENOENT. Now imports the static `answer-keys` module emitted by
 * `scripts/build-answer-keys.mjs` so Turbopack bundles it into the
 * Lambda.
 */
import type { DragDropGradeInput, DragDropGradeResult } from '@corpus/mdx-components';
import { gradeSubmission } from '@corpus/mdx-components';
import { answerKeys, answerKeysByArticle } from './data/answer-keys';

const ARTICLE_UID_SET = new Set<string>(answerKeys.articleUids);

export async function gradeDragDrop({
  submission,
  sidecarId,
  articleUid,
}: DragDropGradeInput): Promise<DragDropGradeResult> {
  if (!ARTICLE_UID_SET.has(articleUid)) {
    throw new Error(`gradeDragDrop: unknown article "${articleUid}"`);
  }

  const articleEntry = answerKeysByArticle[articleUid];
  if (!articleEntry) {
    throw new Error(`gradeDragDrop: no answer-key entry for "${articleUid}"`);
  }
  const widget = articleEntry.dragdrop[sidecarId];
  if (!widget) {
    throw new Error(`gradeDragDrop: unknown drag-drop "${sidecarId}" on "${articleUid}"`);
  }

  return gradeSubmission(
    {
      id: widget.sidecarId,
      mode: widget.mode,
      slots: widget.slots as Array<{ id: string; label?: string; accepts: string[] }>,
      chips: widget.chips as Array<{ id: string; text: string; correctSlots: string[] }>,
      explanation: widget.explanation,
    },
    submission,
  );
}
