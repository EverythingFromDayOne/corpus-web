import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  nextCardIndex,
  prevCardIndex,
  shouldHandleFlipKey,
  toggleFlip,
  flashcardCardClassName,
  flashcardFaceAriaHidden,
  flashcardScrollBehavior,
} from '../src/flashcard-model';

test('nextCardIndex and prevCardIndex clamp to the strip', () => {
  assert.equal(nextCardIndex(0, 3), 1);
  assert.equal(nextCardIndex(2, 3), 2);
  assert.equal(prevCardIndex(0, 3), 0);
  assert.equal(prevCardIndex(2, 3), 1);
});

test('toggleFlip and Enter/Space are the flip contract', () => {
  assert.equal(toggleFlip(false), true);
  assert.equal(toggleFlip(true), false);
  assert.equal(shouldHandleFlipKey('Enter'), true);
  assert.equal(shouldHandleFlipKey(' '), true);
  assert.equal(shouldHandleFlipKey('Tab'), false);
});

test('clicking a card toggles is-flipped and hides the other face', () => {
  let pressed = false;
  function click() {
    pressed = toggleFlip(pressed);
  }
  assert.equal(flashcardCardClassName(pressed).includes('is-flipped'), false);
  assert.equal(flashcardFaceAriaHidden('front', pressed), false);
  assert.equal(flashcardFaceAriaHidden('back', pressed), true);
  click();
  assert.equal(flashcardCardClassName(pressed), 'av-flashcard-card is-flipped');
  assert.equal(flashcardFaceAriaHidden('front', pressed), true);
  assert.equal(flashcardFaceAriaHidden('back', pressed), false);
  click();
  assert.equal(flashcardCardClassName(pressed).includes('is-flipped'), false);
});

test('programmatic flashcard scroll is smooth unless reduced-motion', () => {
  assert.equal(flashcardScrollBehavior(false), 'smooth');
  assert.equal(flashcardScrollBehavior(true), 'auto');
});
