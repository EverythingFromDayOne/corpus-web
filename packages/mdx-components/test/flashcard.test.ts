import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  nextCardIndex,
  prevCardIndex,
  shouldHandleFlipKey,
  toggleFlip,
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
