/**
 * Throwaway fixture — not a corpus article.
 *
 * The rail's IntersectionObserver cannot be exercised in `node --test` (no
 * layout, no viewport). These tests cover the pure picker that the observer
 * callback now uses, including the two failure modes seen in the browser:
 * page-bottom last-heading freeze, and a clicked heading sitting above the
 * 20%–40% band while the next heading sits inside it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isScrolledToBottom,
  seenHeadingIds,
  selectActiveHeadingId,
} from '../lib/toc-spy';

// Measured on /en/courses/react-render-cycle/lessons/how-react-renders
// at innerHeight 1411, scrolled to max (2026-08-26).
const BOTTOM_HEADINGS = [
  { id: 'see-also', top: -163 },
  { id: 'references', top: 287 },
  { id: 'demo-source', top: 459 },
];
const READING_LINE = Math.round(1411 * 0.2); // 282, top of the existing band

test('isScrolledToBottom is true only within slack of max scroll', () => {
  assert.equal(isScrolledToBottom(17964, 1411, 19375), true);
  assert.equal(isScrolledToBottom(17900, 1411, 19375), false);
});

test('at page bottom, the last heading is active even if it shares the band', () => {
  // Both references (287) and demo-source (459) sit in the 20%–40% band
  // (282–564). The old picker took the first intersecting entry → references.
  assert.equal(
    selectActiveHeadingId(BOTTOM_HEADINGS, {
      readingLinePx: READING_LINE,
      atBottom: true,
    }),
    'demo-source',
  );
});

test('without the bottom fallback, the last heading above the reading line wins', () => {
  assert.equal(
    selectActiveHeadingId(BOTTOM_HEADINGS, {
      readingLinePx: READING_LINE,
      atBottom: false,
    }),
    'see-also',
  );
});

test('a clicked heading parked under the sticky header stays active', () => {
  // After jumpToPart, scroll-margin-top leaves the target at ~72px (above the
  // 20% band). A short next section can sit inside the band; the old picker
  // then highlighted N+1. The reading-line picker must keep N.
  assert.equal(
    selectActiveHeadingId(
      [
        { id: 'see-also', top: 72 },
        { id: 'references', top: 300 },
        { id: 'demo-source', top: 470 },
      ],
      { readingLinePx: READING_LINE, atBottom: false },
    ),
    'see-also',
  );
});

test('a long section after a click does not jump the highlight forward', () => {
  assert.equal(
    selectActiveHeadingId(
      [
        { id: 'walkthrough-one-keystroke-end-to-end', top: 52 },
        { id: 'real-world-patterns', top: 3633 },
      ],
      { readingLinePx: READING_LINE, atBottom: false },
    ),
    'walkthrough-one-keystroke-end-to-end',
  );
});

test('at page top, with every heading below the line, the first heading is active', () => {
  assert.equal(
    selectActiveHeadingId(
      [
        { id: 'what-it-is', top: 400 },
        { id: 'how-it-works-under-the-hood', top: 1200 },
      ],
      { readingLinePx: READING_LINE, atBottom: false },
    ),
    'what-it-is',
  );
});

test('at page bottom, every heading is counted seen so progress can reach 100', () => {
  assert.deepEqual(
    seenHeadingIds(BOTTOM_HEADINGS, {
      readingLinePx: READING_LINE,
      atBottom: true,
    }),
    ['see-also', 'references', 'demo-source'],
  );
});

test('mid-page, only headings that have passed the reading line are seen', () => {
  assert.deepEqual(
    seenHeadingIds(BOTTOM_HEADINGS, {
      readingLinePx: READING_LINE,
      atBottom: false,
    }),
    ['see-also'],
  );
});

test('an empty heading list yields null / empty seen', () => {
  assert.equal(
    selectActiveHeadingId([], { readingLinePx: READING_LINE, atBottom: true }),
    null,
  );
  assert.deepEqual(
    seenHeadingIds([], { readingLinePx: READING_LINE, atBottom: true }),
    [],
  );
});
