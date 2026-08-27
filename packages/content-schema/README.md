# @corpus/content-schema

The contract between seven corpus repos, the renderer, and the API. Three consumers,
one set of schemas — which is the reason this is a monorepo (roadmap §4.0).

## The adapter pattern

Seven corpora, seven slightly different frontmatter conventions, one internal shape.

```
content/reactjs/**.md  ──┐
content/nextjs/**.md   ──┤
content/angular/**.md  ──┤
content/nestjs/**.md   ──┼──> adapters/ ──> Article ──> catalog.json ──> web + api
content/dsa/**.md      ──┤
content/auth/**.md     ──┤  ⚠ convention unknown
content/authz/**.md    ──┘  ⚠ convention unknown
```

**The corpora are never rewritten to fit this package.** When a corpus changes its
frontmatter, exactly one adapter changes. This is the whole point: the corpus repos stay
standalone portfolio artifacts, and the compatibility cost lands here where it is cheap.

Adapters **normalise, never guess**. A missing required field throws with the repo, the
source path, and the field name — because the fix belongs in the corpus repo, and a
default value here would hide it forever.

## ⚠ Verification status

**The per-repo field names in `adapters/index.ts` are UNVERIFIED.** They were authored
from each corpus repo's own `roadmap.md` and `progress.md` conventions, not from reading
the article files, which were not available at authoring time.

Session 2 task 1 runs every adapter against its submodule and reports every mismatch.
When they disagree, **correct `adapters/index.ts` — never the corpus.**

**Confidence is not uniform.** The five framework corpora share a documented sibling
schema, so their specs are a reasonable guess. `auth` and `authz` carry a `demo-` prefix,
report HTML as their primary language, and have no convention on record — their specs are
a hypothesis. They may not be markdown corpora at all. Audit them first.

Confirmed from corpus records, not inferred:

- `difficulty` vocabulary is `foundational | intermediate | advanced`
- recipe refs in a `related` block carry a `recipes/` prefix
- `article_id` / `recipe_id` is always the filename slug, never a sequence number

Inferred and needing confirmation: the `*_baseline` key names per repo, the `docs/**`
include globs, the `status` value set, and whether `concept_folder` is present on recipes.

## What lives where

| File | Owns |
|---|---|
| `common.ts` | Repo ids, slugs, the `${repo}/${articleId}` uid, `related` ref shape |
| `article.ts` | The normalised `Article` and its extracted sections |
| `adapters/` | Per-corpus frontmatter schemas and normalisation |
| `sidecars.ts` | Quiz files — top-level `questions` (legacy) or `quiz` as one block / an array of blocks, each with `afterSection`. Flashcard *decks* for SRS (`DeckSidecar`) also live here. |
| `flashcard-sidecar.ts` | Inline flashcard strip (`front`/`back` only) mounted after a heading |
| `callout-sidecar.ts` | Themed notes (`info` / `success` / `warn` / `error`) |
| `dragdrop-sidecar.ts` | Fill-in-the-blank drag-and-drop (`slots` / `chips`; `accepts` and `correctSlots` stay server-side) |
| `curation.ts` | Paths and component-injection overrides — these live in the **site** repo |
| `catalog.ts` | `catalog.json`, the only content artifact the API sees |

## Tests and typechecking

`pnpm test` runs `test/*.test.ts` on `node:test` through `tsx`. `tsconfig.json` covers
`test/` alongside `src/`, so `pnpm typecheck` type-verifies the tests rather than leaving
them to `tsx`'s type-stripping.

`@types/node` is pinned to the **22** line deliberately. This package is consumed by
`apps/web` on Node 22 and `apps/api` on Node 24, so typing against the lower of the two
means anything that typechecks here runs on both. Typing against 24 would let a
Node-24-only API — the global `URLPattern`, for one — pass typecheck here and fail at
run time on web. Bump it only when `apps/web` moves.

## The claim / rendering split

> If it is a claim, it lives in the corpus. If it is a rendering, it lives here.

A quiz question asserts how a framework behaves, so it is a claim and belongs beside the
article under the corpus's verified-claims discipline (`sidecars.ts`). Where an event-loop
simulator gets injected is presentation and belongs in `curation/overrides/` (`curation.ts`).

## Local scoring, unrevealed projection

Scoring is `mode: 'local'` only (roadmap §7.4). The full `QuizSidecar` — including
`correct` and `explanation` — is what the Quiz component receives. `toClientQuiz()`
strips `correct` so the unrevealed option list can be rendered without putting the
key on the radios; it is not a server-mode key-hiding path, and there is no
serialisation test that asserts the key is absent from the client bundle.
