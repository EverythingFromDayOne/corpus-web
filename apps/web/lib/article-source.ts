import { readFileSync } from 'node:fs';
import { cacheLife } from 'next/cache';
import { articleFilePath, type ArticleListItem } from './catalog';

export async function readArticleMarkdown(article: ArticleListItem): Promise<string> {
  'use cache';
  cacheLife('max');
  const raw = readFileSync(articleFilePath(article), 'utf8');
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}
