---
name: corpus-next-caching
description: "Caching, rendering and verification rules for Next.js 16.3 with Cache Components enabled. Use when adding or editing any route, page, layout, loading boundary, Suspense boundary, server component, or data fetch in apps/web, and when verifying prerender output. Covers 'use cache', cacheLife, the client boundary, and why curl and next dev both under-report failures."
---

# Next.js 16.3 with Cache Components

Cache Components is ON. Most Next.js material predates this and is now wrong — that is
the corpus's own thesis, so getting it wrong here forfeits the argument.

## Caching strategy

| Surface | Strategy |
|---|---|
| Article body | `'use cache'` + `cacheLife('max')`, keyed on `contentHash` |
| Sidebar tree, corpus index | `'use cache'`, module level |
| Search index | static asset, not a route |
| Progress ticks, quiz results, SRS counts | Suspense boundary, uncached, per-user |

## The degradation contract

An article page must prerender independently of `api.nxhhuy.tech`. An API outage degrades
the site to a read-only corpus, never to a blank page.

Practically: nothing in the static shell may await an API call. Per-user data enters only
through a Suspense boundary below the shell.

```tsx
export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { locale, repo, slug } = await params;
  const article = await getArticle(repo, slug);

  return (
    <article>
      <ArticleBody article={article} />
      <Suspense fallback={<RailSkeleton sections={article.sections} />}>
        <ProgressRail articleUid={article.uid} />
      </Suspense>
    </article>
  );
}

async function getArticle(repo: RepoId, slug: string) {
  'use cache';
  cacheLife('max');
  return loadFromCatalog(repo, slug);
}
```

## Verification — this is where people get it wrong

**Never verify prerendered shell content with `curl` or view-source.** The response is
streamed; both under-report what was actually prerendered. Read the build output:

```bash
pnpm --filter web build
cat apps/web/.next/server/app/en/concepts/nextjs/<slug>.html | grep -c "<article"
```

**`next dev` under-reports severity.** Some prerender failures present as HTTP 200 in dev
and are fatal at build. A route that works in dev proves nothing. Always confirm with a
production build before claiming a route works.

## Avoid

- Never `export const revalidate` or `export const dynamic` — those are the pre-Cache-Components
  API and do not express what is needed here
- Never `unstable_cache` or `fetch(url, { next: { revalidate } })`
- Never expect `'use cache: private'` to reduce API load — it is per-session request
  memoization, **zero server-side caching**
- Never pass a class instance across the client boundary — on a prerendered route this is a
  hard build failure, not silent degradation. Pass plain objects
- Never read `Date.now()`, `process.env`, or headers inside a `'use cache'` scope and expect
  freshness — sync IO there is legal and freezes at entry creation
- Never put `'use client'` on a layout or page — leaves only
- Never use the Pages Router
- Never disable Cache Components to make something build

## Reference

`references/suspense-placement.md` — boundary granularity, and why TTFB cannot measure it.
