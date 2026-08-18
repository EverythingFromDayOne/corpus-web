# corpus-web — workspace summary

> Living document. Read this first, every session. Update it with **targeted edits only**
> when something in it becomes false. Never rewrite wholesale.
>
> This file is edited **in place**. It is deliberately absent from `.gitattributes`, so it
> is never union-merged — see `.cursor/rules/00-session-protocol.mdc`.
>
> Last updated: 2026-08-18 (`status` removed from the publication decision —
> renamed `authoringStage`, draft gating deleted, catalog now writes 289 edges)

---

## What this repo is

The delivery surface for the `EverythingFromDayOne` concepts suite. It renders **181 of
197 selected articles** (nextjs 10/10, react 58/73, angular 93/94, nestjs 20/20) from
four standalone corpus repos into one site at `nxhhuy.tech`, and adds the retention
layer (progress, quizzes, spaced repetition) that standalone markdown cannot provide.
Exact counts live here and in `progress.md`; `roadmap.md` carries the order of
magnitude only.

**It is not a place where content is authored.** The four corpus repos stay canonical.

**It is not a personal site.** Despite the domain, there is no About page, bio, photo,
employer, client, or contact content anywhere. `/en` is a corpus landing page. This is a
hard rule — see `.cursor/rules/20-never-violate.mdc` § "Personal content boundary".

Reference for layout structure only: `sydexa.com`. Structure is a convention; visual
identity, palette, illustrations, and copy are deliberately our own.

---

## Architecture in one paragraph

Content is build-time. Next.js 16.3 with Cache Components owns rendering; Postgres never
sits in the read path for an article body. NestJS 11 owns everything user-specific — auth,
progress, quiz scoring, flashcard scheduling, entitlements. The test for any endpoint: if
the API were down, would reading break? If yes, it is in the wrong service. An API outage
degrades the site to a read-only corpus, never to a blank page.

---

## Stack

See `.cursor/rules/10-stack-and-topology.mdc` — that file is authoritative for versions.
Do not duplicate the version table here.

---

## Current state

**Phase 0 — Spike & skeleton. Session 1 complete (scaffold + spike passed).**

- [x] Agent rules, generator, and CI drift gate
- [x] Eight agent skills in `.claude/skills/`, indexed into `AGENTS.md`, frontmatter
      validated by the same CI gate
- [x] `roadmap.md` approved
- [x] `packages/content-schema` authored — typechecks clean against zod 4.4.3. **Adapters
      now run for real against all four mounted corpora (session 2)** — see
      `docs/audit/frontmatter-2026-08-16.md`. `auth` and `authz` are not markdown corpora
      (session 1); no adapter exists for either.
- [x] Section extraction (`extractSections()`) — mdast-based, GitHub-slug anchors verified
      against real `react-concepts` cross-references (session 2)
- [x] Title derivation is mdast-based too (session 2 follow-up) — the session-2 regex was
      matching `# ` lines inside code fences. `packages/content-schema/test/` holds the
      repo's first tests, on `node:test` via `tsx`, run against real corpus files
- [x] `scripts/build-catalog.mjs` real implementation + `verify-frontmatter` /
      `verify-links` / `verify-catalog` gates (session 2). **All four corpora have now run
      the description pass and 181 of the 197 selected articles adapt** — `nextjs` 10/10,
      `react` 58/73, `angular` 93/94, `nestjs` 20/20. The 16 that do not are the 15
      untitled `react` articles (Debt D11) and `angular`'s duplicate
      `docs/recipes/elements/widget-deployment.md` (Debt D15). Since follow-up c the
      catalog emits with exclusions rather than all-or-nothing, so those 16 no longer hold
      the artifact hostage; **`build-catalog` now writes `catalog.json` with the 44
      unresolved refs recorded (Debt D13). `verify-links` is the gate that still fails
      on them.**
- [x] `packages/ui/DESIGN.md` + `tokens.css` — the "Instrument" direction
- [x] `.github/workflows/ci.yml`
- [x] `docs/adr/0001` — Angular demos integration (proposed, pending Q7)
- [x] `prompts/session-2.md`, `prompts/corpus-description-pass.md`
- [x] Monorepo scaffold (pnpm workspaces + Turborepo)
- [x] **fumadocs-mdx × Next 16.3 × Cache Components spike** — all four exit criteria passed
      against `cache-components-model`
- [x] Content submodules wired, four mounts, pinned to tags — `nextjs` `v0.3.0`,
      `react` `v0.5.0`, `angular` `v0.3.0`, `nestjs` `v0.3.1`
- [ ] Design tokens applied
- [ ] `nxhhuy.tech` DNS cutover

Application code now exists: `apps/web` renders one real nextjs-concepts article;
`apps/api` is an empty Nest bootstrap.

---

## Key facts that are easy to get wrong
- There are **four** corpora: `nextjs`, `react`, `angular`, `nestjs`. The React repo is
  `react-concepts`, mounted at `content/react`.
- `auth`, `authz`, `websec` are **runnable demo apps, not corpora** — no `docs/`, no
  frontmatter, no adapters, not submodules. Session 1 audit. See ADR-0002.
- Default branches: `main` for `nextjs` and `nestjs`, `master` for `react` and `angular`.
- There are **exactly four** mounted submodules — `nextjs`, `react`, `angular`, `nestjs`.
  `auth`, `authz`, `websec` were mounted in PR #1 by mistake and removed before merge
  (session 1 follow-up); `verify-submodules.mjs` now fails if the count or the mount set
  ever drifts from these four (session 2).
- The React GitHub repo is `EverythingFromDayOne/react-concepts`, not `reactjs-concepts`.
  Mount point is `content/react` (not `content/reactjs`).
- `fumadocs-core` is 16.x; `fumadocs-mdx` is 15.x. They version independently.
- `content/` holds **submodules (gitlinks)**. `.gitignore` does NOT and cannot protect
  them — the parent tracks a commit SHA, not files. The guard is `verify-submodules.mjs`
  in CI and as a `pre-commit` hook, plus `submodule.<name>.ignore = none` in `.gitmodules`.
- `article_id` is the filename slug, never a sequence number. Renumbering never touches
  article files.
- Cross-repo links WARN in the corpus repos and **hard-fail** here when they resolve to
  nothing, because here they can actually resolve. A ref to a real-but-excluded or draft
  article warns instead — see the four-way classification below.
- Node 22 on `apps/web`, Node 24 on `apps/api`. Deliberate. Follows each corpus baseline.
  A package shared by both therefore types against the **lower** one:
  `packages/content-schema` pins `@types/node` to `^22`, so anything that typechecks there
  runs on either runtime. `^24` would let a Node-24-only API pass and fail on web.
- `'use cache: private'` gives zero server-side caching — request memoization only.
- Prerendered shell content cannot be verified with `curl` or view-source. Inspect
  `.next/server/app/<route>.html`.
- `next dev` under-reports prerender severity: some failures show HTTP 200 in dev and are
  fatal at build.
- Nest forces `forbidUnknownValues: false` on `ValidationPipe`, reversing the standalone
  `class-validator` default.
- `AngularDemos` is a **separate repo** at `ng21.` / `ng15.nxhhuy.tech`. Not a submodule.
  Integration approach is an open decision — see "Open decisions" below.
- No personal or identifying content ships. The only carve-out is licence attribution
  (`LICENSE`, `/en/license`), because CC BY 4.0 requires naming a copyright holder.
- An empty About page is not an oversight. Do not fill it.
- **`react` and `nestjs` have no `docs/` wrapper.** Concept categories are top-level
  directories in the repo root (`architecture/`, `foundations/`, ...); recipes live at
  top-level `recipes/<category>/`. `nextjs` and `angular` do wrap everything in
  `docs/concepts` and `docs/recipes`. The adapter models this as `conceptsRoot: string |
  null` (`null` = scan the repo root) rather than a fixed glob, so a new category directory
  is picked up automatically (session 2 audit). `react` excludes `prompts/` (added in
  `v0.5.0`); `nestjs` excludes `demos/`, `prompts/`, and `scripts/`.
- **No article in any of the four corpora carries a `title` frontmatter key.** Every one
  relies on the body's H1 — `deriveTitle()` falls back to it. 15 `react-concepts` articles
  have neither (Debt D11); that is a genuine corpus gap, not an adapter bug.
- **Never locate a heading with a regex over raw markdown.** A `# ` line inside a fenced
  or indented code block, or inside a blockquote, is not a heading. The corpus contains
  the fenced case in real articles; the other two only under `prompts/`, which no adapter
  selects. Both `deriveTitle()` and `extractSections()` walk an mdast tree, and
  `parseArticleBody()` produces the one tree they share per file (session 2 follow-up).
  Title derivation takes only the tree's top-level depth-1 heading; section extraction
  descends the whole tree, because GitHub anchors nested headings. Do not unify them.
- **`status` is a plain string in `nextjs`/`angular` but an object in `react`/`nestjs` and
  some `angular` recipes** (`{ drafted, reviewed }` / `{ upgraded, reviewed }`). **It is no
  longer a publication gate.** `Article.authoringStage` (renamed from `status` 2026-08-18)
  carries the raw value through as a typed string via `normaliseAuthoringStage()` — strings
  pass through trimmed, object shapes encode as a stable sorted `key:value` string. The old
  `normaliseStatus()` collapsed every value that was not `complete`/`published`/`final` to
  `'draft'`, and since no corpus ever writes those three strings, **all 181 adapting
  articles normalised to `draft`**, which was hiding 100% of the corpus's cross-links
  behind draft gating. Adaptation — a title, a description, valid frontmatter — is now the
  only publication gate.
- **Debt D5 is nearly closed: 181 of the 197 selected articles adapt.** All four corpora
  have run the Q1 `description` pass — `nextjs@v0.3.0` 10/10, `react@v0.5.0` 58/73,
  `angular@v0.3.0` 93/94, `nestjs@v0.3.1` 20/20. Exactly 16 files still fail, and only one
  of them fails on `description`: `angular`'s duplicate
  `docs/recipes/elements/widget-deployment.md` (Debt D15). The other 15 are the untitled
  `react` articles (Debt D11), which the description pass skipped precisely because they
  have no H1. `verify-frontmatter` therefore still exits 1 on 16 files.
  `verify-links` still exits 1 on the 44 unresolved refs (Debt D13).
  `build-catalog` writes the artifact with those refs recorded and exits 0.
  `nestjs@v0.3.1` recovered `dtos-and-class-validator` (Debt D12 closed), which
  is why selected went 196 → 197 and adapting 180 → 181.
- **`catalog.json` is emit-with-exclusions, not all-or-nothing.** A file that cannot
  adapt is left out of `articles` and recorded in `catalog.failures` with its repo,
  source path, and reason — the same treatment a draft gets. Unresolved `related`
  refs are recorded in `catalog.unresolvedTargets` the same way: `build-catalog`
  exits 0 and writes; `verify-links` is the gate that fails on them;
  `verify-catalog` exits 1 while `failures` is non-empty; `verify-frontmatter`
  still fails on the source content. Read the build's `excluded` count, not its
  exit code, to know whether every file adapted.
- **The link report's buckets, and which is fatal — re-scoped 2026-08-18.** `edges`
  (target adapts) render as links; `excludedTargets` (target is a real file in
  `catalog.failures`) **warns** and travels in `catalog.json` so the renderer emits plain
  text instead of a dead link; `draftTargets` is now **vestigial and always empty** — there
  is no more draft gate, kept only so the schema and any consumer reading the key stay
  stable; `unresolvedTargets` (target exists in no corpus at all) is **fatal in
  `verify-links`**. `build-catalog` records the unresolved list and still writes, so a
  content-watch catalog diff has a real snapshot to compare. The principle is fail once on
  the root cause, never on its symptoms — the excluded articles were producing 79 inbound
  "unresolved" failures and burying the refs that point at nothing. Refs to a planned
  corpus or a demo app still warn separately. `verify-links` therefore no longer fails on
  adaptation failures; `verify-frontmatter` owns those.
- **A real catalog now writes 289 edges, not 0.** Measured 2026-08-18 against the current
  pins (`nestjs@v0.3.1`), after the `authoringStage` change: 181 of 197 adapt, **289 refs
  resolve to a live edge**, 79 refs hit an excluded article across 14 distinct targets
  (warn), 0 draft-target warnings, 6 hit a demo app (warn), and **44 refs across 33
  distinct targets** resolve to nothing. Before the fix, the 289 that are now edges were
  bucketed as `draftTargets` warnings instead, because every adapting article normalised to
  `status: 'draft'` — see the key fact above. `build-catalog` writes all of that into
  `catalog.json` and exits 0; `verify-links` still fails on the unrelated 44 unresolved
  refs. The D12 `git mv` closed 6 inbound refs to `nestjs/dtos-and-class-validator` (now
  live edges, not draft-target warnings) and the recovered article added 1 new unresolved
  outbound ref to `nestjs/nested-dto-not-validated`. Itemised in
  `docs/audit/unresolved-refs-2026-08-16.md` — see Debt D13.
- **`authoringStage` (formerly `status`) is no longer a publication gate — adaptation is.**
  Every one of the 181 adapting articles carries some raw authoring-stage label (`draft`,
  `review`, `needs-upgrade`, or an object shape), and none of that gates rendering anymore.
  `NEXT_PUBLIC_SHOW_DRAFTS` still exists but now controls only whether a future UI surfaces
  that label as a badge — it has no consumer yet. See Debt **D6**: the one known-false
  headline claim in the corpus (`nestjs/dtos-and-class-validator`) was previously hidden by
  draft gating regardless of `NEXT_PUBLIC_SHOW_DRAFTS`; it now renders in every build, which
  raises the urgency of the corpus-side correction.
- **The debt register lives in `docs/DEBT.md`**, not in `progress.md`. IDs D1–D16,
  append-only, never reused. `progress.md` keeps a one-line pointer. D16: nextjs and
  angular article/recipe templates omit `description` (reintroduces D5); react and
  nestjs have no templates.

---

## Open decisions (blocking)

1. **fumadocs spike — PASSED (session 1).** Keep fumadocs-core + fumadocs-mdx. Fallback
   pipeline is not needed.
2. **AngularDemos integration.** Does `nxhhuy.tech` link out to `ng21.`/`ng15.`, iframe
   them under a `/demos/*` route, or load Angular 21 as a cross-framework federated
   remote? Not decided. Default assumption until decided: **link out**.
3. **Monetization.** Gates whether `entitlements` is built at all, whether Vercel Hobby is
   permissible, and whether quiz scoring must be server-side.

---

## Planned next steps

1. The Q1 `description` frontmatter pass (Debt D5) has now landed in all four corpora —
   `nextjs@v0.3.0`, `react@v0.5.0`, `angular@v0.3.0`, `nestjs@v0.3.1`. What is left is
   corpus-side and specific, not another bulk pass: Debt D11 (15 `react-concepts`
   articles with no title, skipped by the pass for that reason) and Debt D15
   (`angular`'s duplicate `widget-deployment.md`). See
   `prompts/corpus-description-pass.md`.
2. The 44 unresolved `related` refs (Debt D13) still fail `verify-links`. They no
   longer stop `build-catalog` from writing — the artifact records them in
   `catalog.unresolvedTargets`. All corpus-side; itemised per ref in
   `docs/audit/unresolved-refs-2026-08-16.md`. Debt D12 is closed (`nestjs@v0.3.1`).
   The cheapest remaining Group 1 fix is publishing the two staged `nextjs` articles
   (`cache-lifetimes`, `use-cache-directive`), which closes 4 of the 44.
3. Wire `apps/web` routes + sidebar to `catalog.json` (Phase 1 items 7–8). The
   artifact now exists: 181 articles, 16 exclusions, 44 unresolved refs recorded.
4. Design tokens applied in `packages/ui`.
5. DNS cutover: `nxhhuy.tech` -> Vercel.
