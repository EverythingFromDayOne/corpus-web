/**
 * Headless drag-and-drop board. The `'use client'` component is a view over
 * this state; grading of `accepts` / `correctSlots` lives here so the server
 * action and the tests share one implementation, and so the client component
 * never has to hold those arrays.
 */

export const FLASH_MS = 600;

export type DragDropMode = 'exact' | 'ordered';

export type DragDropSlot = {
  id: string;
  label?: string;
  accepts: string[];
};

export type DragDropChip = {
  id: string;
  text: string;
  correctSlots: string[];
};

export type DragDropExercise = {
  id: string;
  mode: DragDropMode;
  slots: DragDropSlot[];
  chips: DragDropChip[];
  explanation?: string;
};

export type ClientDragDropSlot = {
  id: string;
  label?: string;
};

export type ClientDragDropChip = {
  id: string;
  text: string;
};

export type DragDropSubmission = {
  slotId: string;
  chipId: string | null;
}[];

export type DragDropGradeResult = {
  correct: boolean;
  filledSlots: number;
  totalSlots: number;
  wrongSlotIds: string[];
};

export type DragDropGradeInput = {
  submission: DragDropSubmission;
  sidecarId: string;
  articleUid: string;
};

export type DragDropGradeAction = (input: DragDropGradeInput) => Promise<DragDropGradeResult>;

export type DragDropPlacement = Record<string, string | null>;

export type DragDropFocus = { area: 'pool' | 'slots'; index: number };

export type DragDropBoard = {
  placement: DragDropPlacement;
  /** Chip ids not currently in a slot, display order. */
  pool: string[];
  heldChipId: string | null;
  focus: DragDropFocus;
  flash: Record<string, 'ok' | 'no'>;
  verdict: 'correct' | 'incorrect' | null;
};

function hashString(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Deterministic Fisher–Yates so SSR and the first client render match. */
export function shuffleWithSeed<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  let state = hashString(seed) || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = Math.imul(state, 1664525) + 1013904223;
    const j = (state >>> 0) % (i + 1);
    const current = out[i];
    const swap = out[j];
    if (current === undefined || swap === undefined) continue;
    out[i] = swap;
    out[j] = current;
  }
  return out;
}

export function emptyPlacement(slotIds: readonly string[]): DragDropPlacement {
  const placement: DragDropPlacement = {};
  for (const id of slotIds) placement[id] = null;
  return placement;
}

export function everySlotFilled(placement: DragDropPlacement, slotIds: readonly string[]): boolean {
  return slotIds.length > 0 && slotIds.every((id) => placement[id] != null);
}

export function createBoard(
  slotIds: readonly string[],
  chipIds: readonly string[],
  seed: string,
): DragDropBoard {
  return {
    placement: emptyPlacement(slotIds),
    pool: shuffleWithSeed(chipIds, seed),
    heldChipId: null,
    focus: { area: 'pool', index: 0 },
    flash: {},
    verdict: null,
  };
}

export function resetBoard(
  slotIds: readonly string[],
  chipIds: readonly string[],
  seed: string,
): DragDropBoard {
  return createBoard(slotIds, chipIds, seed);
}

function withoutChip(pool: readonly string[], chipId: string): string[] {
  return pool.filter((id) => id !== chipId);
}

function occupyingSlot(placement: DragDropPlacement, chipId: string): string | null {
  for (const [slotId, occupant] of Object.entries(placement)) {
    if (occupant === chipId) return slotId;
  }
  return null;
}

/**
 * Place `chipId` into `slotId`. A chip already in another slot leaves it.
 * A chip already in the target is a no-op. The previous occupant of the
 * target returns to the front of the pool.
 */
export function placeChip(board: DragDropBoard, slotId: string, chipId: string): DragDropBoard {
  if (!(slotId in board.placement)) return board;
  if (board.placement[slotId] === chipId) {
    return { ...board, heldChipId: null, flash: {}, verdict: null };
  }
  const placement: DragDropPlacement = { ...board.placement };
  const previous = occupyingSlot(placement, chipId);
  if (previous) placement[previous] = null;
  const displaced = placement[slotId];
  placement[slotId] = chipId;
  let pool = withoutChip(board.pool, chipId);
  if (displaced && displaced !== chipId) {
    pool = [displaced, ...withoutChip(pool, displaced)];
  }
  return {
    ...board,
    placement,
    pool,
    heldChipId: null,
    flash: {},
    verdict: null,
  };
}

/** Drag a chip from a slot back onto the pool. */
export function returnToPool(board: DragDropBoard, chipId: string): DragDropBoard {
  const fromSlot = occupyingSlot(board.placement, chipId);
  if (!fromSlot) {
    return { ...board, heldChipId: null };
  }
  const placement: DragDropPlacement = { ...board.placement, [fromSlot]: null };
  const pool = board.pool.includes(chipId) ? board.pool : [...board.pool, chipId];
  return {
    ...board,
    placement,
    pool,
    heldChipId: null,
    flash: {},
    verdict: null,
  };
}

function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(length - 1, Math.max(0, index));
}

export function handleDragDropKey(
  board: DragDropBoard,
  key: string,
  slotIds: readonly string[],
): DragDropBoard {
  const poolLen = board.pool.length;
  const slotLen = slotIds.length;

  if (key === 'Escape') {
    return { ...board, heldChipId: null, focus: { area: 'pool', index: clampIndex(board.focus.index, poolLen) } };
  }

  if (key === 'ArrowRight' || key === 'ArrowDown') {
    if (board.heldChipId || board.focus.area === 'slots') {
      const index = board.focus.area === 'slots' ? board.focus.index + 1 : 0;
      return { ...board, focus: { area: 'slots', index: clampIndex(index, slotLen) } };
    }
    return {
      ...board,
      focus: { area: 'pool', index: clampIndex(board.focus.index + 1, poolLen) },
    };
  }

  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    if (board.heldChipId || board.focus.area === 'slots') {
      return {
        ...board,
        focus: { area: 'slots', index: clampIndex(board.focus.index - 1, slotLen) },
      };
    }
    return {
      ...board,
      focus: { area: 'pool', index: clampIndex(board.focus.index - 1, poolLen) },
    };
  }

  if (key !== 'Enter') return board;

  if (board.heldChipId) {
    if (board.focus.area === 'slots') {
      const slotId = slotIds[board.focus.index];
      if (!slotId) return board;
      return placeChip(board, slotId, board.heldChipId);
    }
    return { ...board, heldChipId: null };
  }

  if (board.focus.area === 'pool') {
    const chipId = board.pool[board.focus.index];
    if (!chipId) return board;
    return {
      ...board,
      heldChipId: chipId,
      focus: { area: 'slots', index: 0 },
    };
  }

  const slotId = slotIds[board.focus.index];
  const occupant = slotId ? board.placement[slotId] : null;
  if (!slotId || !occupant) return board;
  const placement: DragDropPlacement = { ...board.placement, [slotId]: null };
  const pool = board.pool.includes(occupant) ? board.pool : [...board.pool, occupant];
  return {
    ...board,
    placement,
    pool,
    heldChipId: occupant,
  };
}

export function submissionOf(placement: DragDropPlacement, slotIds: readonly string[]): DragDropSubmission {
  return slotIds.map((slotId) => ({ slotId, chipId: placement[slotId] ?? null }));
}

function chipCorrectForSlot(exercise: DragDropExercise, slotId: string, chipId: string): boolean {
  const slot = exercise.slots.find((item) => item.id === slotId);
  const chip = exercise.chips.find((item) => item.id === chipId);
  if (!slot || !chip) return false;
  if (exercise.mode === 'ordered') {
    return slot.accepts.includes(chipId);
  }
  const exactSlots =
    chip.correctSlots.length > 1 ? chip.correctSlots.slice(0, 1) : chip.correctSlots;
  return exactSlots.includes(slotId);
}

export function gradeSubmission(
  exercise: DragDropExercise,
  submission: DragDropSubmission,
): DragDropGradeResult {
  const totalSlots = exercise.slots.length;
  const bySlot = new Map(submission.map((entry) => [entry.slotId, entry.chipId]));
  const wrongSlotIds: string[] = [];
  let filledSlots = 0;
  for (const slot of exercise.slots) {
    const chipId = bySlot.get(slot.id) ?? null;
    if (chipId) filledSlots += 1;
    if (!chipId || !chipCorrectForSlot(exercise, slot.id, chipId)) {
      wrongSlotIds.push(slot.id);
    }
  }
  return {
    correct: wrongSlotIds.length === 0 && filledSlots === totalSlots && totalSlots > 0,
    filledSlots,
    totalSlots,
    wrongSlotIds,
  };
}

/** Flash classes go on immediately. Wrong chips stay put until `settleGrade`. */
export function applyGrade(board: DragDropBoard, result: DragDropGradeResult): DragDropBoard {
  const flash: Record<string, 'ok' | 'no'> = {};
  for (const slotId of Object.keys(board.placement)) {
    flash[slotId] = result.wrongSlotIds.includes(slotId) ? 'no' : 'ok';
  }
  return {
    ...board,
    flash,
    verdict: result.correct ? 'correct' : 'incorrect',
    heldChipId: null,
  };
}

/** After the flash window: wrong slots empty, those chips return to the pool. */
export function settleGrade(board: DragDropBoard, result: DragDropGradeResult): DragDropBoard {
  if (result.correct) {
    return { ...board, flash: {} };
  }
  const placement: DragDropPlacement = { ...board.placement };
  let pool = [...board.pool];
  for (const slotId of result.wrongSlotIds) {
    const chipId = placement[slotId];
    placement[slotId] = null;
    if (chipId && !pool.includes(chipId)) pool = [...pool, chipId];
  }
  return {
    ...board,
    placement,
    pool,
    flash: {},
    verdict: 'incorrect',
  };
}

export function fallbackAnswerLine(exercise: Pick<DragDropExercise, 'slots' | 'chips'>): string {
  const parts: string[] = [];
  for (const slot of exercise.slots) {
    const chip =
      exercise.chips.find((item) => item.correctSlots.includes(slot.id)) ??
      exercise.chips.find((item) => slot.accepts.includes(item.id) && item.correctSlots.length > 0);
    if (chip) parts.push(chip.text);
  }
  return `Answer: ${parts.join(' ')}`;
}

export function toClientSlots(slots: readonly DragDropSlot[]): ClientDragDropSlot[] {
  return slots.map((slot) => ({ id: slot.id, label: slot.label }));
}

export function toClientChips(chips: readonly DragDropChip[]): ClientDragDropChip[] {
  return chips.map((chip) => ({ id: chip.id, text: chip.text }));
}

export function slotClassName(
  filled: boolean,
  flash: 'ok' | 'no' | undefined,
  isTarget = false,
): string {
  const classes = ['av-dd-slot'];
  if (filled) classes.push('is-filled');
  if (flash === 'ok') classes.push('is-ok');
  if (flash === 'no') classes.push('is-no');
  if (isTarget) classes.push('is-target');
  return classes.join(' ');
}

/** Slot highlight while a chip is dragged over it. `drop` always clears. */
export function nextDragTarget(
  current: string | null,
  action: 'enter' | 'leave' | 'drop',
  slotId: string,
): string | null {
  if (action === 'enter') return slotId;
  if (action === 'drop') return null;
  return current === slotId ? null : current;
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
