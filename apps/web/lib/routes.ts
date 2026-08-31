import type { RepoId } from './repos';
import type { Locale } from './locales';

export function homePath(locale: Locale): string {
  return `/${locale}`;
}

export function coursesPath(locale: Locale): string {
  return `/${locale}/courses`;
}

export function coursePath(locale: Locale, course: string): string {
  return `/${locale}/courses/${course}`;
}

export function lessonPath(locale: Locale, course: string, slug: string): string {
  return `/${locale}/courses/${course}/lessons/${slug}`;
}

export function blogPath(locale: Locale): string {
  return `/${locale}/blog`;
}

export function articlePath(locale: Locale, corpus: RepoId, slug: string): string {
  return `/${locale}/blog/${corpus}/${slug}`;
}

export function blogCorpusPath(locale: Locale, corpus: RepoId): string {
  return `${blogPath(locale)}#${corpus}`;
}

export function licensePath(locale: Locale): string {
  return `/${locale}/license`;
}
