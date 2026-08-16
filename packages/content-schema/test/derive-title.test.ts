/**
 * `deriveTitle` / `findTitleHeading`, run against the real corpus.
 *
 * Every corpus assertion below names a file in a pinned submodule, so these
 * tests are also a standing check on the corpus itself: if `react-concepts`
 * lands the D11 fix and re-tags, the "no title" cases start failing and the
 * fix has to be acknowledged here rather than passing unnoticed.
 *
 * Two cases have no corpus instance and use inline fixtures instead — see
 * `SYNTHETIC` below. They are marked, not smuggled in as corpus coverage.
 */
import matter from 'gray-matter';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { AdapterError } from '../src/adapters/types.js';
import { deriveTitle } from '../src/adapters/shared.js';
import { extractSections, findTitleHeading, parseArticleBody } from '../src/sections.js';

const CONTENT = join(dirname(dirname(dirname(dirname(fileURLToPath(import.meta.url))))), 'content');

/** The frontmatter-stripped body of a real corpus file. */
function corpusBody(relPath: string): string {
  const abs = join(CONTENT, relPath);
  assert.ok(
    existsSync(abs),
    `${relPath} is not on disk — run \`pnpm sync:content\` before running these tests`,
  );
  return matter(readFileSync(abs, 'utf8')).content;
}

/** What `deriveTitle` did before session 3: a line scan over the raw body. */
const LEGACY_H1_REGEX = /^#\s+(.+)$/m;

// ---------------------------------------------------------------------------
// Fenced code — the confirmed regression
// ---------------------------------------------------------------------------

const FENCED_FALSE_MATCH = 'react/rendering/react-compiler-deep-dive.md';

test('a `# ` line inside a fenced code block is not a title', () => {
  const body = corpusBody(FENCED_FALSE_MATCH);

  // The bug, stated as an assertion so the test fails loudly if the corpus
  // edits this fence away and the case stops being covered by a real file.
  assert.equal(
    LEGACY_H1_REGEX.exec(body)?.[1],
    'TypeScript projects also need the Babel core types:',
    'expected the shell comment inside the npm-install fence to be what the old line scanner matched',
  );

  assert.equal(findTitleHeading(body), null);
});

test('the fenced false match throws rather than titling the article', () => {
  assert.throws(
    () => deriveTitle(undefined, corpusBody(FENCED_FALSE_MATCH), 'react', FENCED_FALSE_MATCH),
    (err: unknown) =>
      err instanceof AdapterError && /no H1 in the body to derive one from/.test(err.message),
  );
});

// ---------------------------------------------------------------------------
// A real H1, including one that does not open the document
// ---------------------------------------------------------------------------

test('an H1 following a lead callout is still the title', () => {
  // `signals.md` opens with a "> **Modern Angular only**" blockquote and only
  // then reaches `# Signals`. Position in the document is not what makes a
  // heading the title; being a top-level depth-1 heading is.
  const relPath = 'angular/docs/concepts/reactivity/signals.md';
  const body = corpusBody(relPath);

  assert.equal(findTitleHeading(body), 'Signals');
  assert.equal(deriveTitle(undefined, body, 'angular', relPath), 'Signals');
});

test('an explicit frontmatter title wins over the body H1', () => {
  // `recipes/index.md` is the one corpus file carrying both: `title: Recipe
  // index` in frontmatter and `# Recipes` in the body. It is excluded from
  // article discovery, which is why the disagreement never mattered — but the
  // precedence is what lets a corpus opt back into frontmatter titles.
  const relPath = 'nextjs/docs/recipes/index.md';
  const body = corpusBody(relPath);

  assert.equal(findTitleHeading(body), 'Recipes');
  assert.equal(deriveTitle('Recipe index', body, 'nextjs', relPath), 'Recipe index');
});

// ---------------------------------------------------------------------------
// No title at all — Debt D11
// ---------------------------------------------------------------------------

test('an article with neither frontmatter title nor H1 throws AdapterError', () => {
  const relPath = 'react/concurrent/suspense.md';
  const body = corpusBody(relPath);

  assert.equal(LEGACY_H1_REGEX.test(body), false, 'expected no `# ` line anywhere in this body');
  assert.throws(
    () => deriveTitle(undefined, body, 'react', relPath),
    (err: unknown) => err instanceof AdapterError && err.repo === 'react',
  );
});

// ---------------------------------------------------------------------------
// SYNTHETIC — no corpus file exhibits these
// ---------------------------------------------------------------------------
//
// A search across all four mounted corpora found no article containing an
// indented-code `# ` line or a `> #` blockquote heading. The only matches in
// `content/` at all are `nestjs/prompts/scaffold-repo.md` and
// `nextjs/prompts/session15-corrections.md`, and neither directory is selected
// as articles by any adapter. Both cases are nonetheless reachable markdown
// that the old line scanner would have misread, so they are covered here with
// inline fixtures rather than left untested.

test('SYNTHETIC: a `# ` line inside an indented code block is not a title', () => {
  const body = ['Some prose introducing a snippet:', '', '    # not a heading', '    make build', ''].join(
    '\n',
  );

  assert.equal(LEGACY_H1_REGEX.test(body), false);
  assert.equal(findTitleHeading(body), null);
});

test('SYNTHETIC: an H1 inside a blockquote is not the article title', () => {
  const body = ['> # Quoted heading', '>', '> Someone else\u2019s document, quoted here.', ''].join('\n');

  assert.equal(findTitleHeading(body), null);
});

test('SYNTHETIC: a setext H1 is a title', () => {
  // No corpus file uses the setext form. It is supported because markdown
  // allows it, and because an mdast walk gets it for free where a `^# ` scan
  // never could.
  const body = ['The Rules of React', '==================', '', 'Body text.', ''].join('\n');

  assert.equal(LEGACY_H1_REGEX.test(body), false);
  assert.equal(findTitleHeading(body), 'The Rules of React');
  assert.equal(deriveTitle(undefined, body, 'react', 'synthetic.md'), 'The Rules of React');
});

test('SYNTHETIC: setext underlining is a title, `---` under a line is not', () => {
  // `---` makes a setext H2, not an H1. Getting this wrong would title every
  // article after its first bolded lead line.
  const body = ['Looks like a title', '---', '', 'Body text.', ''].join('\n');

  assert.equal(findTitleHeading(body), null);
});

// ---------------------------------------------------------------------------
// One parse, two questions
// ---------------------------------------------------------------------------

test('a shared tree gives the same answers as parsing per call', () => {
  const relPath = 'angular/docs/concepts/reactivity/signals.md';
  const body = corpusBody(relPath);
  const tree = parseArticleBody(body);

  assert.equal(findTitleHeading(tree), findTitleHeading(body));
  assert.equal(deriveTitle(undefined, tree, 'angular', relPath), 'Signals');
  assert.deepEqual(extractSections(tree), extractSections(body));
});

test('the title H1 is not among the extracted sections', () => {
  // `extractSections` takes `##`/`###` only, so the H1 the title comes from
  // never doubles as a TOC entry.
  const sections = extractSections(corpusBody('angular/docs/concepts/reactivity/signals.md'));

  assert.ok(sections.length > 0, 'expected this article to have `##` sections');
  assert.equal(
    sections.some((s) => s.heading === 'Signals'),
    false,
  );
});
