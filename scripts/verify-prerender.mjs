#!/usr/bin/env node
/**
 * verify-prerender.mjs
 *
 * CI gate (roadmap §15 item 15): asserts against the HTML Next writes under
 * `apps/web/.next/server/app/**.html`. The response is streamed, so curl and
 * view-source under-report; the build table's ◐ rows are leftover `[param]`
 * templates (Debt D23), not evidence the page is dynamic. This gate never
 * reads the build table.
 *
 * Two assertions:
 *   1. Every adapting article in catalog.json emitted HTML at
 *      `/en/blog/[corpus]/[slug]`, and every lesson of every path emitted
 *      HTML at `/en/courses/[course]/lessons/[slug]`.
 *   2. Each of those files has a non-empty `<body>`.
 *
 * Bracketed template files (`[param].html`) are excluded from the found
 * count. Does not build: run after `pnpm build` in the same job. A missing
 * `.next` or `catalog.json` is a failure, not a skip.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const CATALOG_PATH = join(ROOT, 'catalog.json');
const APP_HTML_DIR = join(ROOT, 'apps/web/.next/server/app');
/** Only shipped locale. Matches `apps/web/lib/locales.ts`. */
const LOCALE = 'en';

if (!existsSync(CATALOG_PATH)) {
  console.error('verify-prerender: FAIL — catalog.json does not exist. Run `pnpm build` first.');
  process.exit(1);
}

if (!existsSync(APP_HTML_DIR)) {
  console.error(
    'verify-prerender: FAIL — apps/web/.next/server/app does not exist. Run `pnpm build` first.',
  );
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
} catch (err) {
  console.error(`verify-prerender: FAIL — catalog.json is not valid JSON: ${err.message}`);
  process.exit(1);
}

const articles = Array.isArray(catalog.articles) ? catalog.articles : [];
const paths = Array.isArray(catalog.paths) ? catalog.paths : [];

if (articles.length === 0) {
  console.error(
    'verify-prerender: FAIL — catalog has zero articles. A gate that passes on nothing is broken.',
  );
  process.exit(1);
}

const articlesByUid = new Map();
for (const article of articles) {
  if (!article?.uid || !article.repo || !article.articleId) {
    console.error('verify-prerender: FAIL — catalog article is missing uid, repo, or articleId');
    process.exit(1);
  }
  articlesByUid.set(article.uid, article);
}

/** @typedef {{ kind: 'blog' | 'lesson', route: string, rel: string }} ExpectedPage */

/** @type {ExpectedPage[]} */
const expectedBlog = [];
/** @type {ExpectedPage[]} */
const expectedLessons = [];

for (const article of articles) {
  expectedBlog.push(page('blog', `/${LOCALE}/blog/${article.repo}/${article.articleId}`));
}

for (const pathDef of paths) {
  if (!pathDef?.slug || !Array.isArray(pathDef.items)) {
    console.error('verify-prerender: FAIL — catalog path is missing slug or items');
    process.exit(1);
  }
  for (const item of pathDef.items) {
    const uid = item?.article;
    const article = uid ? articlesByUid.get(uid) : undefined;
    if (!article) {
      console.error(
        `verify-prerender: FAIL — path "${pathDef.slug}" references missing article \`${uid ?? '(none)'}\``,
      );
      process.exit(1);
    }
    expectedLessons.push(
      page('lesson', `/${LOCALE}/courses/${pathDef.slug}/lessons/${article.articleId}`),
    );
  }
}

const emitted = { blog: new Set(), lesson: new Set() };
for (const rel of listHtmlFiles(APP_HTML_DIR)) {
  if (isBracketedTemplate(rel)) continue;
  const kind = classifyEmitted(rel);
  if (kind) emitted[kind].add(rel);
}

let ok = true;
const blogCheck = checkGroup('blog HTML', expectedBlog, emitted.blog);
const lessonCheck = checkGroup('lesson HTML', expectedLessons, emitted.lesson);
if (!blogCheck.ok || !lessonCheck.ok) ok = false;

const emptyBodies = [];
for (const entry of [...expectedBlog, ...expectedLessons]) {
  const file = join(APP_HTML_DIR, entry.rel);
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  if (!hasNonEmptyBody(html)) emptyBodies.push(entry.route);
}
if (emptyBodies.length > 0) {
  ok = false;
  console.error(
    `verify-prerender: FAIL — ${emptyBodies.length} prerendered file(s) have an empty or missing <body>`,
  );
  for (const route of emptyBodies) console.error(`    ${route}`);
}

if (!ok) process.exit(1);

console.log(
  `verify-prerender: OK — ${blogCheck.found}/${blogCheck.expected} blog HTML, ` +
    `${lessonCheck.found}/${lessonCheck.expected} lesson HTML, all with a non-empty <body>`,
);

/**
 * @param {'blog' | 'lesson'} kind
 * @param {string} route
 * @returns {ExpectedPage}
 */
function page(kind, route) {
  return { kind, route, rel: `${route.replace(/^\//, '')}.html` };
}

/** @param {string} rel posix path relative to APP_HTML_DIR */
function isBracketedTemplate(rel) {
  return /\[.+\]/.test(rel);
}

/**
 * Article HTML is `en/blog/<corpus>/<slug>.html`. Lesson HTML is
 * `en/courses/<course>/lessons/<slug>.html`. Listing pages and leftover
 * templates are neither.
 * @param {string} rel
 * @returns {'blog' | 'lesson' | null}
 */
function classifyEmitted(rel) {
  const parts = rel.split('/');
  if (parts[0] !== LOCALE || !rel.endsWith('.html')) return null;
  if (parts.length === 4 && parts[1] === 'blog') return 'blog';
  if (parts.length === 5 && parts[1] === 'courses' && parts[3] === 'lessons') return 'lesson';
  return null;
}

/**
 * @param {string} label
 * @param {ExpectedPage[]} expected
 * @param {Set<string>} foundRels
 */
function checkGroup(label, expected, foundRels) {
  const expectedRels = new Set(expected.map((entry) => entry.rel));
  const missing = expected.filter((entry) => !foundRels.has(entry.rel));
  const unexpected = [...foundRels].filter((rel) => !expectedRels.has(rel));
  const found = foundRels.size;
  const result = {
    expected: expected.length,
    found,
    ok: missing.length === 0 && unexpected.length === 0 && found === expected.length,
  };
  if (!result.ok) {
    console.error(`verify-prerender: FAIL — ${label}: expected ${result.expected}, found ${found}`);
    for (const entry of missing) console.error(`    missing: ${entry.route}`);
    for (const rel of unexpected) console.error(`    unexpected: /${rel.replace(/\.html$/, '')}`);
  }
  return result;
}

/** @param {string} html */
function hasNonEmptyBody(html) {
  const match = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html);
  if (!match) return false;
  return match[1].replace(/\s+/g, '').length > 0;
}

/** @param {string} dir */
function listHtmlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listHtmlFiles(abs));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    if (statSync(abs).isFile()) {
      out.push(relative(APP_HTML_DIR, abs).split('\\').join('/'));
    }
  }
  return out;
}
