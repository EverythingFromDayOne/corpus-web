import type { Heading, Root } from 'mdast';
import { toString as mdastToString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { ArticleSection } from './article.js';

/**
 * Session 2 task 4. Walks the article body as an MDX/markdown AST — not a
 * line-by-line regex — specifically so a `# comment` inside a fenced code
 * block (real, observed in this corpus: shell/Python comment lines that start
 * a line with `# `) is never mistaken for a heading. A regex scanner cannot
 * tell those apart; `code` nodes in the parsed tree are opaque to `visit`.
 */
const processor = unified().use(remarkParse).use(remarkGfm);

/**
 * Parse an article body once so every consumer can share the result.
 *
 * `extractSections` and `deriveTitle` both need the same tree for the same
 * reason, and parsing ~200 article bodies twice per catalog build is pure
 * waste. Callers that already hold a `Root` pass it straight through; callers
 * holding only a string get parsed on the spot.
 */
export function parseArticleBody(body: string): Root {
  return processor.parse(body) as Root;
}

function asTree(source: string | Root): Root {
  return typeof source === 'string' ? parseArticleBody(source) : source;
}

/**
 * The article's own H1, or `null` when it has none.
 *
 * Only the tree's **top-level** children are considered. A `heading` node is
 * reachable from inside a blockquote, a list item, or a footnote definition,
 * and none of those is the document's title — a `> # Something` callout is a
 * quotation of a heading, not a heading of this article. Fenced and indented
 * code are excluded by the same pass for a stronger reason: both parse to a
 * `code` node whose contents are opaque, so a shell comment line reading
 * `# TypeScript projects also need the Babel core types:` can no longer be
 * read as a title the way a line-scanning regex read it.
 *
 * Setext H1 (`Title` underlined with `===`) is a `heading` of depth 1 in
 * mdast exactly as `# Title` is, so it needs no separate handling. No corpus
 * file currently uses the setext form; it is covered because the markdown
 * spec allows it, not because something in `content/` depends on it.
 *
 * The returned text is the heading's plain-text rendering, so inline markup
 * in an H1 (`# The \`use cache\` directive`) yields the words a reader sees
 * rather than the backticks that produce them.
 */
export function findTitleHeading(source: string | Root): string | null {
  for (const node of asTree(source).children) {
    if (node.type !== 'heading' || node.depth !== 1) continue;
    const heading = mdastToString(node).trim();
    if (heading) return heading;
  }
  return null;
}

/**
 * Extract `##`/`###` headings from an article body, in document order.
 *
 * Anchors replicate GitHub's own heading-slug algorithm exactly — see the
 * `githubSlug` doc comment. Roughly ninety internal links in `react-concepts`
 * were authored and repaired against those anchors (session 2 task 4); a
 * subtly different slugifier here would silently break every one of them.
 *
 * Unlike `findTitleHeading` this descends the whole tree, and the asymmetry is
 * deliberate: GitHub does emit an anchor for a heading nested in a blockquote,
 * so a nested `##` is a real link target even though a nested `#` is not the
 * document's title. Do not unify the two walks.
 */
export function extractSections(source: string | Root): ArticleSection[] {
  const tree = asTree(source);
  const sections: ArticleSection[] = [];
  const slugCounts = new Map<string, number>();
  let ordinal = 0;

  visit(tree, 'heading', (node: Heading) => {
    if (node.depth !== 2 && node.depth !== 3) return;
    const heading = mdastToString(node).trim();
    if (!heading) return;

    const anchor = dedupeSlug(githubSlug(heading), slugCounts);
    sections.push({ anchor, heading, depth: node.depth, ordinal });
    ordinal += 1;
  });

  return sections;
}

/**
 * GitHub's heading-anchor algorithm (also implemented by `github-slugger`,
 * not added here as a dependency since the rule is three lines): lowercase,
 * drop everything that isn't a word character, a hyphen, or a space — which
 * is what strips backticks, apostrophes, colons, commas, slashes, and em
 * dashes from a heading like `The `try/catch` redirect, paid` down to
 * `the-trycatch-redirect-paid` — then turn every remaining space into a
 * hyphen. Spaces are converted one-for-one, not collapsed first: a heading
 * with an em dash between two spaces (`Stage 4 — the stale-chunk case`)
 * legitimately produces a doubled hyphen (`stage-4--the-stale-chunk-case`),
 * confirmed against the real anchor in `error-boundaries.md`.
 */
function githubSlug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\- ]/g, '')
    .replace(/ /g, '-');
}

/** GitHub appends `-1`, `-2`, ... to a repeated anchor within one document. */
function dedupeSlug(base: string, counts: Map<string, number>): string {
  const seen = counts.get(base);
  if (seen === undefined) {
    counts.set(base, 0);
    return base;
  }
  const next = seen + 1;
  counts.set(base, next);
  return `${base}-${next}`;
}
