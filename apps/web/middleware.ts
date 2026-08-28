import { NextResponse, type NextRequest } from 'next/server';

// Static set of valid (corpus, slug) combinations for the blog, and
// (course, slug) for lessons. Built once at build time from the catalog
// by `scripts/build-slug-allowlist.mjs` (runs in the `prebuild` script).
// Imported as a normal ES module — Next.js inlines this data into the
// middleware bundle at build time.
//
// Why this exists (D39):
//   `cacheComponents: true` + PPR makes Next.js generate an empty
//   `[slug].html` fallback (0 bytes, status 200) for URLs not in
//   `generateStaticParams()`. Vercel's edge serves this empty shell
//   for missing-slug URLs and short-circuits to `/500`. Even with
//   segment-level `not-found.tsx` (PR #56), app-wide `not-found.tsx`
//   (PR #63), and `generateMetadata`-notFound (PR #63), Vercel's edge
//   doesn't run the route handler for these URLs — the empty shell is
//   served directly.
//
//   Middleware runs BEFORE Next.js's static routing, so it can short-
//   circuit invalid URLs to a real 404 response, bypassing the empty
//   shell entirely.

import articleAllowlist from './slug-allowlist.json' assert { type: 'json' };
import lessonAllowlist from './lesson-allowlist.json' assert { type: 'json' };

// Type-narrow the imports (TS treats JSON imports as `any`).
const validArticleSlugs: ReadonlySet<string> = new Set(articleAllowlist);
const validLessonSlugs: ReadonlySet<string> = new Set(lessonAllowlist);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Match `/<locale>/blog/<corpus>/<slug>` and `/<locale>/courses/<course>/lessons/<slug>`.
  // The dynamic segments are nested under a locale prefix; only the `en`
  // locale is shipped today, but the regex is locale-agnostic so adding
  // more locales doesn't require a middleware change.
  const articleMatch = pathname.match(/^\/([^/]+)\/blog\/([^/]+)\/([^/]+)\/?$/);
  if (articleMatch) {
    const [, , corpus, slug] = articleMatch;
    const key = `${corpus}/${slug}`;
    if (!validArticleSlugs.has(key)) {
      // Return a real 404 — bypasses the empty `[slug].html` fallback shell.
      return new NextResponse(null, { status: 404 });
    }
  }

  const lessonMatch = pathname.match(/^\/([^/]+)\/courses\/([^/]+)\/lessons\/([^/]+)\/?$/);
  if (lessonMatch) {
    const [, , course, slug] = lessonMatch;
    const key = `${course}/${slug}`;
    if (!validLessonSlugs.has(key)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

// Run on every route under `/<locale>/blog/...` and `/<locale>/courses/...`.
// Excludes static assets and Next.js internals (default matcher excludes
// `/_next/*` and common file extensions, but be explicit for clarity).
export const config = {
  matcher: [
    '/:locale/blog/:corpus/:slug',
    '/:locale/courses/:course/lessons/:slug',
  ],
};
