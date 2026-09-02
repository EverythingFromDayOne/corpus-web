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

const DIR = dirname(fileURLToPath(import.meta.url));
const ANIMATIONS = join(DIR, '../components/article/lesson-animations.css');
const ARTICLE = join(DIR, '../components/article/article.css');
const TOKENS = join(DIR, '../components/article/lesson-tokens.css');

test('lesson-animations.css ships the required keyframes and hooks', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  /* polish/flashcard-ambient-and-prevnext-fix (PR #144):
     removed `'backface-visibility: hidden'` from this assertion.
     The 3D card-flip machinery (perspective, transform-style:
     preserve-3d, transform: rotateY(180deg), and the
     `backface-visibility: hidden` face toggles) was intentionally
     removed in PR #143 and confirmed gone in PR #144. The
     pre-existing `.av-flashcard-back` rule used the toggle to
     hide the back face before the .is-flipped rotation; the
     `display: none` rules in lesson-tokens.css now do that job.
     The reduced-motion `backface-visibility: visible` override
     is still meaningful (line ~298) — a token check on that
     keeps the visibility contract honest. The
     `@keyframes lesson-flip-to-back` block IS still shipped
     (line ~33) — kept as dormant forward-compat for any
     future 3D-card work; the assertion remains. */
  for (const token of [
    '@keyframes lesson-rise-in',
    '@keyframes lesson-rise-in-loud',
    '@keyframes lesson-flip-to-back',
    '@keyframes lesson-toast-pulse',
    "[data-mounted='true']",
    '.av-callout.is-revealed',
    'backface-visibility: visible', // reduced-motion override, still meaningful
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

test('Phase 2 quiz glow pulse is focus-within only and gated', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  for (const token of [
    '@keyframes lesson-glow-breath {',
    'lesson-glow-breath 3s var(--ease-in-out) infinite',
    '.lesson-surface .av-qz:focus-within::before',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  // The keyframe must actually animate something — without opacity stops
  // the rule is a no-op and the test passes while the UI sits static.
  // Slice from the @keyframes declaration up to (but not including) the
  // next top-level `@media` block, since the keyframe body uses braces
  // internally that a naive `indexOf('}')` would mis-match.
  const keyframeStart = css.indexOf('@keyframes lesson-glow-breath');
  const nextMedia = css.indexOf('@media', keyframeStart);
  const keyframeBlock = css.slice(keyframeStart, nextMedia);
  assert.match(
    keyframeBlock,
    /opacity:\s*0\.\d+/,
    'glow-breath keyframe must declare an opacity stop below 1.0',
  );
  assert.match(
    keyframeBlock,
    /opacity:\s*1(?:\.0|;|\s|\b)/,
    'glow-breath keyframe must declare an opacity:1 stop so the pulse crosses 1.0',
  );
  assert.equal(
    css.includes('.lesson-surface .av-qz:hover::before {\n    animation: lesson-glow-breath'),
    false,
    'glow pulse must not run on hover alone',
  );
  const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.equal(
    reduce.includes('.lesson-surface .av-qz:focus-within::before'),
    true,
    'missing reduced-motion reset for glow pulse',
  );
  assert.equal(reduce.includes('animation: none'), true);
});

test('Phase 2 button hover lift uses tokens and skips .av-cbb', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  for (const token of [
    '@media (hover: hover) and (prefers-reduced-motion: no-preference)',
    '.lesson-surface .av-qz-go:not(:disabled):hover',
    '.lesson-surface .av-dd-go:not(:disabled):hover',
    '.lesson-surface .av-cbcopy:hover',
    'transform: translateY(-1px)',
    'var(--duration-fast)',
    'var(--ease-out)',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  assert.equal(css.includes('.av-cbb:hover'), false, '.av-cbb must stay flat');
});

test('Phase 2 progress fill and TOC easing live on chrome CSS', () => {
  const css = readFileSync(ARTICLE, 'utf8');
  for (const token of [
    '@keyframes lesson-progress-fill {',
    '.av-pbar rect',
    'var(--duration-graph)',
    'width var(--duration-base) var(--ease-out)',
    'background-color var(--duration-base) var(--ease-out)',
    'opacity var(--duration-base) var(--ease-out)',
    '.av-pnav a:hover',
    'transform: translateY(-1px)',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  const reduce = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  assert.equal(reduce.includes('.av-pbar rect'), true, 'missing reduced-motion reset for progress fill');
  assert.equal(reduce.includes('.av-tk'), true, 'missing reduced-motion reset for TOC ticks');
});

test('Phase 3 drag-drop shake runs on is-flash-no only, inside FLASH_MS', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  for (const token of [
    '@keyframes lesson-dd-shake {',
    '.lesson-surface .av-dd-slot.is-flash-no',
    'animation: lesson-dd-shake 480ms var(--ease-out) both',
    'var(--ease-out)',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  const keyframeStart = css.indexOf('@keyframes lesson-dd-shake');
  const nextKey = css.indexOf('@keyframes', keyframeStart + 1);
  const keyframeBlock = css.slice(keyframeStart, nextKey);
  assert.match(keyframeBlock, /translateX\(-6px\)/, 'shake must decay from 6px');
  assert.match(keyframeBlock, /translateX\(-2px\)/, 'shake must decay to 2px');
  assert.equal(
    css.includes('.av-dd-slot.is-no {\n    animation: lesson-dd-shake'),
    false,
    'settled is-no must not shake',
  );
  const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.equal(
    reduce.includes('.lesson-surface .av-dd-slot.is-flash-no'),
    true,
    'missing reduced-motion reset for slot shake',
  );
});

test('Phase 3 inline-code chip hover lives on the existing :not(pre) > code rule', () => {
  const css = readFileSync(TOKENS, 'utf8');
  for (const token of [
    '@media (hover: hover) and (prefers-reduced-motion: no-preference)',
    '.lesson-surface :not(pre) > code',
    ':not(pre) > code:hover {',
    'background-color: color-mix(in srgb, var(--lesson-purple-accent) 8%, var(--lesson-bg-secondary))',
    'var(--duration-fast)',
    'var(--ease-out)',
    'var(--lesson-purple-accent)',
    'var(--lesson-bg-secondary)',
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  assert.equal(css.includes('pre > code:hover'), false, 'fenced code must not get the chip hover');
});

test('Phase 3 widget stagger is below-fold only and skips callouts', () => {
  const css = readFileSync(ANIMATIONS, 'utf8');
  for (const token of [
    '@keyframes lesson-widget-rise {',
    ".av-qz[data-rise-pending='true']",
    ".av-flashcard[data-rise-pending='true']",
    ".av-dd[data-rise-pending='true']",
    ".av-qz[data-rise='true']",
    ".av-flashcard[data-rise='true']",
    ".av-dd[data-rise='true']",
    "animation: lesson-widget-rise var(--duration-base) var(--ease-out) both",
    "animation-delay: 80ms",
    "animation-delay: 160ms",
    "animation-delay: 240ms",
  ]) {
    assert.equal(css.includes(token), true, `missing ${token}`);
  }
  assert.equal(
    css.includes(".av-callout[data-rise='true']"),
    false,
    'callouts must not stack a second rise on CalloutReveal',
  );
  assert.equal(
    css.includes('.av-qz:not(.is-revealed)'),
    false,
    'first-paint widgets must not hide behind :not(.is-revealed)',
  );
  const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.equal(
    reduce.includes(".av-qz[data-rise='true']"),
    true,
    'missing reduced-motion reset for widget stagger',
  );
});
