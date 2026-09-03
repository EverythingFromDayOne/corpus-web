export const SITE_ORIGIN = 'https://nxhhuy.tech';
export const THEME_COOKIE = 'corpus-theme';
export const WORDS_PER_MINUTE = 200;

// Static OG / Twitter card. Built at `app/opengraph-image.tsx` via
// `next/og`'s `ImageResponse` (Satori under the hood). Single
// shared design — no per-article variation. Article counts are
// pinned to the catalogue measurement (196 / 4 / 18 / 2) and
// refreshed at the next `pnpm build` cycle.
//
// Twitter card large-image variant + OpenGraph image are the
// same URL — Twitter reads `og:image` first and only falls back
// to `twitter:image` if absent. Declaring both keeps the
// validator output green without runtime branching.
export const OG_IMAGE_PATH = '/opengraph-image';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  'corpus.web — a verified reference corpus. 196 articles across 4 corpora.';

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString();
}

export function ogImageUrl(): string {
  return absoluteUrl(OG_IMAGE_PATH);
}
