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
 * Extract `##`/`###` headings from an article body, in document order.
 *
 * Anchors replicate GitHub's own heading-slug algorithm exactly — see the
 * `githubSlug` doc comment. Roughly ninety internal links in `react-concepts`
 * were authored and repaired against those anchors (session 2 task 4); a
 * subtly different slugifier here would silently break every one of them.
 */
export function extractSections(body: string): ArticleSection[] {
  const tree = processor.parse(body) as Root;
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
