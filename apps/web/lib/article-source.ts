/**
 * Article body loader — frontmatter-stripped Markdown for an article.
 *
 * Session 169 (D45 close). The previous implementation called
 * `readFileSync(articleFilePath(article), 'utf8')` at request time
 * inside a `'use cache'` block. Today that fs read is dormant: the
 * function is only invoked from the prerender pass (the
 * `generateStaticParams`-driven `next build`), which runs in the build
 * container where `content/<repo>/<sourcePath>` is readable. But the
 * moment any Server Action wires `readArticleMarkdown` into its body,
 * the same ENOENT fires that D43 caught for Quiz/DragDrop grading —
 * Vercel's serverless Lambda is sandboxed to the deployed bundle, and
 * the submodule gitlinks are not in that bundle.
 *
 * The D43 fix (`fix/d43-answer-keys`, deployed via PR #161 / v0.1.0)
 * used an emit-then-static-import pattern: a build-time script walks
 * the input source and emits a static TS module that Turbopack bundles
 * into the Lambda. This module applies the same pattern to article
 * bodies — `scripts/build-article-bodies.mjs` reads `catalog.json`,
 * walks every adapting article, strips the YAML frontmatter, and
 * emits `apps/web/lib/data/article-bodies.ts`. The runtime read
 * becomes a plain static import, so the `'use cache'` payload is
 * already in the bundle by the time the function is invoked.
 *
 * Behavioural parity with the previous implementation:
 *   - same `'use cache'` + `cacheLife('max')` wrap (build-time cache
 *     hit still holds; the static-import indirection is invisible to
 *     Next.js's caching layer because the import resolves at bundle
 *     time, not at call time)
 *   - same frontmatter strip
 *   - same input contract (`ArticleListItem` from `./catalog`)
 *
 * Failure modes: a missing `apps/web/lib/data/article-bodies.ts`
 * surfaces immediately as a TypeScript "Cannot find module" error
 * during `pnpm typecheck` / `pnpm dev` / `pnpm build`. The build-time
 * script is wired into the `prebuild` hook (see apps/web/package.json);
 * `pnpm dev` does not run `prebuild`, so the agent or user must run
 * `pnpm build:catalog && node scripts/build-article-bodies.mjs` once
 * after a fresh clone or a submodule bump. Same preflight shape as
 * `catalog.json`.
 */
import { cacheLife } from 'next/cache';
import type { ArticleListItem } from './catalog';
import { articleBodies, articleBodiesByUid } from './data/article-bodies';

const ARTICLE_UID_SET = new Set<string>(articleBodies.articleUids);

export async function readArticleMarkdown(article: ArticleListItem): Promise<string> {
  'use cache';
  cacheLife('max');
  if (!ARTICLE_UID_SET.has(article.uid)) {
    // Defensive: should be unreachable because catalog.json (which the
    // build script reads) and the article routes' generateStaticParams
    // (which uses getCatalogView) both derive their adapting set from
    // the same source. If they ever drift, fail loudly here rather than
    // silently returning empty content.
    throw new Error(`readArticleMarkdown: unknown article uid "${article.uid}"`);
  }
  const body = articleBodiesByUid[article.uid];
  if (body === undefined) {
    throw new Error(`readArticleMarkdown: no body for "${article.uid}" (build artifact inconsistent)`);
  }
  return body;
}
