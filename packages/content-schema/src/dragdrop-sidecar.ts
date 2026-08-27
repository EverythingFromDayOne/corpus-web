import { z } from 'zod';
import { Slug } from './common.js';

export const DragDropMode = z.enum(['exact', 'ordered']);
export type DragDropMode = z.infer<typeof DragDropMode>;

export const DragDropSlot = z.object({
  id: Slug,
  /** Shown above the slot (e.g. "keyword", "column"). */
  label: z.string().min(1).optional(),
  /** Chip ids this slot will accept. Must be non-empty. */
  accepts: z.array(Slug).min(1),
});
export type DragDropSlot = z.infer<typeof DragDropSlot>;

export const DragDropChip = z.object({
  id: Slug,
  /** Visible chip text. */
  text: z.string().min(1),
  /**
   * Slot ids this chip is correct for. Empty means a distractor — Part 2's
   * sample uses `[]` for those, so this is not `.min(1)`.
   */
  correctSlots: z.array(Slug),
});
export type DragDropChip = z.infer<typeof DragDropChip>;

/**
 * Fill-in-the-blank drag-and-drop sidecar. Placement is `afterSection`
 * (empty = end of article). The answer key is `accepts` / `correctSlots`;
 * those arrays must not cross the client boundary (see `toClientDragDrop`
 * in apps/web).
 */
export const DragDropSidecar = z
  .object({
    id: Slug,
    title: z.string().min(1),
    afterSection: z.string(),
    mode: DragDropMode.optional(),
    prompt: z.string().min(1).optional(),
    explanation: z.string().min(1).optional(),
    slots: z.array(DragDropSlot).min(1),
    chips: z.array(DragDropChip).min(1),
  })
  .superRefine((sidecar, ctx) => {
    const slotIds = sidecar.slots.map((slot) => slot.id);
    const chipIds = sidecar.chips.map((chip) => chip.id);
    const allIds = [...slotIds, ...chipIds];
    if (new Set(allIds).size !== allIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['slots'],
        message: 'slot ids and chip ids must be unique within the sidecar',
      });
    }

    const slotSet = new Set(slotIds);
    const chipSet = new Set(chipIds);

    sidecar.slots.forEach((slot, index) => {
      for (const chipId of slot.accepts) {
        if (!chipSet.has(chipId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['slots', index, 'accepts'],
            message: `slot "${slot.id}" accepts unknown chip "${chipId}"`,
          });
        }
      }
    });

    sidecar.chips.forEach((chip, index) => {
      for (const slotId of chip.correctSlots) {
        if (!slotSet.has(slotId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['chips', index, 'correctSlots'],
            message: `chip "${chip.id}" lists unknown slot "${slotId}"`,
          });
        }
      }
    });
  });
export type DragDropSidecar = z.infer<typeof DragDropSidecar>;

export const DragDropSidecarFile = z.union([
  DragDropSidecar,
  z.object({
    schema: z.literal(1),
    article_id: Slug,
    dragdrop: z.union([DragDropSidecar, z.array(DragDropSidecar).min(1)]),
  }),
]);
export type DragDropSidecarFile = z.infer<typeof DragDropSidecarFile>;

export function normaliseDragDropSidecars(file: DragDropSidecarFile): DragDropSidecar[] {
  if ('dragdrop' in file) {
    return Array.isArray(file.dragdrop) ? file.dragdrop : [file.dragdrop];
  }
  return [file];
}

/**
 * Exact-mode chips with more than one `correctSlots` entry keep the first
 * and emit a warning. Callers log the warning; the schema itself does not
 * fail, because the sidecar is still well-formed.
 */
export function normaliseDragDropSidecar(sidecar: DragDropSidecar): {
  sidecar: DragDropSidecar;
  warnings: string[];
} {
  const mode = sidecar.mode ?? 'exact';
  const warnings: string[] = [];
  if (mode !== 'exact') {
    return { sidecar: { ...sidecar, mode }, warnings };
  }
  const chips = sidecar.chips.map((chip) => {
    if (chip.correctSlots.length <= 1) return chip;
    const kept = chip.correctSlots[0];
    warnings.push(
      `chip "${chip.id}" has ${chip.correctSlots.length} correctSlots in exact mode; using "${kept}"`,
    );
    return { ...chip, correctSlots: kept ? [kept] : [] };
  });
  return { sidecar: { ...sidecar, mode, chips }, warnings };
}
