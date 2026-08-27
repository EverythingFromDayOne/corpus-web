/**
 * Heading-anchored injection: parse markdown → catalog-matching slug →
 * inject → HTML position. Throwaway fixture, not a corpus article.
 */
import assert from 'node:assert/strict';
import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';
import { remarkGfm } from 'fumadocs-core/mdx-plugins';
import { injectAfterSections } from '@corpus/mdx-components';
import { remarkAssignHeadingIds } from '../lib/heading-ids';
import { githubSlug } from '../lib/slug';

const { MarkdownServer } = createMarkdownRenderer({
  remarkPlugins: [remarkGfm, remarkAssignHeadingIds],
});

function heading(props: { id?: string; children?: ReactNode }) {
  return createElement('h2', { id: props.id }, props.children);
}

function collectHeadingIds(node: ReactNode): string[] {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return node.flatMap(collectHeadingIds);
  if (!isValidElement(node)) return [];
  const id = (node.props as { id?: unknown }).id;
  const ids = typeof id === 'string' && id.length > 0 ? [id] : [];
  return [...ids, ...collectHeadingIds((node.props as { children?: ReactNode }).children)];
}

test('githubSlug matches catalog.sections anchors for jsx-and-rendering headings', () => {
  assert.equal(githubSlug('How it works under the hood'), 'how-it-works-under-the-hood');
  assert.equal(githubSlug('Element ≠ component ≠ instance'), 'element--component--instance');
  assert.equal(
    githubSlug('jsx, jsxs, jsxDEV — why there are three'),
    'jsx-jsxs-jsxdev--why-there-are-three',
  );
});

test('parse → inject → render mounts the quiz after a real heading slug', async () => {
  const markdown = `# Title

## How it works under the hood

The compiler emits elements, not DOM nodes.

## Basic usage

More text.
`;
  const afterSection = githubSlug('How it works under the hood');
  const body = await MarkdownServer({
    children: markdown,
    components: {
      h1: () => null,
      h2: heading,
    },
  });
  assert.deepEqual(collectHeadingIds(body), [
    'how-it-works-under-the-hood',
    'basic-usage',
  ]);

  const quiz = createElement('section', { className: 'av-qz', 'data-quiz': 'heading' });
  const injected = injectAfterSections(body, [{ afterSection, node: quiz }]);
  const html = renderToStaticMarkup(injected as ReactElement);
  const hood = html.indexOf('id="how-it-works-under-the-hood"');
  const paragraph = html.indexOf('The compiler emits elements, not DOM nodes.');
  const quizAt = html.indexOf('class="av-qz"');
  const basic = html.indexOf('id="basic-usage"');
  assert.ok(hood >= 0, 'targeted heading is in the HTML');
  assert.ok(paragraph > hood, 'section body follows the heading');
  assert.ok(quizAt > paragraph, 'quiz mounts after the section body');
  assert.ok(basic > quizAt, 'quiz sits before the next heading');
});
