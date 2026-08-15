import type { MDXComponents } from 'mdx/types';

/**
 * Single registration map for article MDX. Routes must not define components
 * inline — every interactive widget is exported from this package.
 *
 * Spike stub: identity merge. Real components land with the chrome, not here.
 */
export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return components;
}
