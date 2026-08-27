/**
 * Assign in-page heading ids at the mdast layer, using the same GitHub-slug
 * algorithm as catalog.sections (`apps/web/lib/slug.ts`, copied from
 * `packages/content-schema/src/sections.ts`).
 *
 * fumadocs `MarkdownServer` replaces overridden tags with function components.
 * The native `<h2 id>` only exists after React renders those functions, so
 * `injectAfterSections` cannot see it. Ids have to live on the function
 * component's incoming props, which means they have to exist as HAST
 * `properties.id` first — `heading.data.hProperties.id` here, copied across
 * by remark-rehype.
 */
import { createSlugger } from './slug';

export type MdastLike = {
  type?: string;
  depth?: number;
  value?: string;
  data?: { hProperties?: Record<string, string> };
  children?: MdastLike[];
};

export function mdastText(node: MdastLike): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? '';
  return (node.children ?? []).map(mdastText).join('');
}

function visitHeadings(node: MdastLike, visit: (heading: MdastLike) => void) {
  if (node.type === 'heading') visit(node);
  node.children?.forEach((child) => visitHeadings(child, visit));
}

export function remarkAssignHeadingIds() {
  return (tree: MdastLike) => {
    const slug = createSlugger();
    visitHeadings(tree, (node) => {
      if (node.depth !== 2 && node.depth !== 3) return;
      const text = mdastText(node).trim();
      if (!text) return;
      const id = slug(text);
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id },
      };
    });
  };
}
