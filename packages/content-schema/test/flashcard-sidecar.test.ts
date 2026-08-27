import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  FlashcardSidecar,
  FlashcardSidecarFile,
  normaliseFlashcardSidecars,
} from '../src/flashcard-sidecar.js';

const strip = {
  id: 'jsx-as-sugar',
  title: 'JSX as sugar',
  afterSection: 'what-it-is',
  cards: [
    { front: 'What ships at runtime?', back: 'jsx() calls, not JSX.' },
    { front: 'Classic transform?', back: 'React.createElement, import React in scope.' },
  ],
};

test('FlashcardSidecar accepts front/back pairs and rejects scoring fields', () => {
  const parsed = FlashcardSidecar.parse(strip);
  assert.equal(parsed.cards.length, 2);
  assert.equal('correctIndex' in parsed.cards[0]!, false);
  assert.equal('options' in parsed.cards[0]!, false);
});

test('FlashcardSidecarFile envelope normalises a single block and an array', () => {
  const one = FlashcardSidecarFile.parse({
    schema: 1,
    article_id: 'jsx-and-rendering',
    flashcard: strip,
  });
  assert.equal(normaliseFlashcardSidecars(one).length, 1);

  const many = FlashcardSidecarFile.parse({
    schema: 1,
    article_id: 'jsx-and-rendering',
    flashcard: [strip, { ...strip, id: 'second', afterSection: '' }],
  });
  assert.equal(normaliseFlashcardSidecars(many).length, 2);
});
