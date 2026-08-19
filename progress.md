# corpus-web — progress

Maintainer-facing tracking document. See `.agents/summary.md` for the agent-facing
snapshot and `roadmap.md` for the planning rationale.

`roadmap.md` is stable and is not updated per session. This file is.

This file is edited **in place**. It is deliberately absent from `.gitattributes`, so it
is never union-merged — see `.cursor/rules/00-session-protocol.mdc`.

**This file is the authority for exact article counts.** Measured 2026-08-17 against
the current pins: **197 selected, 181 adapting** — nextjs 10/10, react 58/73, angular
93/94, nestjs 20/20. `roadmap.md` carries the order of magnitude only ("four corpora,
~200 articles") and is not updated when a count is re-measured.

## Legend

- ✅ Complete and reviewed
- 🟢 Drafted / working, awaiting review
- 🟡 In progress
- ⚪ Queued
- ❌ Dropped / out of scope

---

## Phase 0 — Spike & skeleton (🟢 drafted)

| # | Item | Status | Notes |
|---|---|---|---|
| 0 | Agent rules + generator + drift gate | ✅ | Session 0 |
| 1 | Monorepo scaffold (pnpm + Turborepo) | ✅ | Session 1 |
| 2 | **fumadocs × Next 16.3 × Cache Components spike** | ✅ | Session 1. All four exit criteria passed on `cache-components-model` |
| 3 | Content submodules + `sync-content.mjs` + `verify-submodules` | ✅ | Four mounts, pinned to tags. Gate proven dirty→fail; session 2 added an exact-count-of-4 check |
| 4 | Design tokens in `packages/ui` | 🟢 | `DESIGN.md` + `tokens.css` authored; listing chrome and the article shell apply them |
| 5 | DNS cutover `nxhhuy.tech` → Vercel | ⚪ | Vercel already deploys from `main`; not touched in the listing-routes slice |

**Gate:** one real article renders at a live URL.

---

## Phase 1 — Read-only corpus (⚪ queued)

| # | Item | Status | Notes |
|---|---|---|---|
| 6 | Frontmatter adapters + zod union, four mounted repos | ✅ | Session 2: run for real against every file in all four corpora and corrected (`docs/audit/frontmatter-2026-08-16.md`). Directory-shape, `title`, and `status` mismatches fixed. Session 2 follow-up: `deriveTitle` rewritten as an mdast walk — the regex was matching inside code fences — with tests in `packages/content-schema/test/`, typechecked as of the `@types/node` (`^22`, the lowest consumer) addition |
| 6b | Section extraction (`extractSections()`) | ✅ | Session 2: mdast-based, GitHub-slug anchors verified against real `react-concepts` cross-references. Session 2 follow-up: accepts a pre-parsed tree so title derivation and section extraction share one parse per file |
| 7 | `build-catalog.mjs` → routes + sidebar tree | ✅ | Session 3: listing routes plus article/lesson wrappers generate from `catalog.json` (181 articles, 289 edges, one path `react-render-cycle`). Session 2: real implementation, emit-with-exclusions, four-way link report. Re-measured: `build-catalog` writes — 181 of 197 articles, **289 edges**, 16 excluded (D11 + D15), 44 unresolved refs recorded (D13). `verify-links` still fails on the 44. |
| 7b | `verify-frontmatter.mjs` / `verify-links.mjs` / `verify-catalog.mjs` gates | ✅ | Session 2; `verify-catalog`'s four checks (dup uid, missing/draft path target, `root`-folder sentinel) proven against synthetic fixtures. Follow-up c added a fifth: non-empty `catalog.failures` exits 1. Follow-up d: `verify-links`'s only fatal condition is `unresolvedTargets`; excluded/draft/planned/demo targets warn, and adaptation failures warn there because `verify-frontmatter` owns them. `verify-catalog` gained two structural checks (every edge resolves; every excluded target names a file in `failures`), both proven by tampering with a built artifact. All three still correctly fail on current content |
| 8 | Full route tree, every completed article renders | ✅ | 181 adapting articles at `/en/blog/[corpus]/[slug]`. 16 excluded 404. Lesson pairs from `react-render-cycle` at `/en/courses/[course]/lessons/[slug]`. The session-1 `/concepts` spike stays deleted. |
| 9 | Chrome: sidebar, breadcrumb, TOC rail, prev/next | ✅ | One `ArticleView`, two wrappers. Listing POC pinned shell + article POC body. Ten listed defects corrected; 18×2px ticks unchanged. D18 a11y remains debt. |
| 10 | Shiki code blocks (copy / download / expand) | ⚪ | Debt D20. Copy/download/expand ship unhighlighted. |
| 11 | Pagefind search + ⌘K dialog | ⚪ | Disabled top-bar search matches the listing POC: `Search` label, `Coming soon` placeholder, `⌘K` hint, one line inside `--tb`. Debt D21 |
| 12 | Mobile layout | 🟢 | Article/lesson mobile is a drawer, not a stacked curriculum. 390px visual pass is still human. **Headless Chrome clamps its window to roughly 500px**, so a `--window-size=390,900` run silently measures 500px; measure inside a fixed-width iframe |
| 13 | Corpus landing at `/en` + `/en/license` (roadmap §15.1) | 🟡 | `/en` transcribes listing-POC `#p-home`: census readout from `catalog.json`, two CTAs, hero band, corpus ratio bars + adapting/version footer, split "Three ways in" with the demo panel as aside, tag-legend reading conventions. `/en/license` is Debt D25 |
| 14 | SEO baseline: metadata, OG, sitemap, JSON-LD | 🟡 | Listing and article pages ship metadata + WebSite/Organization/TechArticle/BreadcrumbList JSON-LD. Sitemap, robots.txt, OG images are Debt D22 |
| 15 | Cache Components strategy, verified via `.next/server/app/**.html` | 🟡 | Nothing above the article/lesson pages reads `cookies()`, `headers()`, or `searchParams`. Inspected prerender HTML (181 blog + 12 lesson files). Build table groups generated article/lesson paths as `◐` with leftover `[slug]` templates; listing concretes stay `○`. No `ƒ`. `dynamicParams` is incompatible with Cache Components. D23 |
| 16 | `description` frontmatter pass, four framework corpora (197 files) | 🟡 | **Debt D5, no longer blocking item 7.** The pass has landed in all four: `nextjs@v0.3.0` 10/10, `react@v0.5.0` 58/73, `angular@v0.3.0` 93/94, `nestjs@v0.3.2` 20/20 — 181 of 197 adapt. Two named residues remain, both corpus-side: the 15 untitled `react` articles the pass deliberately skipped (D11) and `angular`'s duplicate `widget-deployment.md` (D15). `nestjs@v0.3.1` recovered `dtos-and-class-validator` (D12 closed), which is the +1 selected / +1 adapting |

**Gate:** a complete, shippable, useful site with zero backend.

---

## Phase 2 — Backend & identity (⚪ queued)
## Phase 3 — Retention loop (⚪ queued)
## Phase 4 — Depth (⚪ queued)
## Phase 5 — Conditional (⚪ queued)

See `roadmap.md` §15 for item-level detail.

---

## Debt

Debt register moved to [`docs/DEBT.md`](./docs/DEBT.md).

---

## Session log

- **session-3-article-routes home POC (2026-08-19):** `/en` transcribed from
  `docs/design/listing-pages-poc.html` `#p-home`. Census readout, two CTAs,
  hero band, corpus ratio bars, split "Three ways in", tag-legend
  conventions. Demo-labs row removed (not in `#p-home`). Do not auto-merge.
- **session-3-article-routes chrome (2026-08-19):** five listing/article chrome
  defects on PR #21. Home graph SVG dropped (all 289 catalog edges are
  intra-corpus) for the listing-POC coming-soon card. Top bar locked to
  `--tb`; search is one line (`Search` / `Coming soon` / `⌘K`). Sidebar
  corpus select clip was insufficient top offset from the overflowing
  header, not a sticky CORPUS row. Corpus card one-liners taken from the
  listing POC. Do not auto-merge.
- **session-3-article-routes (2026-08-19):** one `ArticleView`, two wrappers —
  `/en/blog/[corpus]/[slug]` (181) and
  `/en/courses/react-render-cycle/lessons/[slug]` (12). Lesson
  `rel=canonical` points at the blog URL. Unresolved/excluded related refs
  are plain text. Shared listing top bar; listing footer stays on `PageShell`.
  Build table: listing concretes `○`, article/lesson generated paths grouped
  `◐`, no `ƒ`. Inspected prerender HTML. Debt D17–D26 unchanged. Do not
  auto-merge. Do not mark Phase 0 item 5 complete.
- **session-3-listing-routes (2026-08-19):** catalog-driven `/en`,
  `/en/courses`, `/en/courses/[course]`, `/en/blog`. Spike at
  `/[locale]/concepts/[repo]/[...slug]` deleted. Article component and both
  article wrappers out of scope. Debt **D17–D26** opened. Do not auto-merge.
- **poc-grid-review (2026-08-19):** reviewed the article component against
  `docs/design/article-layout-poc.html`. The component does not exist — `apps/web`
  is still the session-1 spike, and there is no `/en/blog` or
  `/en/courses/[course]/lessons/[slug]` route, so nothing has drifted into two
  copies. Both named grid defects were live in the POC and are fixed there: the
  desktop template, the explicit placement, and `.view.nosb` now sit in
  `@media (width > 1000px)`, complemented by `(width <= 1000px)`, which placed
  every child and let the `visibility:visible` specificity patch be deleted.
  Measured at 1440 / 1000 / 390px, default and collapsed. No new debt ID; the
  missing recurrence gate is already a session-3 §7 deferral. Do not auto-merge.
- **debt-d6-skill (2026-08-19):** `.claude/skills/corpus-nest-module/SKILL.md`
  no longer calls `forbidUnknownValues` a Nest "reversal". Description and body
  now match the rule files (seeded overridable default). `AGENTS.md`
  regenerated. D6 already closed; census unchanged. Do not auto-merge.
- **debt-d6-rules (2026-08-19):** `.cursor/rules/20-never-violate.mdc` and
  `50-api-nestjs.mdc` no longer say Nest "forces" `forbidUnknownValues: false`.
  `AGENTS.md` regenerated. D6 already closed; census unchanged. Do not auto-merge.
- **promote-nestjs-v0.3.2 (2026-08-19):** pinned `content/nestjs` from
  `nestjs-concepts@v0.3.1` to `@v0.3.2`. Closes Debt D6 (ValidationPipe
  `forbidUnknownValues` claim corrected in the corpus). Census unchanged at
  **197 selected / 181 adapting**. Verified `pnpm build:catalog`: 181 articles,
  289 edges, 16 excluded, 44 unresolved. No article added, removed or renamed.
  Three `content_hash` changes: `validationpipe-in-depth`,
  `dtos-and-class-validator`, `typescript-for-nest`. D13 stays at 44 refs / 33
  targets. Do not auto-merge.
- **authoring-stage-not-publication (2026-08-18):** `status` removed from the publication
  decision. `Article.status: 'draft' | 'complete'` renamed to
  `Article.authoringStage: string`, carrying the corpus's raw value through (trimmed
  strings, or a stable sorted-key encoding for the two object shapes) instead of collapsing
  everything but `complete`/`published`/`final` to `'draft'` — a mapping no corpus ever
  satisfies. Deleted draft gating from `buildLinkReport`, `build-catalog.mjs`'s and
  `verify-catalog.mjs`'s path-item validation; `Catalog.draftTargets` /
  `LinkReport.draftTargets` kept in the schema but now always `[]`. Rebuilt:
  **289 edges, up from 0** — every one of the 181 adapting articles had normalised
  `status` to `draft`, so every one of the ~289 resolvable cross-article refs was a
  non-rendering warning instead of a live link. Article count (181/197), exclusions (16,
  D11/D15), and unresolved refs (44, D13) are unchanged — `verify-links` and
  `verify-catalog` confirmed to fail on the same pre-existing counts before and after.
  `NEXT_PUBLIC_SHOW_DRAFTS` repointed in `.cursor/rules/30-content-pipeline.mdc` to a
  future UI-surfacing flag; no code reads it anymore. Flagged Debt **D6** as more urgent:
  the invalidated `nestjs/dtos-and-class-validator` claim was previously hidden by draft
  gating and now renders in every build.
- **content-watch-honest-diff (2026-08-18):** `catalog-diff.mjs` now warns when a
  snapshot is missing or unparseable instead of treating `{}` as a genuine empty
  catalog. `build-catalog` writes `catalog.json` with unresolved refs recorded
  (`catalog.unresolvedTargets`); `verify-links` stays fatal on D13. Simulated
  content-watch against `nestjs-concepts` `v0.3.0` → `v0.3.1` reports
  **180 → 181** and `nestjs/dtos-and-class-validator` added, not 0 → 0.
- **task-doc-refactor (2026-08-17):** extracted the debt register into
  `docs/DEBT.md` (D1–D15, IDs unchanged). `progress.md` keeps a pointer.
  Document authority map and SESSION-LOG/CHANGELOG split added to rule 00.
  `.agents/summary.md` kept as the agent-facing snapshot of gotchas.
- **promote-nestjs-v0.3.1 (2026-08-17):** pinned `content/nestjs` from
  `nestjs-concepts@v0.3.0` to `@v0.3.1`. Recovers `validation/dtos-and-class-validator.md`
  (Debt D12 closed). Census **197 selected, 181 adapting** (nestjs 20/20). Six inbound
  refs to that article are now draft-target warnings; the recovered article added one
  unresolved outbound ref to `nestjs/nested-dto-not-validated`. D13 is 44 refs / 33
  targets. No `content_hash` change on the 19 previously adapting nestjs articles; the
  new article's body hash matches the old `.ts` file. Do not auto-merge.
- **Article-count split (2026-08-17):** this file is now the authority for exact
  article counts — 196 selected, 180 adapting, nextjs 10/10, react 58/73, angular
  93/94, nestjs 19/19. `roadmap.md` keeps "four corpora, ~200 articles" and is not
  updated when a count is re-measured. Recorded in
  `.cursor/rules/00-session-protocol.mdc` so the two are not synced.
- **Doc repair (2026-08-17):** removed union-merge damage from this file and
  `.agents/summary.md`. Both are edited in place and are deliberately absent from
  `.gitattributes`, but four promotion rebases plus follow-ups c and d were resolved as
  though they carried `merge=union`, so both files ended up holding every historical
  claim at once. Deleted 5 duplicate `Last updated` headers, 4 duplicate `7` rows, 4
  duplicate `7b` rows, 3 duplicate `16` rows, 3 duplicate `D5` rows and 1 duplicate `D6`
  row. Resolved the debt-ID collisions: **D12** keeps its earliest claim (the
  `nestjs-concepts` `.ts`-extension article) and the later link-report claim was
  renumbered to **D14**; the angular duplicate file, previously tracked only inside a D5
  row, became **D15**. Every surviving fact was re-measured against the pinned corpora
  rather than inherited — 180 of 196 adapt, 16 fail, `verify-links` fails on 49 refs
  across 34 distinct targets. Two rows were factually wrong and are corrected: D12's file
  is present, not absent, and D13's distinct-target count is 34, not 23. Added the
  append-only debt-ID rule and the never-union-merge rule to
  `.cursor/rules/00-session-protocol.mdc`.
- **promote-content nextjs v0.3.0 (2026-08-16):** bumped `content/nextjs` from
  `v0.2.0` to `v0.3.0`. All ten nextjs articles now carry `description` and adapt
  cleanly. Body `content_hash` unchanged (dek-only frontmatter). Catalog still
  blocked on D5 in react/angular/nestjs and D11 in react. Do not auto-merge.
- **Promote-content (2026-08-16):** pinned `content/react` to `react-concepts@v0.5.0`.
  58 titled articles now carry `description` and adapt; bodies (and therefore
  `content_hash`) are unchanged. React adapter excludes `prompts/` so the new
  `prompts/description-pass.md` is not selected as an article. Debt D11 still 15
  articles; D5 remains on nextjs/angular/nestjs.
- **Promote-content angular v0.3.0 (2026-08-16):** pinned `content/angular` from
  `v0.2.0` to `v0.3.0` (description frontmatter pass). 93 of 94 selected angular
  articles now adapt; `docs/recipes/elements/widget-deployment.md` is the leftover
  miss and was not patched here. No `article_id` / `recipe_id` changes; no
  `contentHash` changes (bodies identical). Catalog still cannot build (D5 on the
  other three corpora plus that one recipe).
- **promote-nestjs-v0.3.0 (2026-08-16):** pinned `content/nestjs` to `nestjs-concepts@v0.3.0`
  (description pass, 19/19 articles). Zero `content_hash` changes — body untouched.
  Catalog still cannot build (D5/D11 in the other three corpora). New Debt D12 for
  the missing `dtos-and-class-validator.md` file.
- **Session 2 follow-up d (2026-08-16):** classified the link report four ways —
  `edges` / `excludedTargets` / `draftTargets` / `unresolvedTargets` — so the build fails
  once on a root cause and never on its symptoms. The 15 unadaptable articles were producing
  79 inbound "unresolved" hard failures, restating each root cause once per referring
  article and burying the 49 refs that point at nothing at all. Excluded and draft targets
  now warn and travel in `catalog.json` so the renderer emits plain text instead of a dead
  link; only a ref resolving to nothing is fatal. `.cursor/rules/30` carries the severity
  table so the rule and the code agree. Closed **D12**; rewrote **D13** with all 49 refs
  itemised in `docs/audit/unresolved-refs-2026-08-16.md` — which found one complete `nestjs`
  article saved with a `.ts` extension, two `nextjs` articles staged as `.md.tpl`, and zero
  rename leftovers.
- **Session 2 follow-up c (2026-08-16):** `build-catalog.mjs` changed from
  refuse-on-any-failure to emit-with-exclusions. A file that cannot adapt is left out of
  `catalog.articles` and recorded in a new required `catalog.failures` array (`repo`,
  `sourcePath`, `reason`); `verify-catalog` exits 1 while that array is non-empty and
  `verify-frontmatter` is untouched, so CI stays exactly as red while the artifact stops
  being hostage to the worst file in the corpus. Proven against a synthetic four-corpus
  fixture. Measuring the change surfaced two new debts: **D12**, the link report is
  separately fatal and still blocks a real catalog, and **D13**, 49 `related` refs point
  at articles that exist in no corpus.
- **Session 2 follow-up b (2026-08-16):** `packages/content-schema` now typechecks its
  own tests — `tsconfig.json` includes `test/`, with `@types/node` `^22.19.0` as a
  devDependency. The major is deliberate: the package is consumed by `apps/web` on Node
  22 and `apps/api` on Node 24, so typing against the lower consumer keeps the type set a
  subset of both and anything that typechecks runs on either. `^24` would let a
  Node-24-only API pass here and fail at run time on web.
- **Session 2 follow-up (2026-08-16):** fixed `deriveTitle()`, which matched `/^#\s+(.+)$/m` against
  the raw body and so read `# ` lines out of fenced code blocks. It had been titling
  `react/rendering/react-compiler-deep-dive.md` from a shell comment inside an
  `npm i -D` fence. Replaced with an mdast walk over the tree's top-level children,
  sharing one parse per file with `extractSections()`; setext H1 comes free. Added the
  first test suite in the repo (`packages/content-schema/test/derive-title.test.ts`,
  `node:test` via `tsx`), run against real corpus files. Re-ran the audit: Debt D11 is
  **15** articles, not 14.
- **Session 2 (2026-08-16):** ran the four adapters for real against all four mounted
  corpora (`docs/audit/frontmatter-2026-08-16.md`); corrected directory-shape (`react`/
  `nestjs` have no `docs/` wrapper), `title` (derived from H1 — no article has a `title`
  key), and `status` (object shape in `react`/`nestjs`/some `angular` recipes) mismatches.
  Added `extractSections()`, a real `build-catalog.mjs`, and the `verify-frontmatter` /
  `verify-links` / `verify-catalog` gates, plus an exact-count check to
  `verify-submodules`. Closed Debt D2/D3; opened Debt D11 (14 `react-concepts` articles
  with no derivable title). The build cannot currently pass — blocked on the pre-existing
  Debt D5 (missing `description` everywhere) — which is expected, not a regression.
- **Session 1 (2026-08-15):** pnpm/Turborepo scaffold, seven content submodules
  pinned to tags, `verify-submodules` gate (proven), fumadocs × Next 16.3 × Cache
  Components spike **passed** on `cache-components-model`. `auth`/`authz`/`websec`
  observed as demo labs, not markdown corpora.
- **Session 0g (2026-08-15):** generated `.cursor/rules/60-skills.mdc` so Cursor reaches
  the skills; third-party skill precedence rules added.
- **Session 0f (2026-08-15):** eight agent skills authored in `.claude/skills/`, indexed
  into `AGENTS.md`, frontmatter validated in CI. `.agents/skills/` migrated and removed.
- **Session 0e (2026-08-15):** repo renamed `concepts-web` -> `corpus-web`; npm scope
  -> `@corpus/`. Token-exact, no collateral damage to legitimate `concepts` usages.
- **Session 0d (2026-08-15):** corpus set finalised at **seven mounted** —
  `demo-attacked-web` added as `websec`; `dsa-concepts` reclassified as planned (no
  remote) and moved to Debt D1. Introduced `PlannedRepoId` / `KnownRepoId` so refs to
  unpublished corpora warn rather than hard-fail. Repo visibility and per-repo default
  branch now modelled.
- **Session 0c (2026-08-15):** `packages/content-schema` authored and typechecked (zod
  4.4.3, adapters smoke-tested); `packages/ui` design direction + tokens; CI workflow;
  ADR template + ADR-0001; session-2 and corpus-description-pass prompts. Corrected a
  session-0 error: `.gitignore` cannot protect submodule contents.
- **Session 0b (2026-08-15):** Q8 resolved — no personal content. Added the personal-content
  boundary rule, replaced the portfolio plan with a corpus landing spec (roadmap §15.1).
- **Session 0 (2026-08-15):** repo scaffold — six Cursor rule files, agent-doc generator
  with CI drift gate, `.agents/` docs, changelog, this tracker. No application code.
  Next: fumadocs spike.
