#!/usr/bin/env node
/**
 * Build the slug allowlists used by `apps/web/middleware.ts` for D39.
 *
 * Reads `catalog.json` (already built by `pnpm build:catalog`) and writes
 * two JSON files:
 *
 *   apps/web/slug-allowlist.json     — array of `<repo>/<articleId>` strings
 *   apps/web/lesson-allowlist.json   — array of `<course>/<articleId>` strings
 *
 * The arrays are sorted for deterministic output. They are imported by the
 * middleware at build time; Next.js inlines them into the middleware bundle
 * (no runtime file I/O at the edge).
 *
 * Runs as part of `prebuild` (see apps/web/package.json) so the JSON files
 * exist before `next build` runs. When iterating on middleware in dev,
 * `pnpm dev` will pick up the JSON files via the same `prebuild` hook.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');
const APPS_WEB = join(REPO_ROOT, 'apps', 'web');

const catalog = JSON.parse(
  readFileSync(join(REPO_ROOT, 'catalog.json'), 'utf8'),
);

const articleAllowlist = catalog.articles
  .map((a) => `${a.repo}/${a.articleId}`)
  .sort();

// Lessons live in `catalog.paths` as `{ slug, items: [{ article, note }] }`.
// The middleware matches `<course>/<articleId>`, where `articleId` is the
// last path segment of `item.article` (e.g. `react/foundations/intro` →
// articleId `intro`). Derive the same way `apps/web/lib/catalog.ts:255-330`
// derives it for the runtime view.
const lessonAllowlist = [];
if (catalog.paths) {
  for (const path of catalog.paths) {
    for (const item of path.items) {
      const articleUid = item.article || '';
      const lastSlash = articleUid.lastIndexOf('/');
      const articleId =
        lastSlash >= 0 ? articleUid.slice(lastSlash + 1) : articleUid;
      if (articleId) {
        lessonAllowlist.push(`${path.slug}/${articleId}`);
      }
    }
  }
}
lessonAllowlist.sort();

writeFileSync(
  join(APPS_WEB, 'slug-allowlist.json'),
  JSON.stringify(articleAllowlist),
  'utf8',
);
writeFileSync(
  join(APPS_WEB, 'lesson-allowlist.json'),
  JSON.stringify(lessonAllowlist),
  'utf8',
);

console.log(
  `build-slug-allowlist: ${articleAllowlist.length} article slug(s), ` +
    `${lessonAllowlist.length} lesson slug(s) written to apps/web/.`,
);
