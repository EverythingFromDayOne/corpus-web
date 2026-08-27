import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DragDropSidecar,
  normaliseDragDropSidecar,
} from '../src/dragdrop-sidecar.js';

const wellFormed = {
  id: 'jsx-to-createelement',
  title: 'Compose the JSX mapping',
  afterSection: 'how-it-works-under-the-hood',
  prompt: 'Drag the right tokens into the type slot and props slot.',
  explanation: 'Capitalized Card is the component function.',
  slots: [
    { id: 'type-slot', label: 'type', accepts: ['jsx-component-ref', 'jsx-component-string'] },
    { id: 'props-slot', label: 'props', accepts: ['jsx-component-ref', 'props-object'] },
  ],
  chips: [
    { id: 'jsx-component-ref', text: 'Card', correctSlots: ['type-slot'] },
    { id: 'jsx-component-string', text: "'card'", correctSlots: [] },
    { id: 'props-object', text: "{ title: 'Hi' }", correctSlots: ['props-slot'] },
  ],
};

test('DragDropSidecar accepts a well-formed sidecar, including distractors', () => {
  const parsed = DragDropSidecar.parse(wellFormed);
  assert.equal(parsed.slots.length, 2);
  assert.equal(parsed.chips.length, 3);
  assert.deepEqual(parsed.chips[1]?.correctSlots, []);
  assert.equal(parsed.mode, undefined);
});

test('DragDropSidecar rejects a slot that references an unknown chip', () => {
  assert.throws(
    () =>
      DragDropSidecar.parse({
        ...wellFormed,
        slots: [{ id: 'type-slot', accepts: ['not-a-chip'] }],
      }),
    /unknown chip/,
  );
});

test('DragDropSidecar rejects a chip whose correctSlots lists an unknown slot', () => {
  assert.throws(
    () =>
      DragDropSidecar.parse({
        ...wellFormed,
        chips: [{ id: 'jsx-component-ref', text: 'Card', correctSlots: ['missing-slot'] }],
      }),
    /unknown slot/,
  );
});

test('normaliseDragDropSidecar warns on an ambiguous chip in exact mode', () => {
  const parsed = DragDropSidecar.parse({
    ...wellFormed,
    chips: [
      { id: 'jsx-component-ref', text: 'Card', correctSlots: ['type-slot', 'props-slot'] },
      { id: 'jsx-component-string', text: "'card'", correctSlots: [] },
      { id: 'props-object', text: "{ title: 'Hi' }", correctSlots: ['props-slot'] },
    ],
  });
  const { sidecar, warnings } = normaliseDragDropSidecar(parsed);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] ?? '', /jsx-component-ref/);
  assert.deepEqual(
    sidecar.chips.find((chip) => chip.id === 'jsx-component-ref')?.correctSlots,
    ['type-slot'],
  );
  assert.equal(sidecar.mode, 'exact');
});
