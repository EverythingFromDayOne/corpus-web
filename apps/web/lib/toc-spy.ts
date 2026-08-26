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

export function isScrolledToBottom(
  scrollY: number,
  viewportHeight: number,
  scrollHeight: number,
  slackPx = TOC_BOTTOM_SLACK_PX,
): boolean {
  return viewportHeight + scrollY >= scrollHeight - slackPx;
}

/**
 * Last heading whose top has reached or passed the reading line, or the last
 * heading when the page cannot scroll any further.
 *
 * Headings must be in document order.
 */
export function selectActiveHeadingId(
  headings: HeadingPos[],
  options: { readingLinePx: number; atBottom: boolean },
): string | null {
  if (headings.length === 0) return null;
  if (options.atBottom) return headings[headings.length - 1]?.id ?? null;
  let active: string | null = null;
  for (const heading of headings) {
    if (heading.top <= options.readingLinePx) active = heading.id;
  }
  return active ?? headings[0]?.id ?? null;
}

export function seenHeadingIds(
  headings: HeadingPos[],
  options: { readingLinePx: number; atBottom: boolean },
): string[] {
  if (options.atBottom) return headings.map((heading) => heading.id);
  return headings
    .filter((heading) => heading.top <= options.readingLinePx)
    .map((heading) => heading.id);
}
