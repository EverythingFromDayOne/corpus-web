/**
 * Smoke coverage for lesson-surface motion CSS and the copy-button class
 * the toast pulse keys off. Interaction of Quiz/Callout/Flashcard/DragDrop
 * is asserted in `packages/mdx-components/test`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { copyButtonClassName } from '@corpus/mdx-components';

const ANIMATIONS = join(
  dirname(fileURLToPath(import.meta.url)),
  '../components/article/lesson-animations.css',
);

test('lesson-animations.css ships the required keyframes and hooks', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  for (const token of [
    '@keyframes lesson-rise-in',
    '@keyframes lesson-rise-in-loud',
    '@keyframes lesson-flip-to-back',
    '@keyframes lesson-toast-pulse',
    "[data-mounted='true']",
    '.av-callout.is-revealed',
    'backface-visibility: hidden',
    '.av-dd-slot.is-target',
    '.av-cbcopy.done',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
});

test('copy button class toggles .done for the toast pulse', () => {
  assert.equal(copyButtonClassName(false), 'av-cbcopy');
  assert.equal(copyButtonClassName(true), 'av-cbcopy done');
});
