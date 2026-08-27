/**
 * Pure scroll-spy math for the article TOC rail.
 *
 * The rail still *triggers* off IntersectionObserver (scroll listeners are
 * forbidden on this control). These helpers decide *which* heading is active
 * from heading tops, including the page-bottom case the observer band misses.
 */
export const TOC_BAND_TOP_RATIO = 0.2;
export const TOC_BOTTOM_SLACK_PX = 2;

/**
 * How close to max scroll the reader has to be, as a fraction of the viewport,
 * before the last heading may take the highlight without having reached the
 * reading line. This is the only scroll-sensitive part of that override.
 */
export const TOC_BOTTOM_ZONE_RATIO = 0.2;

export type HeadingPos = {
  id: string;
  top: number;
};

/** One scroll sample: everything the picker needs about the current viewport. */
export type SpyViewport = {
  readingLinePx: number;
  remainingScroll: number;
  viewportHeight: number;
};

export function remainingScrollPx(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
): number {
  return scrollHeight - viewportHeight - scrollY;
}

export function isScrolledToBottom(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
  slackPx = TOC_BOTTOM_SLACK_PX,
): boolean {
  return remainingScrollPx(scrollY, viewportHeight, scrollHeight) <= slackPx;
}

/**
 * Where the last heading's top ends up once the document has been scrolled as
 * far as it goes. `lastHeadingTop` is viewport-relative, and `remaining` is
 * exactly how much further the page can scroll, so subtracting one from the
 * other cancels `scrollY` and leaves a pure layout fact: `viewportHeight`
 * minus the distance from that heading to the end of the document.
 */
export function lastHeadingTopAtMaxScroll(
  lastHeadingTop: number,
  remaining: number,
): number {
  return lastHeadingTop - remaining;
}

/**
 * True when the last heading takes the highlight even though it has not
 * reached the reading line.
 *
 * Three separate things have to hold, and the first two are what the original
 * version was missing:
 *
 * 1. **A scroll fact.** The reader is at max scroll, or inside the bottom zone
 *    — `remaining` within `TOC_BOTTOM_ZONE_RATIO` of a viewport of the end.
 *    `remaining` is the only argument here that tracks `scrollY`.
 * 2. **A visibility fact.** The heading is actually on screen. Pinning the rail
 *    to a heading still below the fold is never right.
 * 3. **A layout fact.** The document cannot bring that heading up to the
 *    reading line at all, so waiting for it to arrive would leave the last
 *    part permanently unlit.
 *
 * The original override was `remaining < lastHeadingTop - readingLinePx`, read
 * as "the leftover scroll is shorter than the distance the heading still has to
 * travel". Substituting `remaining = scrollHeight - viewportHeight - scrollY`
 * and `lastHeadingTop = absoluteTop - scrollY` cancels every `scrollY` term and
 * leaves `scrollHeight - viewportHeight - absoluteTop + readingLinePx < 0` —
 * fact 3 on its own, with no dependence on scroll position whatsoever. On any
 * page whose last heading sits less than `viewportHeight - readingLinePx` from
 * the end of the document that constant is true at `scrollY === 0`, which
 * pinned the rail to the last part for the entire page and short-circuited the
 * picker. Fact 3 is a precondition, not a trigger.
 *
 * The override must also NOT fire merely because the article outro
 * (`.av-pnav`) is on screen: clicking a late short part (See also) leaves the
 * nav visible, and treating that as "at bottom" would steal the highlight for
 * Demo source.
 */
export function shouldForceLastHeading(
  lastHeadingTop: number,
  readingLinePx: number,
  remaining: number,
  viewportHeight: number,
  slackPx = TOC_BOTTOM_SLACK_PX,
): boolean {
  if (remaining <= slackPx) return true;
  if (remaining > viewportHeight * TOC_BOTTOM_ZONE_RATIO) return false;
  if (lastHeadingTop > viewportHeight) return false;
  return lastHeadingTopAtMaxScroll(lastHeadingTop, remaining) > readingLinePx;
}

function forcesLastHeading(last: HeadingPos, options: SpyViewport): boolean {
  return shouldForceLastHeading(
    last.top,
    options.readingLinePx,
    options.remainingScroll,
    options.viewportHeight,
  );
}

/**
 * Last heading whose top has reached or passed the reading line, or the last
 * heading when the reader is at the bottom of a document too short to bring it
 * to that line.
 *
 * Headings must be in document order.
 */
export function selectActiveHeadingId(
  headings: HeadingPos[],
  options: SpyViewport,
): string | null {
  if (headings.length === 0) return null;
  const last = headings[headings.length - 1];
  if (last && forcesLastHeading(last, options)) {
    return last.id;
  }
  let active: string | null = null;
  for (const heading of headings) {
    if (heading.top <= options.readingLinePx) active = heading.id;
  }
  return active ?? headings[0]?.id ?? null;
}

export function seenHeadingIds(headings: HeadingPos[], options: SpyViewport): string[] {
  const last = headings[headings.length - 1];
  if (last && forcesLastHeading(last, options)) {
    return headings.map((heading) => heading.id);
  }
  return headings
    .filter((heading) => heading.top <= options.readingLinePx)
    .map((heading) => heading.id);
}
