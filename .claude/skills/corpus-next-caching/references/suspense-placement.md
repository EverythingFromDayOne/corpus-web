# Suspense boundary placement

## Granularity cannot be measured with TTFB

TTFB does not distinguish fine-grained from coarse Suspense placement — the shell flushes at
the same moment either way. Measuring the wrong signal here produces confident, wrong
conclusions about boundary design.

Use the **`$RC` call count in the RSC stream** instead. Each `$RC` is one boundary resolving:

```bash
curl -sN https://nxhhuy.tech/en/concepts/nextjs/<slug> | grep -o '\$RC' | wc -l
```

This is the one thing `curl` is correct for — counting stream events, not inspecting
prerendered HTML.

## Placement rules for this site

- One boundary per independent per-user concern. The progress rail and the SRS due count are
  two concerns, not one — a slow SRS query must not hold the rail.
- Fallbacks must be layout-stable. The rail skeleton takes the section count from the
  already-prerendered article, so it renders the correct number of ticks and nothing shifts
  when real data arrives.
- Never wrap the article body in Suspense. It is fully cached; a boundary there adds a stream
  event and buys nothing.
