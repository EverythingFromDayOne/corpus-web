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
 */
import type { DragDropGradeInput, DragDropGradeResult } from '@corpus/mdx-components';
import { gradeSubmission } from '@corpus/mdx-components';
import { getCatalogView } from './catalog';
import { loadArticleDragDropWidgets } from './article-widgets';

export async function gradeDragDrop({
  submission,
  sidecarId,
  articleUid,
}: DragDropGradeInput): Promise<DragDropGradeResult> {
  const view = await getCatalogView();
  const article = view.byUid[articleUid];
  if (!article) {
    throw new Error(`gradeDragDrop: unknown article "${articleUid}"`);
  }

  const widget = loadArticleDragDropWidgets(article).find((item) => item.sidecar.id === sidecarId);
  if (!widget) {
    throw new Error(`gradeDragDrop: unknown drag-drop "${sidecarId}" on "${articleUid}"`);
  }

  return gradeSubmission(
    {
      id: widget.sidecar.id,
      mode: widget.sidecar.mode ?? 'exact',
      slots: widget.sidecar.slots,
      chips: widget.sidecar.chips,
      explanation: widget.sidecar.explanation,
    },
    submission,
  );
}
