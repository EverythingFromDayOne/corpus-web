/**
 * Throwaway fixture — not a corpus article.
 *
 * The rail's IntersectionObserver cannot be exercised in `node --test` (no
 * layout, no viewport). These tests cover the pure picker that the observer
 * callback uses, including the three failure modes seen in the browser:
 * page-bottom last-heading freeze, a clicked heading sitting above the 20%–40%
 * band while the next heading sits inside it, and a short document whose last
 * heading sits close to the document end pinning the rail from `scrollY === 0`.
 *
 * The short/long document cases below are driven from a measured layout —
 * document height, viewport height, absolute heading tops — and a scroll
 * position, rather than from hand-written viewport-relative tops. A picker that
 * only *looks* scroll-dependent (see `shouldForceLastHeading`'s note on the
 * cancelled `scrollY` terms) cannot pass both ends of the same layout.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isScrolledToBottom,
  remainingScrollPx,
  seenHeadingIds,
  selectActiveHeadingId,
  shouldForceLastHeading,
  type HeadingPos,
  type SpyViewport,
} from '../lib/toc-spy';

// Measured on /en/courses/react-render-cycle/lessons/how-react-renders
// at innerHeight 1411, scrolled to max (2026-08-26).
const BOTTOM_HEADINGS = [
  { id: 'see-also', top: -163 },
  { id: 'references', top: 287 },
  { id: 'demo-source', top: 459 },
];
const VIEWPORT_HEIGHT = 1411;
const READING_LINE = Math.round(VIEWPORT_HEIGHT * 0.2); // 282, top of the existing band

function at(remainingScroll: number): SpyViewport {
  return { readingLinePx: READING_LINE, remainingScroll, viewportHeight: VIEWPORT_HEIGHT };
}

/**
 * A measured page layout: absolute heading tops plus the scroll extent, so a
 * test states a scroll position and the viewport-relative tops follow.
 */
type Layout = {
  viewportHeight: number;
  scrollHeight: number;
  headings: Array<{ id: string; absoluteTop: number }>;
};

function sample(layout: Layout, scrollY: number): {
  headings: HeadingPos[];
  viewport: SpyViewport;
} {
  return {
    headings: layout.headings.map((heading) => ({
      id: heading.id,
      top: heading.absoluteTop - scrollY,
    })),
    viewport: {
      readingLinePx: layout.viewportHeight * 0.2,
      remainingScroll: remainingScrollPx(
        scrollY,
        layout.viewportHeight,
        layout.scrollHeight,
      ),
      viewportHeight: layout.viewportHeight,
    },
  };
}

function forced(layout: Layout, scrollY: number): boolean {
  const { headings, viewport } = sample(layout, scrollY);
  const last = headings[headings.length - 1]!;
  return shouldForceLastHeading(
    last.top,
    viewport.readingLinePx,
    viewport.remainingScroll,
    viewport.viewportHeight,
  );
}

function activeAt(layout: Layout, scrollY: number): string | null {
  const { headings, viewport } = sample(layout, scrollY);
  return selectActiveHeadingId(headings, viewport);
}

function seenAt(layout: Layout, scrollY: number): string[] {
  const { headings, viewport } = sample(layout, scrollY);
  return seenHeadingIds(headings, viewport);
}

// Measured in Chrome at 1259×1411 on
// /en/courses/react-render-cycle/lessons/rendering-lists-and-keys (2026-08-27).
// SHORT tail: the last heading sits 517px above the document end, less than
// `viewportHeight - readingLine` (1129), so it can never reach the reading line.
const SHORT_TAIL_LESSON: Layout = {
  viewportHeight: 1411,
  scrollHeight: 16280,
  headings: [
    { id: 'what-it-is', absoluteTop: 819 },
    { id: 'how-it-works-under-the-hood', absoluteTop: 1420 },
    { id: 'basic-usage', absoluteTop: 5515 },
    { id: 'walkthrough--a-triage-queue-that-corrupts-then-doesnt', absoluteTop: 6668 },
    { id: 'real-world-patterns', absoluteTop: 10191 },
    { id: 'common-mistakes', absoluteTop: 12123 },
    { id: 'how-this-evolved', absoluteTop: 13282 },
    { id: 'exercises', absoluteTop: 13861 },
    { id: 'summary', absoluteTop: 14736 },
    { id: 'see-also', absoluteTop: 15106 },
    { id: 'references', absoluteTop: 15504 },
    { id: 'demo-source', absoluteTop: 15763 },
  ],
};
const SHORT_MAX_SCROLL = SHORT_TAIL_LESSON.scrollHeight - SHORT_TAIL_LESSON.viewportHeight;

// Measured the same way on /en/courses/react-render-cycle/lessons/how-react-renders,
// the page PR #34 was verified against. Its tail is 552px — also short, which is
// why the same freeze was live there and was missed by checking only the bottom.
const LONG_LESSON: Layout = {
  viewportHeight: 1411,
  scrollHeight: 18665,
  headings: [
    { id: 'what-it-is', absoluteTop: 763 },
    { id: 'how-it-works-under-the-hood', absoluteTop: 1478 },
    { id: 'basic-usage-observing-the-pipeline', absoluteTop: 6937 },
    { id: 'walkthrough-one-keystroke-end-to-end', absoluteTop: 8237 },
    { id: 'real-world-patterns', absoluteTop: 11797 },
    { id: 'reference-the-pipeline-at-a-glance', absoluteTop: 12596 },
    { id: 'common-mistakes', absoluteTop: 13433 },
    { id: 'how-this-evolved', absoluteTop: 15849 },
    { id: 'exercises', absoluteTop: 16423 },
    { id: 'summary', absoluteTop: 16965 },
    { id: 'see-also', absoluteTop: 17490 },
    { id: 'references', absoluteTop: 17854 },
    { id: 'demo-source', absoluteTop: 18113 },
  ],
};
const LONG_MAX_SCROLL = LONG_LESSON.scrollHeight - LONG_LESSON.viewportHeight;

test('isScrolledToBottom is true only within slack of max scroll', () => {
  assert.equal(isScrolledToBottom(17964, 1411, 19375), true);
  assert.equal(isScrolledToBottom(17900, 1411, 19375), false);
  assert.equal(remainingScrollPx(17964, 1411, 19375), 0);
});

test('at page bottom, the last heading is active even if it shares the band', () => {
  // Both references (287) and demo-source (459) sit in the 20%–40% band
  // (282–564). The old picker took the first intersecting entry → references.
  assert.equal(selectActiveHeadingId(BOTTOM_HEADINGS, at(0)), 'demo-source');
});

test('without being stuck, the last heading above the reading line wins', () => {
  assert.equal(selectActiveHeadingId(BOTTOM_HEADINGS, at(2000)), 'see-also');
});

test('inside the bottom zone, a leftover too short to reach the line forces last', () => {
  // last at 459, line 282: at max scroll it would still sit at 379, below the
  // line. 80px leftover is inside the bottom zone (282) → stuck.
  assert.equal(shouldForceLastHeading(459, READING_LINE, 80, VIEWPORT_HEIGHT), true);
  assert.equal(selectActiveHeadingId(BOTTOM_HEADINGS, at(80)), 'demo-source');
});

test('outside the bottom zone, the same layout does not force last', () => {
  // Same heading distance to the line, three times the leftover scroll. The
  // pre-fix override answered "stuck" here too, because its comparison had no
  // surviving scrollY term at all.
  assert.equal(shouldForceLastHeading(1259, READING_LINE, 880, VIEWPORT_HEIGHT), false);
});

test('clicking See also near the end does not steal the highlight for Demo source', () => {
  // After jumpToPart, leftover 255px is enough to still bring demo-source
  // (470) up to the 282px line (it lands at 215). Must keep See also.
  assert.equal(shouldForceLastHeading(470, READING_LINE, 255, VIEWPORT_HEIGHT), false);
  assert.equal(
    selectActiveHeadingId(
      [
        { id: 'see-also', top: 72 },
        { id: 'references', top: 300 },
        { id: 'demo-source', top: 470 },
      ],
      at(255),
    ),
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
      at(2000),
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
      at(9000),
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
      at(17000),
    ),
    'what-it-is',
  );
});

test('at page bottom, every heading is counted seen so progress can reach 100', () => {
  assert.deepEqual(seenHeadingIds(BOTTOM_HEADINGS, at(0)), [
    'see-also',
    'references',
    'demo-source',
  ]);
});

test('mid-page, only headings that have passed the reading line are seen', () => {
  assert.deepEqual(seenHeadingIds(BOTTOM_HEADINGS, at(2000)), ['see-also']);
});

test('an empty heading list yields null / empty seen', () => {
  assert.equal(selectActiveHeadingId([], at(0)), null);
  assert.deepEqual(seenHeadingIds([], at(0)), []);
});

test('a short-tailed document does not force the last heading at scroll top', () => {
  // The regression: demo-source sits 517px above the document end, so it can
  // never reach the reading line. That layout fact alone used to pin the rail
  // to the last part from scrollY 0 and freeze the picker for the whole page.
  assert.equal(forced(SHORT_TAIL_LESSON, 0), false);
  assert.equal(activeAt(SHORT_TAIL_LESSON, 0), 'what-it-is');
  assert.deepEqual(seenAt(SHORT_TAIL_LESSON, 0), []);
});

test('the long lesson PR #34 was verified against is not forced at scroll top either', () => {
  // Its tail is 552px — the same class of layout. Verifying only the page
  // bottom is what let this through.
  assert.equal(forced(LONG_LESSON, 0), false);
  assert.equal(activeAt(LONG_LESSON, 0), 'what-it-is');
  assert.deepEqual(seenAt(LONG_LESSON, 0), []);
});

test('the same short-tailed layout keeps updating through the middle of the page', () => {
  assert.equal(forced(SHORT_TAIL_LESSON, 5000), false);
  assert.equal(activeAt(SHORT_TAIL_LESSON, 5000), 'how-it-works-under-the-hood');
  assert.equal(activeAt(SHORT_TAIL_LESSON, 7435), 'walkthrough--a-triage-queue-that-corrupts-then-doesnt');
  assert.equal(activeAt(SHORT_TAIL_LESSON, 12000), 'common-mistakes');
  assert.deepEqual(seenAt(SHORT_TAIL_LESSON, 7435), [
    'what-it-is',
    'how-it-works-under-the-hood',
    'basic-usage',
    'walkthrough--a-triage-queue-that-corrupts-then-doesnt',
  ]);
});

test('a short-tailed document still pins the last part at the page bottom', () => {
  assert.equal(forced(SHORT_TAIL_LESSON, SHORT_MAX_SCROLL), true);
  assert.equal(activeAt(SHORT_TAIL_LESSON, SHORT_MAX_SCROLL), 'demo-source');
  assert.equal(
    seenAt(SHORT_TAIL_LESSON, SHORT_MAX_SCROLL).length,
    SHORT_TAIL_LESSON.headings.length,
  );
  // ...and inside the bottom zone, before literal max scroll, so a reader who
  // stops a few hundred pixels short still gets the last part and 100%.
  assert.equal(forced(SHORT_TAIL_LESSON, SHORT_MAX_SCROLL - 200), true);
  assert.equal(activeAt(SHORT_TAIL_LESSON, SHORT_MAX_SCROLL - 200), 'demo-source');
});

test('the long lesson keeps its page-bottom behaviour (the PR #34 fix)', () => {
  assert.equal(forced(LONG_LESSON, LONG_MAX_SCROLL), true);
  assert.equal(activeAt(LONG_LESSON, LONG_MAX_SCROLL), 'demo-source');
  assert.equal(seenAt(LONG_LESSON, LONG_MAX_SCROLL).length, LONG_LESSON.headings.length);
  assert.equal(forced(LONG_LESSON, LONG_MAX_SCROLL - 200), true);
  assert.equal(activeAt(LONG_LESSON, LONG_MAX_SCROLL - 200), 'demo-source');
});

test('just outside the bottom zone, the reading-line picker is back in charge', () => {
  const outside = SHORT_MAX_SCROLL - Math.round(SHORT_TAIL_LESSON.viewportHeight * 0.2) - 1;
  assert.equal(forced(SHORT_TAIL_LESSON, outside), false);
  assert.equal(activeAt(SHORT_TAIL_LESSON, outside), 'summary');
  assert.equal(seenAt(SHORT_TAIL_LESSON, outside).length, 9);
});

test('the force flips on scroll position alone, holding the layout fixed', () => {
  // Guard for the cancellation class of bug: one layout, two scroll positions,
  // two different answers. A layout-only predicate cannot satisfy this.
  for (const layout of [SHORT_TAIL_LESSON, LONG_LESSON]) {
    const max = layout.scrollHeight - layout.viewportHeight;
    assert.equal(forced(layout, 0), false);
    assert.equal(forced(layout, Math.round(max / 2)), false);
    assert.equal(forced(layout, max), true);
  }
});
