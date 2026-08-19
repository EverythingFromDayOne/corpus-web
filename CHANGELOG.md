# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### [2026-08-19] — cursor/session-3-article-routes-f628 — home page matches listing POC #p-home

**Added**
- `/en` census readout from `catalog.json` — articles, cross-links, corpora, unresolved (last in `--stale`)
- Hero CTAs: `Start the render cycle course` (primary) and `Browse all articles`
- Hero band: full-bleed 80px hairline grid plus surface-to-transparent gradient
- Corpus-card ratio bar (adapting/selected) and footer `N / M adapting` plus baseline version chip
- "How to read this corpus" tag legend (Concept / Recipe / Baseline / Provenance)

**Changed**
- `/en` transcribed from `docs/design/listing-pages-poc.html` `#p-home` rather than paraphrased
- "Three ways in" is a two-column split; the coming-soon demo panel is its `aside`, not beside the hero
- "The corpora" header includes a right-aligned `All articles →` link
- `.sec` blocks are separated by a top border

**Removed**
- Demo-labs row from `/en` (not in `#p-home`)
- Hero-adjacent demo placeholder

**Fixed**
- Nothing corpus-side. `verify-links` still fails on D13's 44 refs by design

### [2026-08-19] — cursor/session-3-article-routes-f628 — listing chrome defects

**Added**
- Nothing

**Changed**
- `/en` concept-graph teaser is the listing-POC coming-soon card in the entry grid (289 live catalog edges, all intra-corpus)
- Corpus card one-liners taken from `docs/design/listing-pages-poc.html`
- Disabled top-bar search: `Search` label, `Coming soon` placeholder, `⌘K` hint, one line
- Top bar height locked to `--tb` (listing POC)

**Removed**
- Home-page concept-graph SVG (`concept-graph-teaser.tsx`)

**Fixed**
- Search control no longer wraps a second "coming soon" and overflow `--tb`
- Article sidebar corpus select no longer sits under the top bar; CORPUS row is not sticky

### [2026-08-19] — cursor/session-3-article-routes-f628 — article and lesson routes

**Added**
- `/en/blog/[corpus]/[slug]` — 181 adapting articles from `catalog.json`
- `/en/courses/[course]/lessons/[slug]` — 12 `react-render-cycle` lessons; `rel=canonical` to `/en/blog/…`
- One `ArticleView` for both routes (corpus tree vs curriculum chrome)
- Code blocks with provenance strip, copy / download / expand
- TOC rail with 18×2px ticks and anonymous `localStorage` progress

**Changed**
- Listing footer moved onto `PageShell`; article routes reuse the existing top bar
- `@corpus/mdx-components` consumed with Bundler module resolution

**Removed**
- Locale-layout footer on article routes

**Fixed**
- Unresolved and excluded `related` refs render as plain text, never links
- Excluded articles are omitted from `generateStaticParams` and 404 via `notFound()`

### [2026-08-19] — cursor/session-3-listing-routes-9394 — Tailwind v4 exact pin corrected to 4.3.3

**Changed**
- `apps/web/package.json` — `tailwindcss` and `@tailwindcss/postcss` exact pin `4.1.0` → `4.3.3`
- `pnpm-lock.yaml` — re-resolved for the new pin

**Fixed**
- The prior pin (`4.1.0`) was the lowest version satisfying `roadmap.md` §3's "v4, no patch specified" constraint, not a chosen one, and it silently downgraded away from the `4.3.3` the lockfile had already resolved and the Vercel preview was built against

### [2026-08-19] — cursor/session-3-listing-routes-9394 — catalog-driven listing routes

**Added**
- `/en` corpus landing from `catalog.json` — live counts, graph teaser, featured course, reading conventions
- `/en/courses` index and `/en/courses/[course]` detail with `#curriculum` and per-item `note`
- `/en/blog` article index — 181 adapting articles, grouped by corpus and folder, client corpus filter
- `apps/web/messages/en.json` message catalogue and `t()` helper
- Tailwind v4 + `@corpus/ui/tokens.css` on listing chrome
- Debt **D17–D26** (corpus gates, POC a11y, site CI, Shiki, Pagefind, SEO residue, render-mode verification, interactive layer, `/en/license`, accounts/progress sync)

**Changed**
- Listing pages are static (`○` for `/en`, `/en/blog`, `/en/courses`, `/en/courses/react-render-cycle`)
- Site nav omits sign-in; search is a disabled "coming soon" control

**Removed**
- Session-1 spike route `/[locale]/concepts/[repo]/[...slug]` and `apps/web/lib/source.ts`

**Fixed**
- Nothing corpus-side. `verify-links` still fails on D13's 44 refs by design

### [2026-08-19] — cursor/poc-grid-placement-every-breakpoint-1a80 — article layout grid placement at every breakpoint

**Changed**
- `docs/design/article-layout-poc.html` — the desktop three-column template, the explicit
  child placement, and the `.view.nosb` collapse now sit inside `@media (width > 1000px)`;
  the mobile block is its exact complement, `@media (width <= 1000px)`
- `docs/design/article-layout-poc.html` — the ≤1000px block declares
  `grid-template-columns:minmax(0,1fr)` and places `.sb`, `main`, and `.rail` in column 1
- `prompts/session-3.md` — the two grid bullets in §3 annotated with the corrected state and
  the before/after track measurements

**Removed**
- `.view.nosb>.sb{visibility:visible;padding:1.1rem .85rem}` — the specificity patch inside
  the ≤1000px block, no longer reachable now that the collapse is breakpoint-scoped
- `.view>.sb{grid-column:1/-1}` from the ≤1000px block, replaced by placement covering all
  three children
- `.sb` from the ≤1000px `display:none` group, which the next rule overrode to
  `display:block` two lines later

**Fixed**
- `main` no longer lands in an implicit second column at ≤1000px. Measured in headless
  Chrome at an exact 1000px viewport: resolved tracks `4.8125px 995.188px` from a one-track
  template before, `1000px` after, with `main` in column 1
- A sidebar collapsed on desktop no longer carries the three-column template into mobile.
  Measured at an exact 390px viewport: `main` 334px beside a 56px empty rail track before,
  390px after
- Verified at 1440, 1000, and 390px, in both the default and collapsed states, plus the
  `.mobsb` drawer state; no horizontal overflow at any width

### [2026-08-19] — content/nestjs-v0.3.2 — debt-d6: nest-module skill seed, not reversal

**Changed**
- `.claude/skills/corpus-nest-module/SKILL.md` — ValidationPipe
  `forbidUnknownValues: false` is a seeded overridable default since `@nestjs/common` 9.3.2
- `AGENTS.md` and `.cursor/rules/60-skills.mdc` regenerated from that description

**Fixed**
- Skill description no longer indexes a `forbidUnknownValues` "reversal" into `AGENTS.md`

### [2026-08-19] — content/nestjs-v0.3.2 — debt-d6: rule files seed, not force

**Changed**
- `.cursor/rules/20-never-violate.mdc` and `.cursor/rules/50-api-nestjs.mdc` — ValidationPipe
  `forbidUnknownValues: false` is a seeded overridable default since `@nestjs/common` 9.3.2
- `AGENTS.md` regenerated from those rules

**Fixed**
- Canonical rule files no longer say Nest forces `forbidUnknownValues: false`

### [2026-08-19] — content/nestjs-v0.3.2 — debt-d6: close D6 on nestjs v0.3.2

**Added**
- Nothing in this repo. `nestjs-concepts@v0.3.2` corrects the ValidationPipe
  `forbidUnknownValues` claim in `dtos-and-class-validator`, `validationpipe-in-depth`,
  and `typescript-for-nest`

**Changed**
- `content/nestjs` gitlink `v0.3.1` → `v0.3.2`
- Census unchanged: **197 selected / 181 adapting**; catalog 181 articles, 289 edges,
  16 excluded, 44 unresolved
- Three `content_hash` changes: `validationpipe-in-depth`, `dtos-and-class-validator`,
  `typescript-for-nest`

**Removed**
- The D6 known-false headline from `.agents/summary.md`

**Fixed**
- Debt **D6** closed. The register now carries the corrected claim: class-validator
  has defaulted forbidUnknownValues to true since 0.14.0, unconditionally since 0.14.2;
  from @nestjs/common 9.3.2 ValidationPipe seeds it back to false as an overridable
  default, so an undecorated DTO that validate() rejects passes silently through the pipe

### [2026-08-18] — cursor/authoring-stage-not-publication-cac7 — `status` removed from the publication decision

**Added**
- `AuthoringStage` (`packages/content-schema/src/common.ts`) — a typed string carrying the
  corpus's raw `status` value through unmodified in meaning, never collapsed into a
  publication signal
- `normaliseAuthoringStage` (`packages/content-schema/src/adapters/shared.ts`) — replaces
  `normaliseStatus`; encodes object-shaped `status` (`{ drafted, reviewed }` /
  `{ upgraded, reviewed }`) as a stable sorted string instead of collapsing it to `'draft'`

**Changed**
- `Article.status: Status` renamed to `Article.authoringStage: AuthoringStage`
- `scripts/lib/link-report.mjs` — every ref that resolves to an adapted article is now an
  `edges` entry; the draft-target branch is removed
- `scripts/build-catalog.mjs`, `scripts/verify-links.mjs`, `scripts/verify-catalog.mjs` —
  removed all `SHOW_DRAFTS`/`NEXT_PUBLIC_SHOW_DRAFTS` gating; a path item may reference any
  adapted article
- `Catalog.draftTargets` / `LinkReport.draftTargets` — kept in the schema for consumer
  stability, now vestigial and always `[]`
- `.cursor/rules/30-content-pipeline.mdc` — "Draft gating" section replaced with
  "Publication gate — adaptation, not `status`"; link-bucket severity table updated;
  `NEXT_PUBLIC_SHOW_DRAFTS` repointed to a future UI-surfacing flag, not a render gate
- `.claude/skills/corpus-adapter/SKILL.md` — asymmetry example no longer cites the deleted
  `status` → `draft` collapse
- `AGENTS.md` — regenerated

**Removed**
- The `complete`/`published`/`final` → `'complete'` string mapping in `normaliseStatus`
  (function itself renamed, not just its body) — not extended with more synonyms, deleted
- Every `target.status === 'draft'` gate: in `buildLinkReport`, in `build-catalog.mjs`'s
  and `verify-catalog.mjs`'s path-item validation

**Fixed**
- All 181 adapting articles previously normalised to `status: 'draft'` (none of the four
  corpora ever writes `complete`/`published`/`final`), so `catalog.json` had 181 articles
  but **0 edges** — every one of the ~289 resolvable cross-article refs was bucketed as a
  non-rendering `draftTargets` warning instead of a live link. Rebuilt: **181 articles, 289
  edges, 0 paths, 16 excluded (unchanged, Debt D11/D15), 79 excludedTargets (unchanged), 0
  draftTargets, 44 unresolvedTargets (unchanged, Debt D13)**. `verify-links` and
  `verify-catalog` still fail on the same pre-existing 44/16, confirmed unchanged by this
  fix

### [2026-08-18] — cursor/catalog-diff-honest-snapshots-c14e — Catalog diff honest about missing snapshots

**Added**
- `Catalog.unresolvedTargets` — unresolved `related` refs travel in `catalog.json`
- Warning block in `catalog-diff.mjs` when a before or after snapshot is missing or
  unparseable

**Changed**
- `scripts/build-catalog.mjs` writes `catalog.json` when unresolved refs are present;
  `verify-links` remains the fatal gate
- `.github/workflows/content-watch.yml` no longer substitutes `{}` for a missing
  `catalog.json`
- `.cursor/rules/30-content-pipeline.mdc` — unresolved is FATAL for `verify-links`,
  recorded by `build-catalog`
- Debt D13 no longer blocks the catalog write

**Removed**
- Nothing

**Fixed**
- content-watch PR bodies that reported `0 → 0` and `_none_` for every list when
  `catalog.json` could not be built, which was indistinguishable from a genuine
  no-change. Simulated against `nestjs-concepts` `v0.3.0` → `v0.3.1`: **180 → 181**,
  `nestjs/dtos-and-class-validator` added

### [2026-08-18] — cursor/debt-d16-article-templates-b29a — Debt D16: templates omit `description`

**Added**
- Debt **D16** in `docs/DEBT.md` — `ARTICLE_TEMPLATE.md` and `RECIPE_TEMPLATE.md` in
  `nextjs-concepts` and `angular-concepts` omit the required `description` key, so
  articles authored from them reintroduce D5

**Changed**
- Highest ID issued D15 → D16
- D5 row now points at D16 for template recurrence
- `.agents/summary.md` — debt ID range D1–D16

**Removed**
- Nothing

**Fixed**
- Nothing in this repo. Confirmed `react-concepts@v0.5.0` and `nestjs-concepts@v0.3.1`
  have no article/recipe templates (no `docs/templates/`, no `ARTICLE_TEMPLATE.md` /
  `RECIPE_TEMPLATE.md`)

### [2026-08-17] — cursor/task-doc-refactor-7e3a — Documentation architecture refactor

**Added**
- `docs/DEBT.md` — debt register (D1–D15) extracted from `progress.md`
- Document authority table and SESSION-LOG/CHANGELOG split in `.cursor/rules/00-session-protocol.mdc`

**Changed**
- FIRST ACTION read list now includes `docs/DEBT.md`
- `progress.md` — debt table replaced by a pointer to `docs/DEBT.md`
- `.gitattributes` — `docs/DEBT.md` named as never-union-merge
- `.claude/skills/corpus-commit/SKILL.md` — preflight covers `docs/DEBT.md`
- `.agents/summary.md` — kept as the agent-facing snapshot; key fact for the new register
- CHANGELOG template in rule 00 is now Added/Changed/Removed/Fixed bullets only

**Removed**
- Debt table from `progress.md` (rows preserved in `docs/DEBT.md`)

### [2026-08-17] — cursor/promote-nestjs-v0.3.1-7497 — Promote `content/nestjs` to v0.3.1

**Added**
- Nothing in this repo. `nestjs-concepts@v0.3.1` recovers
  `validation/dtos-and-class-validator.md` (was `.ts`) and adds its `description`

**Changed**
- `content/nestjs` gitlink `v0.3.0` (`a9b2c8b`) → `v0.3.1` (`3c5c9e1`)
- Census 196 selected / 180 adapting → **197 / 181** (nestjs 19/19 → 20/20)
- `docs/audit/frontmatter-2026-08-16.md` regenerated: nestjs 20 selected, 20 adapted
- `docs/audit/unresolved-refs-2026-08-16.md` re-measured: 44 refs / 33 targets

**Fixed**
- Debt **D12** closed. Six inbound refs to `nestjs/dtos-and-class-validator` are
  draft-target warnings, not fatals. Catalog still cannot build (44 remaining
  unresolved refs in D13)

**Architecture decisions**
- One submodule per promotion PR. Remaining D13 failures are pre-existing plus one
  new outbound ref from the recovered article to `nestjs/nested-dto-not-validated`
- `content_hash` is the gray-matter body. The 19 previously adapting nestjs articles
  are unchanged; the recovered article's body hash matches the old `.ts` file, so
  there is no completion-invalidation question on existing rows

### [2026-08-17] — cursor/repair-union-merged-trackers-3709 — Split article counts by document

**Added**
- `.cursor/rules/00-session-protocol.mdc` — article counts are split by document and
  must not be synced: `roadmap.md` carries the order of magnitude, `progress.md` is
  the authority for exact counts
- `progress.md` — authority block with the measured census (196 selected, 180
  adapting, per-corpus 10/10, 58/73, 93/94, 19/19)
- `roadmap.md` §0.0 — dated entry recording the split as an approved scope change

**Changed**
- `.agents/summary.md` — opening census is now the measured 180 of 196 (nextjs
  10/10, react 58/73, angular 93/94, nestjs 19/19), not `~120`
- `roadmap.md` — living `~120` claims rewritten to "four corpora, ~200 articles",
  with a pointer to `progress.md` for exact counts
- `AGENTS.md` — regenerated

**Fixed**
- The remaining `~120` in `.agents/summary.md`, left as a known issue by the
  union-merge repair because `roadmap.md` still said the same number

**Architecture decisions**
- Roadmap carries orders of magnitude; progress.md carries measurements. They are
  supposed to disagree in precision, and a later session must not sync them

### [2026-08-17] — cursor/repair-union-merged-trackers-3709 — Repair the union-merged trackers

**Added**
- `.cursor/rules/00-session-protocol.mdc` — debt IDs are append-only and never reused; the
  earliest claim on a number keeps it and the later claimant is renumbered
- `.cursor/rules/00-session-protocol.mdc` — new section "Append-only docs vs in-place
  docs", forbidding `merge=union` on `progress.md` and `.agents/summary.md` and requiring
  that a conflict survivor be verified against the repository rather than trusted
- `.gitattributes` — comments recording why only the two append-only docs are listed
- `progress.md` — Debt **D14** (the link report was all-or-nothing; closed by follow-up d,
  renumbered out of its D12 collision) and Debt **D15** (`angular`'s
  `docs/recipes/elements/widget-deployment.md` is a byte-identical duplicate of
  `docs/concepts/tooling/cdk-coercion.md`, previously tracked only inside a D5 row)
- `progress.md` — an append-only-IDs note and a "Highest ID issued: D15" line above the
  Debt table
- `.agents/summary.md` and `progress.md` — a header on each stating it is edited in place
  and never union-merged

**Changed**
- `.agents/summary.md` — five `Last updated` headers, five `build-catalog` state
  paragraphs, four `Content submodules wired` bullets, five `Debt D5` key facts and four
  `Planned next steps` item-1 paragraphs each collapsed to a single re-measured entry
- `progress.md` — Phase 1 items 7 (×5), 7b (×5) and 16 (×4), and Debt rows D5 (×4) and
  D6 (×2), each collapsed to one
- `progress.md` — Debt **D12** now means only the earliest claim on that number, the
  `nestjs-concepts` `.ts`-extension article; the later link-report claim moved to D14
- Every surviving claim re-measured against the pinned corpora rather than inherited:
  180 of 196 articles adapt (nextjs 10/10, react 58/73, angular 93/94, nestjs 19/19),
  16 fail, and `verify-links` fails on 49 refs across 34 distinct targets
- `AGENTS.md` — regenerated

**Fixed**
- Debt **D12** claimed `nestjs-concepts` `validation/dtos-and-class-validator.md` was
  "absent from disk". The file is present as `validation/dtos-and-class-validator.**ts**`
  with full frontmatter and an H1; only the extension keeps it out of file selection.
  `docs/audit/unresolved-refs-2026-08-16.md` had this right
- Debt **D13**'s distinct-target count corrected from 23 to the measured 34
- Debt **D4** no longer lists `reactjs`, `auth`, `authz` or `websec` as corpora, and
  Debt **D7** no longer calls the React repo `reactjs-concepts` — both settled by the
  session-1 follow-up

**Architecture decisions**
- A doc's merge driver follows its write pattern, not its importance: append-only docs get
  `merge=union`, in-place docs get hand resolution and must never be listed
- A conflict survivor is a candidate, not evidence. Verify it against the repository —
  run the gate, read the pin, count the files — before keeping it
- Debt IDs are identifiers, not slots. Reusing one silently redirects every existing
  cross-reference to whichever row the reader finds first

### [2026-08-16] — cursor/promote-nextjs-v0.3.0-6413 — Promote `content/nextjs` to v0.3.0

**Added**
- Nothing in this repo. The ten `description` deks live in `nextjs-concepts@v0.3.0`.

**Changed**
- `content/nextjs` gitlink `v0.2.0` (`d9ae31d`) → `v0.3.0` (`ad28950`)
- Debt D5 is closed for `nextjs-concepts` (10/10 selected articles now adapt). It
  remains open on `react` (73), `angular` (94), and `nestjs` (19)

**Fixed**
- `verify-frontmatter` no longer fails on any `content/nextjs` article. The other
  three corpora still fail, as expected, until they cut equivalent tags

**Architecture decisions**
- One submodule per promotion PR, even when the remaining D5 work is the same pass
  in the other three repos
- `content_hash` is sha256 of the body after frontmatter, so a dek-only tag does
  not change hashes; invalidation stays a human decision either way
### [2026-08-16] — cursor/promote-react-v0.5.0-a7bb — Promote `content/react` to `v0.5.0`

**Added**
- Nothing.

**Changed**
- `content/react` gitlink `react-concepts@v0.4.0` → `@v0.5.0` (`daf5b56`). 58 articles
  gained a `description` frontmatter field; bodies are unchanged
- React adapter `excludeDirs: ['prompts']` — `v0.5.0` added
  `prompts/description-pass.md`, which is an authoring prompt, not an article

**Fixed**
- Nothing. `verify-frontmatter` / `build-catalog` / `verify-links` still fail: 15
  `react` articles have no title (Debt D11) and the other three corpora still lack
  `description` (Debt D5)

**Architecture decisions**
- `content_hash` is sha256 of the body, so a description-only frontmatter pass does
  not change any hash and must not invalidate reader completion
- Root-scan corpora exclude `prompts/` when that directory appears — same rule
  `nestjs` already had; `react` joined it at `v0.5.0`

### [2026-08-16] — cursor/content-angular-v0.3.0-55e8 — Promote `content/angular` to v0.3.0

**Added**
- Nothing in this repo. The upstream tag adds `description` frontmatter to 93 of 94
  selected angular articles and a corpus-side `prompts/description-pass.md`.

**Changed**
- `content/angular` gitlink `v0.2.0` → `v0.3.0`
- `docs/audit/frontmatter-2026-08-16.md` — angular now 93 adapted / 1 failed
  (`docs/recipes/elements/widget-deployment.md` still missing `description`)

**Fixed**
- Nothing in this repo. Angular Debt D5 shrinks from 94 selected misses to 1; the
  leftover is a corpus miss and is not patched here.

**Architecture decisions**
- One submodule per promotion PR. Catalog still cannot build until the other three
  corpora run their description pass and angular tags a follow-up for
  `widget-deployment.md`.
- `contentHash` is the gray-matter body. This tag did not change any body, so no
  hash changed and there is no completion-invalidation question to answer.
### [2026-08-16] — cursor/promote-nestjs-v030-6ac3 — pin nestjs-concepts to v0.3.0

**Added**
- Nothing in this repo. `nestjs-concepts@v0.3.0` adds a `description` dek to all 19
  selected articles

**Changed**
- `content/nestjs` gitlink `v0.2.0` → `v0.3.0` (`1493917` → `a9b2c8b`)
- `docs/audit/frontmatter-2026-08-16.md` regenerated: nestjs 19 selected, 19 adapted,
  0 failures
- Debt D5 no longer covers nestjs; 162 missing-`description` failures remain in
  nextjs/react/angular

**Fixed**
- Nestjs articles now adapt. Catalog still cannot build (D5/D11 in the other three
  corpora)

**Architecture decisions**
- `content_hash` is the article body, not the raw file, so a frontmatter-only dek
  pass does not change hashes and must not flag `lesson_progress` for invalidation
- Promotion PRs stay one submodule; remaining gate failures on other corpora are
  pre-existing and not a reason to bump those pins in the same PR
### [2026-08-16] — cursor/catalog-emit-with-exclusions-e8aa — The link report is classified four ways

**Added**
- `LinkReport.excludedTargets` — a `related` ref whose target is a real corpus file that
  did not adapt, so it is already in `catalog.failures`. **Warns**; 15 excluded articles
  were producing 79 of these as hard failures
- `Catalog.excludedTargets` and `Catalog.draftTargets` — refs to a real article this build
  has no route for, carried in the artifact so a renderer emits plain text rather than a
  link that 404s
- `LinkEdge` and `ExcludedTarget` schemas; `ExcludedTarget` carries the excluded file's
  `sourcePath` so an entry joins to the `CatalogFailure` that explains it
- Two structural checks in `verify-catalog`: every `edges` entry resolves to an article the
  catalog contains, and every `excludedTargets` entry names a file in `failures`
- `docs/audit/unresolved-refs-2026-08-16.md` — all 49 unresolved refs individually, with
  the fix each needs

**Changed**
- `LinkReport.resolved` -> `edges`, `unresolved` -> `unresolvedTargets`
- `draftTargets` warns and is recorded instead of failing the build. A ref to a draft is a
  correct ref with no route in this build; it goes live when the article is marked complete
- `unresolvedTargets` — target exists in no corpus at all — is the only fatal link bucket
- `verify-links` no longer fails when a file fails to adapt. It exited before ever
  classifying anything, and `verify-frontmatter` owns that failure
- `.cursor/rules/30-content-pipeline.mdc` — the "Cross-repo links" section carries the
  four-way severity table, so the rule and the code agree
- `prompts/session-3.md` — Track A step 4's link expectation is `unresolvedTargets`, with
  Debt D13 named as the known exception

**Fixed**
- Nothing in behaviour that was a defect; the 49 refs still fail, by design

**Architecture decisions**
- Fail once on the root cause, never on its symptoms. An excluded target is an adaptation
  failure seen from the far end of a link, already reported by path and reason
- A link to a page that 404s is a rendering bug, so draft and excluded targets are recorded
  for the renderer rather than treated as build failures
- An excluded target is matched by `repo` + filename slug. `CatalogFailure` still carries
  no uid; the slug is what a ref must resolve to anyway, and the key only downgrades a
  fatal to a warning

### [2026-08-16] — cursor/catalog-emit-with-exclusions-e8aa — The catalog emits with exclusions

**Added**
- `CatalogFailure` in `packages/content-schema/src/catalog.ts` — `repo`, `sourcePath`,
  `reason` — and a required `failures` array on `Catalog`, so the files a build left out
  travel inside the artifact rather than only in a build log
- `verify-catalog` check: a non-empty `catalog.failures` exits 1, printed grouped by
  reason

**Changed**
- `scripts/build-catalog.mjs` no longer refuses to write when a file fails to adapt. The
  file is excluded from `articles`, recorded in `failures`, and the build continues —
  the same treatment a draft already gets. Zero articles adapting, an unresolved
  `related` ref, a draft target outside `SHOW_DRAFTS`, and a path item pointing at a
  missing or draft article all remain fatal
- `build-catalog`'s summary line reports the excluded count alongside articles, edges,
  and paths
- `prompts/session-3.md` — Track A step 4 no longer implies `build:catalog`'s exit code
  is the adaptation verdict

**Fixed**
- Nothing. `verify-frontmatter` is untouched and still fails on all 196 selected files

**Architecture decisions**
- A failed article is not categorically different from a draft one: both are articles
  that are not ready, and the pipeline already excludes drafts without failing. Sixteen
  authoring gaps do not get to hold ~180 finished articles hostage
- The gate moves rather than disappearing. `verify-frontmatter` fails on the source
  content; `verify-catalog` fails on the artifact's `failures`. CI is exactly as red as
  before, and the artifact now exists to build routes against
- `schema` stays at `1`: no catalog of that shape has ever been produced, since
  `build-catalog` has never successfully written the file. Bump it when a real consumer
  exists
- `failures` is required rather than optional, so "no failures" can never mean "old
  builder"

### [2026-08-16] — cursor/fix-derive-title-mdast-15ee — `packages/content-schema` typechecks its tests

**Added**
- `@types/node` `^22.19.0` as a devDependency of `packages/content-schema`, resolving to
  the `22.20.1` copy `apps/web` already pulls in
- `packages/content-schema/README.md` — "Tests and typechecking", recording why the
  `@types/node` major is 22

**Changed**
- `packages/content-schema/tsconfig.json` — `include` covers `test/**/*.ts`, and
  `types: ["node"]` declares the test files' Node globals instead of relying on whatever
  `@types` package is reachable by hoisting. `pnpm typecheck` now type-verifies the tests
  that `tsx` had only been type-stripping

**Fixed**
- Nothing.

**Architecture decisions**
- A package shared by two runtimes types against the **lowest** of its consumers. `web` is
  Node 22 and `api` is Node 24, so `^22` keeps the type set a subset of both; `^24` would
  let a Node-24-only API pass typecheck here and fail at run time on web. Confirmed
  against the global `URLPattern`, which compiles on `@types/node` 24 and does not on 22

### [2026-08-16] — cursor/fix-derive-title-mdast-15ee — Session 2 follow-up: `deriveTitle` reads headings, not lines

**Added**
- `parseArticleBody()` and `findTitleHeading()` in
  `packages/content-schema/src/sections.ts` — the single body parse, and the top-level
  depth-1 heading lookup that replaces the regex
- `packages/content-schema/test/derive-title.test.ts` — the repo's first tests, run on
  `node:test` through `tsx` (no new dependency; CI already runs `pnpm test`). Assertions
  are against real corpus files wherever the corpus has an instance of the case
- `AdapterInput.tree` — the caller's already-parsed body, so a catalog build parses each
  file once rather than once for sections and again for the title

**Changed**
- `deriveTitle()` locates the H1 by walking the parsed body instead of matching
  `/^#\s+(.+)$/m` against the raw text. Setext H1 (`Title` over `===`) now derives
  correctly; a `# ` line inside a fenced or indented code block, or inside a blockquote,
  no longer does
- Derived titles are the heading's plain-text rendering, so six titles carrying inline
  code lose their backticks (`` `mutateAsync` crashes the page `` -> `mutateAsync
  crashes the page`). `Article.title` is a plain string consumed by `<title>`, OG tags,
  and the sidebar; markdown syntax in it was a leak, not a feature
- `scripts/lib/adapt-all.mjs` parses once and hands the same tree to `extractSections`
  and the adapter
- `docs/audit/frontmatter-2026-08-16.md` — regenerated
- Debt **D11** corrected from 14 articles to **15**

**Fixed**
- `react/rendering/react-compiler-deep-dive.md` was being titled `TypeScript projects
  also need the Babel core types:` — a comment line inside an `npm i -D` fence. The
  article has no H1 at all and now fails loudly, as the other fourteen already did

**Architecture decisions**
- Only the tree's top-level children are candidates for the title. A heading nested in a
  blockquote or a list item is a quotation, not this document's title
- `extractSections()` keeps descending the whole tree, because GitHub does emit anchors
  for nested headings — the two walks are deliberately asymmetric
- `AdapterInput.tree` is optional: a caller that extracts no sections has no second parse
  to share, so requiring it would only force a parse that nothing else needs

### [2026-08-16] — cursor/session-2-adapters-catalog-c932 — Adapters against reality, catalog builder, gates

**Added**
- `docs/audit/frontmatter-2026-08-16.md` — the session-2 frontmatter audit, run for real
  against all four mounted corpora: file selection, distinct frontmatter keys and values,
  and every adaptation failure grouped by reason
- `packages/content-schema/src/sections.ts` — `extractSections()`, parsing the article
  body as an mdast tree and slugifying `##`/`###` headings with GitHub's own algorithm,
  verified against real anchors already depended upon in `react-concepts`
  (`error-boundaries.md`)
- `scripts/audit-frontmatter.mjs`, `scripts/lib/{corpus-fs,adapt-all,link-report,curation}.mjs`
- `scripts/verify-frontmatter.mjs`, `scripts/verify-links.mjs`, `scripts/verify-catalog.mjs`
- New Debt **D11**: 14 `react-concepts` articles have neither a frontmatter `title` nor a
  body `# ` heading — a genuine corpus gap, reported rather than papered over

**Changed**
- `packages/content-schema` adapters corrected against the real files: `RepoAdapter`
  replaces the `include` glob array with `conceptsRoot` / `recipesRoot` / `excludeDirs`,
  since `react` and `nestjs` have no `docs/` wrapper and the old globs matched **zero**
  files in either; `title` is now derived from the body's H1 when frontmatter omits it
  (true for every article in all four corpora); `status` accepts the object shape
  (`{ drafted, reviewed }` / `{ upgraded, reviewed }`) observed in `react`/`nestjs`/some
  `angular` recipes, collapsing unconditionally to `draft`
- `scripts/build-catalog.mjs` replaced the session-1 stub with a real implementation:
  adapt every selected file, resolve every `related` ref, load `curation/paths/*.yaml`,
  emit `catalog.json`. Refuses to write on any adaptation failure or unresolved/draft ref
- `scripts/verify-submodules.mjs` now fails unless `.gitmodules` lists exactly the four
  expected mount paths, not merely "at least one, all clean"
- `docs/adr/0002` cross-references, `progress.md` Debt table (D2/D3 marked closed)

**Fixed**
- Nothing new; `verify-frontmatter` / `build-catalog` / `verify-links` correctly continue
  to fail on the pre-existing Debt D5 (missing `description` everywhere) — expected, not a
  regression

**Architecture decisions**
- `conceptsRoot: string | null` (root-scan mode) chosen over hand-enumerating each
  corpus's category directories, so a new concept category is discovered automatically
  rather than silently dropped
- Object-shaped `status` collapses to `draft` unconditionally rather than inferring
  `reviewed: true` means "complete" — an undocumented field shape is not a value to guess
  meaning from
- `index.md` is excluded from article discovery by filename, uniformly across corpora
- `build-catalog.mjs` and the three verify gates share their adaptation and link-resolution
  logic (`adapt-all.mjs`, `link-report.mjs`) so the artifact and its gates cannot drift

### [2026-08-16] — main — Schema corrected against the session 1 audit

**Added**
- `DemoSourceId` for `auth`, `authz`, `websec` — runnable demo apps, not corpora
- `ArticleRef.resolution` — `article` fails when unresolved, `planned` and `demo` warn
- `LinkReport.demoTargets`
- `docs/adr/0002-demo-labs.md` — proposed: deploy and iframe, do not submodule
- Debt D9 (demo labs have no home) and D10 (deliberately vulnerable app must not share the
  cookie domain)

**Changed**
- `RepoId` reduced from seven to **four**: `nextjs`, `react`, `angular`, `nestjs`
- React remote corrected to `react-concepts`; mount renamed `reactjs` -> `react`
- Default branches confirmed: `main` for `nextjs`/`nestjs`, `master` for `react`/`angular`
- `prompts/session-2.md` rewritten; `prompts/session-1.md` annotated as executed

**Removed**
- Adapters for `auth`, `authz`, `websec`
- `ArticleRef.planned` (superseded by `resolution`)

**Fixed**
- Debt D2, D3, D4 closed by the audit

**Architecture decisions**
- The fumadocs × Next 16.3 × Cache Components spike passed all four criteria; roadmap §6.1
  is settled and the fallback pipeline is not needed
- A repo whose name ends in `-concepts` is not evidence that it contains a corpus

### [2026-08-15] — cursor/session-1-scaffold-e487 — Monorepo scaffold and fumadocs spike

**Added**
- pnpm workspaces + Turborepo (`pnpm-workspace.yaml`, `turbo.json`, root `package.json`)
- Shared `tooling/tsconfig` (base/next/nest, all strict) and `tooling/eslint` flat config
- Workspace stubs: `apps/web`, `apps/api`, `packages/mdx-components`, `packages/api-client`
- Seven content submodules pinned to tags, `submodule.<name>.ignore = none`
- `scripts/verify-submodules.mjs` (CI + pre-commit), `scripts/sync-content.mjs`,
  `scripts/build-catalog.mjs` (refuses an empty article list), git-hook installer
- Next.js 16.3 app with Cache Components ON, fumadocs-core + fumadocs-mdx (no fumadocs-ui)
- Spike route `/en/concepts/nextjs/concepts/caching/cache-components-model`

**Changed**
- `REPO_DEFAULT_BRANCH` corrected from observed remotes
- `REPO_ORIGINS.reactjs` -> `EverythingFromDayOne/react-concepts`
- fumadocs-mdx recorded as 15.x (core remains 16.x)

**Fixed**
- Unused `RepoId` import in `packages/content-schema/src/adapters/shared.ts` (lint)

**Architecture decisions**
- Keep fumadocs; spike passed all four exit criteria
- `agentRules: false` so Next 16.3 does not clobber repo-generated AGENTS.md
- Fumadocs default `title` frontmatter is optional here — corpus titles are H1s

### [2026-08-15] — main — Cursor skill reachability and third-party skill policy

**Added**
- `.cursor/rules/60-skills.mdc` — generated, always-applied skill index so Cursor can reach
  `.claude/skills/`, which it does not load natively
- Rules governing third-party skills: project skills win on conflict, no stack-mismatched
  bundles, no Angular skills here, no blind `npx skills update`

**Changed**
- `scripts/build-agent-docs.mjs` now emits three files and excludes its own output when
  reading source rules
- Hand-maintained skills table removed from `00-session-protocol.mdc` — it would have gone
  stale on the first new skill

**Architecture decisions**
- One source of truth for skills; the Cursor rule is a projection, not a copy
- Conflicts between community and project skills are reported, never silently resolved

### [2026-08-15] — main — Agent skills

**Added**
- Eight skills in `.claude/skills/`: `corpus-next-caching` (+ a `references/` file),
  `corpus-content-boundary`, `corpus-adapter`, `corpus-nest-module`,
  `corpus-mdx-component`, `corpus-commit`, `corpus-promote-content`, `corpus-session`
- Skill index generated into `AGENTS.md` so agents without native skill support can find them
- Frontmatter validation in `build-agent-docs.mjs`: name matches directory, lowercase-
  hyphenated, under 64 chars; description under 1024 chars and states a trigger

**Changed**
- `.cursor/rules/00-session-protocol.mdc` — skills table plus the rules-vs-skills split
- `.github/workflows/ci.yml` — the agent-docs gate now covers skill frontmatter

**Removed**
- `.agents/skills/` — migrated into `.claude/skills/`; two formats in two places was the
  drift the generator exists to prevent

**Architecture decisions**
- A skill earns its place only where Claude's default behaviour would be wrong for this
  project; generic framework knowledge is not a skill
- Rules are always-on boundaries, skills are task-triggered procedures, and a skill
  references a rule rather than restating it

### [2026-08-15] — main — Renamed to corpus-web

**Changed**
- Repo name `concepts-web` -> `corpus-web` across all documentation and rules
- npm scope `@concepts/` -> `@corpus/`

**Architecture decisions**
- `fullstack-tech` was considered and rejected — naming a repo after its stack rather
  than its domain ages badly and carries no information about what the repo does
- The rename was token-exact; `concepts` was preserved wherever it means a corpus repo
  name, the `docs/concepts/` convention, or the `ArticleKind` value

### [2026-08-15] — main — Corpus count corrected to seven

**Added**
- `content/auth` -> `demo-auth-concepts` and `content/authz` -> `demo-authz-concepts` as
  corpora, with adapter specs, aliases, and a `REPO_LABELS` display map
- Per-repo confidence tiers on the adapter specs — the five framework corpora share a
  documented schema; the two new ones have no convention on record
- `prompts/session-1.md` reporting step for the shape of the two unknown corpora

**Changed**
- Every corpus count from five to seven across roadmap, rules, prompts, and schema docs
- `prompts/session-2.md` audits `auth`/`authz` first, with a stop-and-report instruction if
  they are not markdown corpora
- The description pass is deferred on `auth`/`authz` until their convention is known

**Fixed**
- Nothing.

**Architecture decisions**
- Mount points are `auth` and `authz`, not `demo-auth`/`demo-authz`; the `demo-` prefix
  describes the repo's origin, not its content. `REPO_LABELS` carries the distinction in
  chrome so it never rests on a one-character URL difference
- `demo-attacked-web` is not a corpus and is not submoduled — **inferred from the name**
- Seven corpora strengthen §4.0: shared-schema cost scales with corpus count

### [2026-08-15] — main — Content schema, design direction, CI, ADR-0001

**Added**
- `packages/content-schema` — the shared contract: per-repo frontmatter adapters, the
  normalised `Article`, quiz/deck sidecar schemas, path and override curation schemas, and
  the `catalog.json` shape. Typechecks clean against zod 4.4.3; adapters smoke-tested
- `packages/ui/DESIGN.md` and `src/tokens.css` — the "Instrument" direction
- `.github/workflows/ci.yml` — guards, content, build, and quality jobs
- `docs/adr/` — template and ADR-0001 on Angular demo integration
- `prompts/session-2.md` and `prompts/corpus-description-pass.md`

**Changed**
- `content/` described as gitlinks rather than gitignored content, across roadmap, rules,
  session-1, and summary

**Fixed**
- **Session 0 error:** `.gitignore` was claimed to make corpus edits structurally
  impossible. It cannot — a parent repo tracks a submodule as a commit SHA, not as files,
  so the entry is inert. Replaced with `verify-submodules.mjs` in CI and as a `pre-commit`
  hook, plus `submodule.<name>.ignore = none` in `.gitmodules`

**Architecture decisions**
- Adapters are built from specs by a factory; the corpora differ in field names, not
  meaning, so five hand-written adapters would be five copies of one function
- Unknown `status` collapses to `draft`; unknown `difficulty` throws — over-hiding is
  recoverable, mis-categorising is silent
- `description` is required with no derived fallback; a missing dek fails the build
- Amber `signal` is scoped to provenance and read position only, never a general accent
- ADR-0001 proposes iframe embedding over cross-framework Module Federation

### [2026-08-15] — main — Personal-content boundary

**Added**
- `.cursor/rules/20-never-violate.mdc` § "Personal content boundary" — no About/bio/photo/
  employer/client/contact content, no author bylines, no `Person` JSON-LD, no real names in
  fixture data. Licence attribution is the sole carve-out.
- `roadmap.md` §15.1 — spec for what `/en` contains now that it is not a portfolio

**Changed**
- URL shape locale-namespaced throughout `roadmap.md` §1 (`/en/concepts/...`)
- `apps/web/app/(marketing)/` renamed `(landing)/`
- Phase 1 item 13 changed from "migrate the resume HTML" to "corpus landing + licence page"
- `.agents/summary.md` — dropped the portfolio open decision, added the boundary to key facts

**Fixed**
- Nothing.

**Architecture decisions**
- The site is a corpus delivery surface, not a personal site; the suite-wide "no author
  footers or credits" rule now extends to the delivery layer
- CC BY 4.0 attribution is legally required and therefore exempt from the boundary rule

### [2026-08-15] — main — Repo scaffold and portable agent rules

**Added**
- Six Cursor rule files under `.cursor/rules/` — three always-applied (session protocol,
  stack facts, hard constraints) and three glob-scoped (content pipeline, web, api)
- `scripts/build-agent-docs.mjs` — generates `AGENTS.md` and `CLAUDE.md` from the rule
  files, with a `--check` mode wired to CI as a drift gate
- `AGENTS.md` and `CLAUDE.md` (generated)
- `.agents/summary.md`, `.agents/SESSION-LOG.md`, `.agents/skills/`
- `roadmap.md` — approved architecture and phase plan
- `progress.md` — phase tracker

**Changed**
- Nothing. First commit.

**Fixed**
- Nothing. First commit.

**Architecture decisions**
- Single monorepo (`corpus-web`) rather than split frontend/backend repos, because
  `content-schema` and `api-client` are shared contracts and cross-repo publishing would
  tax every schema change
- `.cursor/rules/*.mdc` is the single source of truth for agent context; `AGENTS.md` and
  `CLAUDE.md` are generated projections, enforced by a CI drift gate
- Content stays canonical in five standalone corpus repos, consumed here as git
  submodules pinned to tags; `content/` is never edited from this repo
- English-only content ships, but all routes are namespaced `/[locale]/` and all
  user-visible strings go through a message catalogue from day one
