/**
 * GitHub heading-anchor algorithm, copied from
 * packages/content-schema/src/sections.ts so rail ticks and in-page ids match
 * catalog.sections. Do not switch to github-slugger here — doubled hyphens
 * after punctuation are load-bearing for existing corpus links.
 */
export function githubSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replace(/ /g, '-');
}

export function dedupeSlug(base: string, counts: Map<string, number>): string {
  const seen = counts.get(base);
  if (seen === undefined) {
    counts.set(base, 0);
    return base;
  }
  const next = seen + 1;
  counts.set(base, next);
  return `${base}-${next}`;
}

export function createSlugger(): (heading: string) => string {
  const counts = new Map<string, number>();
  return (heading: string) => dedupeSlug(githubSlug(heading), counts);
}
