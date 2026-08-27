/**
 * Throwaway drag-drop fixture — not a corpus article, not under content/.
 *
 * Interaction assertions drive the same functions `dragdrop.tsx` re-exports
 * and the client component calls. (e) walks the `DragDrop` element's tree so
 * a revert of the client component that drops the no-JS line fails.
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { test } from 'node:test';
import {
  DragDropView,
  applyGrade,
  createBoard,
  everySlotFilled,
  fallbackAnswerLine,
  gradeSubmission,
  handleDragDropKey,
  placeChip,
  returnToPool,
  settleGrade,
  slotClassName,
  type DragDropProps,
} from '../src/dragdrop';
import { injectAfterSections, injectDragDrop } from '../src/inject-after-sections';
import type { DragDropExercise } from '../src/dragdrop-model';

const exercise: DragDropExercise = {
  id: 'jsx-to-createelement',
  mode: 'exact',
  slots: [
    { id: 'type-slot', label: 'type', accepts: ['jsx-component-ref', 'jsx-component-string'] },
    { id: 'props-slot', label: 'props', accepts: ['props-object', 'props-string'] },
  ],
  chips: [
    { id: 'jsx-component-ref', text: 'Card', correctSlots: ['type-slot'] },
    { id: 'jsx-component-string', text: "'card'", correctSlots: [] },
    { id: 'props-object', text: "{ title: 'Hi' }", correctSlots: ['props-slot'] },
    { id: 'props-string', text: "title: 'Hi'", correctSlots: [] },
  ],
  explanation: 'Capitalized Card is the component function.',
};

const slotIds = exercise.slots.map((slot) => slot.id);
const chipIds = exercise.chips.map((chip) => chip.id);

const labels: DragDropProps['labels'] = {
  eyebrow: 'Assemble',
  submit: 'Check answer',
  reset: 'Reset',
  correct: 'Correct',
  incorrect: 'Not quite',
  explanation: 'Explanation',
  error: 'Could not check.',
  pool: 'Chip pool',
  slotEmpty: 'Empty slot',
  slotFilled: 'Filled with',
};

function markup(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(markup).join('');
  if (typeof node !== 'object' || !('props' in node)) return '';
  const el = node as {
    type: unknown;
    props: { children?: unknown; className?: string };
  };
  const tag = typeof el.type === 'string' ? el.type : 'component';
  const cls = el.props.className ? ` class="${el.props.className}"` : '';
  return `<${tag}${cls}>${markup(el.props.children)}</${tag}>`;
}

test('(a) all slots filled and correct → success state visible', () => {
  let board = createBoard(slotIds, chipIds, exercise.id);
  board = placeChip(board, 'type-slot', 'jsx-component-ref');
  board = placeChip(board, 'props-slot', 'props-object');
  assert.equal(everySlotFilled(board.placement, slotIds), true);
  const result = gradeSubmission(exercise, [
    { slotId: 'type-slot', chipId: 'jsx-component-ref' },
    { slotId: 'props-slot', chipId: 'props-object' },
  ]);
  assert.equal(result.correct, true);
  board = applyGrade(board, result);
  assert.equal(board.verdict, 'correct');
  assert.equal(slotClassName(true, board.flash['type-slot']).includes('is-ok'), true);
  assert.equal(slotClassName(true, board.flash['props-slot']).includes('is-ok'), true);
  const noop = () => undefined;
  const html = markup(
    DragDropView({
      uid: 'ok',
      articleUid: 'react/jsx-and-rendering',
      sidecarId: exercise.id,
      title: 'Compose the JSX mapping',
      fallbackLine: fallbackAnswerLine(exercise),
      slots: exercise.slots.map((slot) => ({ id: slot.id, label: slot.label })),
      chips: exercise.chips.map((chip) => ({ id: chip.id, text: chip.text })),
      labels,
      board,
      pending: false,
      failed: false,
      onDragStart: noop,
      onDragOver: noop,
      onDropSlot: noop,
      onDropPool: noop,
      onPoolKeyDown: noop,
      onSlotActivate: noop,
      onChipActivate: noop,
      onSubmit: noop,
      onReset: noop,
    }),
  );
  assert.match(html, /class="av-dd-verdict ok"/);
  assert.match(html, /is-ok/);
});

test('(b) one slot wrong → failure state, that slot flashes error then resets empty', () => {
  let board = createBoard(slotIds, chipIds, exercise.id);
  board = placeChip(board, 'type-slot', 'jsx-component-ref');
  board = placeChip(board, 'props-slot', 'props-string');
  const result = gradeSubmission(exercise, [
    { slotId: 'type-slot', chipId: 'jsx-component-ref' },
    { slotId: 'props-slot', chipId: 'props-string' },
  ]);
  assert.equal(result.correct, false);
  assert.deepEqual(result.wrongSlotIds, ['props-slot']);
  board = applyGrade(board, result);
  assert.equal(board.verdict, 'incorrect');
  assert.equal(slotClassName(true, board.flash['props-slot']).includes('is-no'), true);
  assert.equal(board.placement['props-slot'], 'props-string');
  board = settleGrade(board, result);
  assert.equal(board.placement['props-slot'], null);
  assert.equal(board.placement['type-slot'], 'jsx-component-ref');
  assert.equal(board.pool.includes('props-string'), true);
  assert.equal(slotClassName(false, board.flash['props-slot']).includes('is-no'), false);
});

test('(c) drag from slot back to pool empties that slot', () => {
  let board = createBoard(slotIds, chipIds, exercise.id);
  board = placeChip(board, 'type-slot', 'jsx-component-ref');
  assert.equal(board.placement['type-slot'], 'jsx-component-ref');
  board = returnToPool(board, 'jsx-component-ref');
  assert.equal(board.placement['type-slot'], null);
  assert.equal(board.pool.includes('jsx-component-ref'), true);
});

test('(d) keyboard path: Enter on chip picks up, ArrowRight + Enter drops', () => {
  let board = createBoard(slotIds, chipIds, exercise.id);
  const firstChip = board.pool[0];
  assert.ok(firstChip);
  board = handleDragDropKey(board, 'Enter', slotIds);
  assert.equal(board.heldChipId, firstChip);
  assert.deepEqual(board.focus, { area: 'slots', index: 0 });
  board = handleDragDropKey(board, 'ArrowRight', slotIds);
  assert.deepEqual(board.focus, { area: 'slots', index: 1 });
  board = handleDragDropKey(board, 'Enter', slotIds);
  assert.equal(board.heldChipId, null);
  assert.equal(board.placement['props-slot'], firstChip);
  assert.equal(board.placement['type-slot'], null);
});

test('(e) SSR fallback present when JS disabled (no-JS line in rendered HTML)', () => {
  const fallback = fallbackAnswerLine(exercise);
  assert.match(fallback, /^Answer:/);
  assert.match(fallback, /Card/);
  const noop = () => undefined;
  const tree = DragDropView({
    uid: 'test',
    articleUid: 'react/jsx-and-rendering',
    sidecarId: exercise.id,
    title: 'Compose the JSX mapping',
    fallbackLine: fallback,
    slots: exercise.slots.map((slot) => ({ id: slot.id, label: slot.label })),
    chips: exercise.chips.map((chip) => ({ id: chip.id, text: chip.text })),
    labels,
    board: createBoard(slotIds, chipIds, exercise.id),
    pending: false,
    failed: false,
    onDragStart: noop,
    onDragOver: noop,
    onDropSlot: noop,
    onDropPool: noop,
    onPoolKeyDown: noop,
    onSlotActivate: noop,
    onChipActivate: noop,
    onSubmit: noop,
    onReset: noop,
  });
  const html = markup(tree);
  assert.match(html, /class="av-dd"/);
  assert.match(html, /class="av-dd-fallback"/);
  assert.match(html, /Answer:/);
  assert.equal(html.includes('accepts:'), false);
  assert.equal(html.includes('correctSlots:'), false);
});

test('injectDragDrop is injectAfterSections under the drag-drop name', () => {
  const body = createElement('div', null, [
    createElement('h2', { id: 'how-it-works-under-the-hood', key: 'h' }, 'How'),
    createElement('p', { key: 'p' }, 'Body.'),
  ]);
  const node = createElement('section', { className: 'av-dd' });
  const viaAlias = injectDragDrop(body, [{ afterSection: 'how-it-works-under-the-hood', node }]);
  const viaBase = injectAfterSections(body, [{ afterSection: 'how-it-works-under-the-hood', node }]);
  assert.equal(markup(viaAlias), markup(viaBase));
});
