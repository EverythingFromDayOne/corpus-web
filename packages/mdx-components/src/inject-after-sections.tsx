/**
 * Inject registered widgets immediately after the section they belong to.
 *
 * "After the section" means after that heading's body, immediately before the
 * next heading (or at the end of the article). Matches OverrideInjection's
 * `afterSection` and QuizQuestion.afterSection.
 *
 * Headings are identified by `props.id` (the catalog slug). Native `h2`/`h3`
 * work, and so do function-component tag overrides — fumadocs MarkdownServer
 * replaces `h2`/`h3` with functions, so `type === 'h2'` never matches the
 * production tree. Empty `afterSection` still means end of article.
 */
import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

export type SectionInjection = {
  afterSection: string;
  node: ReactNode;
};

type HeadingHit = { id: string };

function headingOf(node: ReactNode): HeadingHit | null {
  if (!isValidElement(node)) return null;
  const id = (node.props as { id?: unknown }).id;
  if (typeof id !== 'string' || id.length === 0) return null;
  const type = node.type;
  if (type === 'h2' || type === 'h3') return { id };
  // fumadocs MarkdownServer swaps overridden `h2`/`h3` for function
  // components. The native heading (and its id) exists only after React
  // renders them. Catalog slugs are assigned at mdast and forwarded as
  // `props.id`, so a function child with an id is a section heading.
  if (typeof type === 'function') return { id };
  return null;
}

function isFragment(node: ReactNode): node is ReactElement<{ children?: ReactNode }> {
  return isValidElement(node) && node.type === Fragment;
}

function childrenOf(node: ReactNode): ReactNode[] {
  if (node == null || typeof node === 'boolean') return [];
  if (Array.isArray(node)) return Children.toArray(node);
  if (isFragment(node)) return Children.toArray(node.props.children);
  if (isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    const id = (node.props as { id?: unknown }).id;
    // A heading is a leaf for this walk even if it has text children.
    if (typeof node.type === 'string' && (node.type === 'h2' || node.type === 'h3')) {
      return [node];
    }
    if (typeof node.type === 'function' && typeof id === 'string' && id.length > 0) {
      return [node];
    }
    // Unwrap a single anonymous wrapper (the markdown renderer root).
    if (typeof node.type === 'string' && typeof id !== 'string') {
      return Children.toArray((node.props as { children?: ReactNode }).children);
    }
  }
  return Children.toArray(node);
}

function wrapLike(original: ReactNode, children: ReactNode[]): ReactNode {
  if (isFragment(original)) {
    return cloneElement(original, undefined, ...children);
  }
  if (
    isValidElement(original) &&
    typeof original.type === 'string' &&
    original.props &&
    typeof original.props === 'object' &&
    'children' in original.props &&
    typeof (original.props as { id?: unknown }).id !== 'string'
  ) {
    return cloneElement(original, undefined, ...children);
  }
  if (children.length === 1) return children[0];
  return children;
}

export const END_OF_ARTICLE = '';

export function injectAfterSections(body: ReactNode, injections: readonly SectionInjection[]): ReactNode {
  if (injections.length === 0) return body;

  const byAnchor = new Map<string, ReactNode[]>();
  for (const item of injections) {
    const list = byAnchor.get(item.afterSection) ?? [];
    list.push(item.node);
    byAnchor.set(item.afterSection, list);
  }

  const placed = new Set<string>();
  const source = childrenOf(body);
  const out: ReactNode[] = [];
  let openId: string | null = null;

  function closeSection() {
    if (!openId) return;
    const nodes = byAnchor.get(openId);
    if (nodes) {
      out.push(...nodes);
      placed.add(openId);
    }
  }

  for (const child of source) {
    const heading = headingOf(child);
    if (heading) {
      closeSection();
      openId = heading.id;
    }
    out.push(child);
  }
  closeSection();

  const endNodes = byAnchor.get(END_OF_ARTICLE);
  if (endNodes) {
    out.push(...endNodes);
    placed.add(END_OF_ARTICLE);
  }

  const missing = [...byAnchor.keys()].filter((key) => key !== END_OF_ARTICLE && !placed.has(key));
  if (missing.length > 0) {
    throw new Error(
      `interactive injection afterSection not found in article: ${missing.join(', ')}`,
    );
  }

  return wrapLike(body, out);
}
