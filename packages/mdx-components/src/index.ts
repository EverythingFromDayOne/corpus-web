import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from './code-block';

export { CodeBlock, type CodeBlockLabels } from './code-block';

/**
 * Single registration map for article MDX. Routes must not define components
 * inline — every interactive widget is exported from this package.
 */
export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    pre: CodeBlock as unknown as MDXComponents['pre'],
    ...components,
  };
}
