import type { ReactNode } from 'react';

/**
 * Blog-route layout — wraps every /en/blog/* child in a `<div data-blog>`
 * so the .blog-content typography and --blog-* scoped tokens (declared
 * in packages/ui/src/tokens.css and apps/web/components/article/
 * blog-content.css) only fire inside blog routes. Lessons and corpus
 * articles are unaffected.
 *
 * App Router constraint: `<html>` lives in apps/web/app/layout.tsx and
 * cannot be re-emitted per route. Spec §14 caveat names the tradeoff —
 * this layout applies data-blog to a wrapping div instead, which CSS
 * selectors reach via descendant matching.
 */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return <div data-blog>{children}</div>;
}