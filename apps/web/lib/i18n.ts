import en from '../messages/en.json';
import { DEFAULT_LOCALE, type Locale } from './locales';

export type Messages = typeof en;

const catalogues: Record<Locale, Messages> = {
  en,
};

export function getMessages(locale: string): Messages {
  if (locale === DEFAULT_LOCALE) return catalogues.en;
  throw new Error(`No message catalogue for locale "${locale}"`);
}

export function t(
  messages: Messages,
  path: string,
  vars?: Record<string, string | number>,
): string {
  const parts = path.split('.');
  let current: unknown = messages;
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      throw new Error(`Missing message: ${path}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  if (typeof current !== 'string') {
    throw new Error(`Message ${path} is not a string`);
  }
  if (!vars) return current;
  return current.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}
