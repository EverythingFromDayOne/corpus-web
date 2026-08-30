export const SITE_ORIGIN = 'https://nxhhuy.tech';
export const THEME_COOKIE_NAME = 'corpus-theme';
export const WORDS_PER_MINUTE = 200;

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString();
}
