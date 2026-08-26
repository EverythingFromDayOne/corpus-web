/**
 * Pure scroll-spy math for the article TOC rail.
 *
 * The rail still *triggers* off IntersectionObserver (scroll listeners are
 * forbidden on this control). These helpers decide *which* heading is active
 * from heading tops, including the page-bottom case the observer band misses.
 */
export const TOC_BAND_TOP_RATIO = 0.2;
export const TOC_BOTTOM_SLACK_PX = 2;

export type HeadingPos = {
  id: string;
  top: number;
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
 * True when the last heading cannot be scrolled up to the reading line —
 * either we are already at max scroll, or the leftover scroll is shorter
 * than the distance that heading still has to travel.
 *
 * This is the page-bottom override. It must NOT fire merely because the
 * article outro (`.av-pnav`) is on screen: clicking a late short part
 * (See also) leaves the nav visible, and treating that as "at bottom"
 * would steal the highlight for Demo source.
 */
export function shouldForceLastHeading(
  lastHeadingTop: number,
  readingLinePx: number,
  remaining: number,
  slackPx = TOC_BOTTOM_SLACK_PX,
): boolean {
  if (remaining <= slackPx) return true;
  const needed = lastHeadingTop - readingLinePx;
  return needed > 0 && remaining < needed;
}

/**
 * Last heading whose top has reached or passed the reading line, or the last
 * heading when it can no longer be scrolled into that line.
 *
 * Headings must be in document order.
 */
export function selectActiveHeadingId(
  headings: HeadingPos[],
  options: { readingLinePx: number; remainingScroll: number },
): string | null {
  if (headings.length === 0) return null;
  const last = headings[headings.length - 1];
  if (
    last &&
    shouldForceLastHeading(last.top, options.readingLinePx, options.remainingScroll)
  ) {
    return last.id;
  }
  let active: string | null = null;
  for (const heading of headings) {
    if (heading.top <= options.readingLinePx) active = heading.id;
  }
  return active ?? headings[0]?.id ?? null;
}

export function seenHeadingIds(
  headings: HeadingPos[],
  options: { readingLinePx: number; remainingScroll: number },
): string[] {
  const last = headings[headings.length - 1];
  if (
    last &&
    shouldForceLastHeading(last.top, options.readingLinePx, options.remainingScroll)
  ) {
    return headings.map((heading) => heading.id);
  }
  return headings
    .filter((heading) => heading.top <= options.readingLinePx)
    .map((heading) => heading.id);
}
