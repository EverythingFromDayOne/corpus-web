/**
 * polish/react-jsx-key-hygiene: structural regression test.
 *
 * The runtime warning we caught on /en/blog
 * (`Each child in a list should have a unique "key" prop`) is normally
 * caught by ESLint's `react/jsx-key` rule going forward
 * (tooling/eslint/frontend.mjs enforces it at error severity).
 *
 * This test is the belt-and-braces: it walks every `.tsx` file
 * inside `apps/web/` and asserts that any `array.map(` call whose
 * arrow body returns a JSX element has a `key=` prop within the
 * first 12 lines. If this test fails alongside a clean `pnpm lint`,
 * the structural regression has reappeared; open the file at the
 * printed line and add the missing `key`.
 *
 * Heuristic strategies:
 *  1. Skip the `.map()` immediately if the arrow body has no JSX
 *     (e.g. `arr.map(x => x.name)`, `arr.map(x => { return x; })`).
 *  2. Track two `=>` styles:
 *     - `(item) => ({ ... })` — inline object literal (data transform)
 *     - `(item) => {` — block body that may contain `if`/early-return
 *     - `(item) => <Foo ...>` or `(item) => (<Foo ...>)` — JSX-returning
 *  3. Data-shape transform objects (`=> ({` immediately following the
 *     arrow body) are filtered out — they don't render directly.
 *  4. Block-body arrows (`=> {` at end of line) are kept alive as long
 *     as the body eventually returns JSX. The 12-line look-ahead is
 *     long enough to catch `<Foo` opens inside `return { node: (<Foo`
 *     shapes (article-markdown.tsx) — those ARE legitimate JSX
 *     chains where React's render-time `key` belongs on the OUTER
 *     consumer (injectAfterSections), not the inner element.
 *  5. Filter out `array.map(...)` followed by `.join(...)` or `.flatMap`
 *     which are pure data transforms.
 */
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const ROOT = join(process.cwd(), '..', '..');
const APP_WEB = join(ROOT, 'apps', 'web');

function walkTsx(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (
      name === 'node_modules' ||
      name === '.next' ||
      name.startsWith('.') ||
      name === 'coverage' ||
      name === 'dist' ||
      name === 'test'
    )
      continue;
    const path = join(dir, name);
    let st: import('node:fs').Stats;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkTsx(path, out);
    else if (name.endsWith('.tsx')) out.push(path);
  }
  return out;
}

type Issue = { file: string; line: number };

const MAP_PRESENT = /\.map\s*\(/;
// Strict JSX-open: must start with `<` followed by a Capital / lowercase
// letter / `$` / `>`. NOT a TS `<` operator (e.g. `arr.map<T>`).
const JSX_OPEN = /^[^\S\n]*<([A-Za-z_$]|>)/;
const KEY_PROP = /\bkey\s*=/;

// Inline data-shape transform: `.map((x) => ({ ... })` — abort.
const OBJECT_OPEN_INLINE = /=>\s*\(\s*\{/;
// Block body + opening `{` on the next line: `.map((x) => (\n  {...},\n)`
const OBJECT_OPEN_BLOCK = /=>\s*\(\s*$/;
// Multi-line data-shape transform: arrow body on next line begins
// with `(part) => ({`. The `.map(` line just ends with the closing
// `)` (sometimes) and the arrow declaration spills to next line.
const MULTILINE_OBJECT_HEAD = /^\s*\(\s*\w+\s*\)\s*=>\s*\(\s*\{/;

// Plain-expression transforms that don't render JSX:
const NON_JSX_TAIL = /\)\.(?:join|flatMap|filter|reduce|some|every|toArray|toString)\b/;
// `(x) => fn(...)` or `(x) => someVar` — non-JSX-returning arrow.
const NON_JSX_EXPRESSION = /=>(?:\s*[a-zA-Z_$.(]|\s*$)/;

function findMissingKeys(src: string, filePath: string): Issue[] {
  const issues: Issue[] = [];
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (!MAP_PRESENT.test(line)) continue;
    if (OBJECT_OPEN_INLINE.test(line)) continue;
    if (NON_JSX_TAIL.test(line)) continue;
    let aborted = false;
    let foundJsx = false;
    let foundKey = false;
    // Check the first 12 lines ahead. Look for the JSX element open
    // OR abort when we know this isn't JSX-returning.
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const tx = lines[j] ?? '';
      if (OBJECT_OPEN_BLOCK.test(line) && j === i + 1 && /^[^\S\n]*\{/.test(tx)) {
        // (x) => (\n  { ... }\n) — data-shape transform; not JSX.
        aborted = true;
        break;
      }
      // Multi-line data-shape: `.map(\n  (item) => ({`. Abort.
      if (j === i + 1 && MULTILINE_OBJECT_HEAD.test(tx)) {
        aborted = true;
        break;
      }
      // once we've seen a `=>` expression on a non-arrow line, the
      // arrow body is purely expression-form (not JSX-returning).
      if (NON_JSX_EXPRESSION.test(tx) && !/</.test(tx)) continue;
      if (!foundJsx && JSX_OPEN.test(tx)) foundJsx = true;
      if (KEY_PROP.test(tx)) {
        foundKey = true;
        break;
      }
      if (foundJsx && /^[^\S\n]*\)/.test(tx)) break;
    }
    if (!aborted && foundJsx && !foundKey) {
      issues.push({ file: relative(ROOT, filePath), line: i + 1 });
    }
  }
  return issues;
}

test('structural scan finds no missing-key `array.map(() => <element>)` JSX sites', () => {
  const files = walkTsx(APP_WEB);
  // Allowlist of file-paths (relative to ROOT) where the scan is
  // known to produce false-positives due to non-React
  // `widgets.map((w) => ({ node: <Flashcard/> }))` shapes where
  // the consumer (`injectAfterSections`) doesn't render the
  // returned JSX directly, so a `key` prop is not required.
  const ALLOWLIST = new Set(['apps/web/lib/article-markdown.tsx']);
  const all: Issue[] = [];
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (ALLOWLIST.has(rel)) continue;
    const src = readFileSync(file, 'utf8');
    all.push(...findMissingKeys(src, file));
  }
  if (all.length > 0) {
    const report = all.map((i) => `  ${i.file}:${i.line}`).join('\n');
    assert.fail(`${all.length} potential missing-key site(s):\n${report}`);
  }
  assert.equal(all.length, 0);
});
