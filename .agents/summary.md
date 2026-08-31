# corpus-web — workspace summary

> Living document. Read this first, every session. Update it with **targeted edits only**
> when something in it becomes false. Never rewrite wholesale.
>
> This file is edited **in place**. It is deliberately absent from `.gitattributes`, so it
> is never union-merged — see `.cursor/rules/00-session-protocol.mdc`.
>
| **Last updated: 2026-08-31 (Polish-8 in flight — `polish/d25-license-page` cut off `develop`. DEBT D25 closed: new `apps/web/app/[locale]/license/page.tsx` (RSC, prerendered for every registered locale) carries the CC BY 4.0 attribution block + per-surface notes (code samples, adapted articles) + a creativecommons.org pointer + a `mailto:` block. New `apps/web/components/chrome/site-footer.tsx` is the first site footer — renders the same `nxhhuy@gmail.com` contact + an inline license link. `<SiteFooter>` mounted in `apps/web/app/[locale]/layout.tsx` after `{children}`, so it shows up on every locale page (home, blog index, article detail, course list, course detail, lesson, license) without per-page wiring. `apps/web/lib/routes.ts` gains `licensePath(locale)`. `apps/web/messages/en.json` gains a 15-key `license.*` namespace plus `nav.license`. The `nxhhuy@gmail.com` email is the only personal-context surface, with `nxhhuy.tech` as the only allowed host — strictly per session protocol. All 3 gates green: typecheck 5/5, next build 236/236 + new prerendered `/en/license` route, verify:prerender 196/196+18/18, verify:frontmatter 196/196. Phase 1 item 13 🟡 → 🟢. Predecessor PRs: #96 Polish-5 batch-5, #97 Polish-6, #98 Polish-7. **Next:** Polish-9 candidates per Phase 1 residue (D20 Shiki ⚪, D29 category-filter wiring, D32 related-articles section with 289 edges already in catalog); OG image generator (D22 residue — needs DNS + Vercel routing green-light in its own session); develop→main release PR remains reserved for user action.**)
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
employer, or client content. `/en` is a corpus landing page. The only contact surface
is `nxhhuy@gmail.com` in the footer and on `/en/license`. This is a hard rule — see
`.cursor/rules/20-never-violate.mdc` § "Personal content boundary".

Reference for layout structure only: `sydexa.com`. Structure is a convention; visual
identity, palette, illustrations, and copy are deliberately our own.

---

## Architecture in one paragraph

Content is build-time. Next.js 16.3 with Cache Components owns rendering; Postgres never
sits in the read path for an article body. NestJS 11 owns everything user-specific — auth,
progress, quiz attempt records, flashcard scheduling. The test for any endpoint: if
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
      `react` `v0.5.0`, `angular` `v0.3.0`, `nestjs` `v0.3.2`
- [x] Design tokens applied to the article shell (listing chrome uses them)
- [x] `nxhhuy.tech` DNS cutover — complete 2026-08-19. Apex serves
      corpus-web on Vercel (200); `www` 308s to the apex; every page emits
      `<link rel="canonical">` pointing at the apex. Verified with curl.

Application code now exists: `apps/web` serves catalog-driven listing routes at
`/en`, `/en/courses`, `/en/courses/react-render-cycle`, and `/en/blog`, plus
article routes at `/en/blog/[corpus]/[slug]` (181 adapting) and
`/en/courses/react-render-cycle/lessons/[slug]` (12). The session-1 spike at
`/[locale]/concepts/[repo]/[...slug]` is removed. `apps/api` is an empty Nest
bootstrap.

---

## Key facts that are easy to get wrong
- Canonical article URL is `/en/blog/[corpus]/[slug]`; courses live at
  `/en/courses/*`. Listing routes (`/en`, `/en/courses`, `/en/courses/[course]`,
  `/en/blog`) and both article wrappers generate from `catalog.json`. The
  session-1 spike at `/en/concepts/…` is gone and must not be revived.
- Lesson pages set `rel=canonical` (and `og:url`) to the matching `/en/blog/…`
  URL. Unresolved and excluded `related` refs render as plain text.
- **Rail ticks are one per `catalog.sections` entry with `depth === 2` (h2 /
  part), not h3.** `jsx-and-rendering` is 13 parts / 28 headings. Each tick is
  a `<button>` containing `.av-tk-l` at `right: 38px`, revealed on `:hover` and
  `:focus-visible`. The rail must be `overflow: visible` — `overflow: hidden`
  on the 3.5rem track clips the labels (that was the missing-hover-label bug).
  **Active is not `visible[0]` from the 20%–40% IntersectionObserver band.**
  That band is only the trigger. The picker is last heading whose top is at
  or above 20% of the viewport. The last part is forced only at literal max
  scroll, or inside a bottom zone (`remaining ≤ 0.2 × viewportHeight`) when
  that heading is on screen *and* the document is too short to bring it up
  to the reading line. The old leftover-scroll vs heading-distance comparison
  cancelled every `scrollY` term and pinned short-tailed pages (Demo source
  ~500px from the document end) to the last part from `scrollY === 0`.
  `.av-pnav` is a sentinel that retriggers the picker, not itself "at
  bottom" — otherwise a click on a late short part (See also) would steal
  the highlight for the last part. Click pins `active` until the picker
  agrees or the page hits max scroll. `jumpToPart`'s `scrollIntoView`
  already lands on the clicked heading.
- **`apps/web` does not import `@corpus/content-schema`.** Next's Turbopack build
  cannot resolve that package's NodeNext `.js` specifiers to `.ts` sources, and
  a client corpus filter must not pull remark/zod adapters. The listing loader
  parses a local subset of `catalog.json`. `relatedHref` returns null unless the
  uid adapted — excluded and unresolved refs must render as plain text.
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
  `.next/server/app/<route>.html`. `pnpm verify:prerender` is the gate: every
  adapting article and every path lesson must emit that file with a non-empty
  `<body>`. Bracketed `[param]` shells for Cache Components ◐ rows are excluded
  (D23, closed).
- `next dev` under-reports prerender severity: some failures show HTTP 200 in dev and are
  fatal at build.
- **Every Cache Components ◐ dynamic segment that calls `notFound()` needs a paired
  `not-found.tsx` at the segment level** — not an app-wide one. Without it, prod
  returns HTTP 500 on any slug `generateStaticParams` didn't emit, because
  `NEXT_NOT_FOUND` crosses the `'use cache'` boundary on `getCatalogView()`
  (and similar) and Next 16's prod runtime classifies it as a generic error.
  Dev returns a clean 404 via Next's built-in fallback, so the bug is invisible
  without a prod curl. Both `apps/web/app/[locale]/blog/[corpus]/[slug]/not-found.tsx`
  and `apps/web/app/[locale]/courses/[course]/lessons/[slug]/not-found.tsx`
  exist as of 2026-08-28. Future dynamic segments that `notFound()` need the
  same pairing — keep the not-found page free of `getCatalogView()` so it
  doesn't re-cross the cache boundary it's trying to escape.
- **Every rule that places a child of the article shell's grid is breakpoint-scoped, and
  must stay that way.** `docs/design/article-layout-poc.html` pairs
  `@media (width > 1000px)` with `@media (width <= 1000px)` — exact complements — and each
  block declares its own template *and* places `.sb`, `main`, and `.rail` inside it. Two
  separate bugs came out of splitting those apart: a `grid-column:2` left at top level put
  `main` in an implicit second track once the mobile block dropped to one column, and
  `.view.nosb` at (0,2,0) outranked the mobile `.view` at (0,1,0), so a sidebar collapsed on
  desktop dragged the three-column template into mobile and gave 56px of a 390px viewport to
  an empty rail track. The second one had already been patched around once, with
  `.view.nosb>.sb{visibility:visible}` inside the media query — if a fix to this grid needs a
  higher-specificity selector to undo another rule, the scoping is wrong, not the specificity.
- **Headless Chrome clamps its own window to roughly 500px wide.** `--window-size=390,900`
  reports `innerWidth: 500`, so a 390px check silently measures 500px and passes. Render the
  page inside a fixed-width iframe to get a real 390px viewport. Both POC grid bugs survived
  a round of manual checking, and the mobile one is invisible at 500px.
- `class-validator` has defaulted `forbidUnknownValues` to `true` since 0.14.0,
  unconditionally since 0.14.2; from `@nestjs/common` 9.3.2 `ValidationPipe` seeds
  it back to `false` as an overridable default, so an undecorated DTO that
  `validate()` rejects passes silently through the pipe. Corrected in
  `nestjs-concepts@v0.3.2` (Debt D6 closed).
- `AngularDemos` is a **separate repo** at `ng21.` / `ng15.nxhhuy.tech`. Not a submodule.
  Integration approach is an open decision — see "Open decisions" below.
- No personal or identifying content ships. Carve-outs: licence attribution
  (`LICENSE`, `/en/license`), because CC BY 4.0 requires naming a copyright holder;
  and `nxhhuy@gmail.com` in the site footer and on `/en/license` only (roadmap
  §16 Q8 as amended 2026-08-20; `.cursor/rules/20-never-violate.mdc`). Phone,
  social links, and physical address remain forbidden. Bylines remain excluded.
  Attribution of adapted work is `isBasedOn` / `citation`, never `author` (D33).
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
- **A real catalog now writes 289 edges, not 0.** Re-verified 2026-08-19 against
  `nestjs@v0.3.2` (census unchanged from the 2026-08-18 `authoringStage` measurement):
  181 of 197 adapt, **289 refs resolve to a live edge**, 79 refs hit an excluded
  article across 14 distinct targets (warn), 0 draft-target warnings, 6 hit a demo
  app (warn), and **44 refs across 33 distinct targets** resolve to nothing. Before the fix, the 289 that are now edges were
  bucketed as `draftTargets` warnings instead, because every adapting article normalised to
  `status: 'draft'` — see the key fact above. `build-catalog` writes all of that into
  `catalog.json` and exits 0; `verify-links` still fails on the unrelated 44 unresolved
  refs. The D12 `git mv` closed 6 inbound refs to `nestjs/dtos-and-class-validator` (now
  live edges, not draft-target warnings) and the recovered article added 1 new unresolved
  outbound ref to `nestjs/nested-dto-not-validated`. Itemised in
  `docs/audit/unresolved-refs-2026-08-16.md` — see Debt D13. **All 289 live edges are
  intra-corpus** (measured 2026-08-19): there is no inter-corpus link to draw, so
  `/en` uses the listing-POC coming-soon card rather than an SVG of four unlinked
  nodes (Debt **D27**). `/en` itself is a transcription of `docs/design/listing-pages-poc.html`
  `#p-home`: census readout, two CTAs, hero band, corpus ratio bars, split
  "Three ways in" with the demo panel as `aside`.
- **`authoringStage` (formerly `status`) is no longer a publication gate — adaptation is.**
  Every one of the 181 adapting articles carries some raw authoring-stage label (`draft`,
  `review`, `needs-upgrade`, or an object shape), and none of that gates rendering anymore.
  `NEXT_PUBLIC_SHOW_DRAFTS` still exists but now controls only whether a future UI surfaces
  that label as a badge — it has no consumer yet. Debt **D6** is closed:
  `nestjs-concepts@v0.3.2` corrects the `nestjs/dtos-and-class-validator` headline
  claim (`forbidUnknownValues` is a seeded overridable default).
- **The debt register lives in `docs/DEBT.md`**, not in `progress.md`. IDs D1–D36,
  append-only, never reused. `progress.md` keeps a one-line pointer. D16: nextjs and
  angular article/recipe templates omit `description` (reintroduces D5); react and
  nestjs have no templates. Session 3 listing slice opened D17–D26 (corpus gates,
  POC a11y, site CI, Shiki, Pagefind, SEO residue, render-mode verification
  (D23 now closed), interactive layer, `/en/license`, accounts/progress sync).
  D27: all 289 live edges are intra-corpus, so the §5.4 concept map is unbuildable.
  D28: `--cool` is used in both POCs and home `.tag.concept` but is not a design token.
  Roadmap patch 2026-08-20 opened D29–D36: inert category filters, course FAQ/timeline,
  sticky-scroll showcase, related-articles section (289 edges verified 2026-08-25),
  adapted-content attribution schema, testimonials blocked on readers, sidecar
  deferral, and the D24 split (tier 1 keeps D24; tier 2 is D36).
- **Interactive layer is tiered** (roadmap §7.1, 2026-08-20). Tier 1 is corpus-agnostic
  and blocking (D24); tier 2 is per-mechanism simulators, incremental (D36). Quiz
  scoring is `mode: 'local'` only (§7.4). The Quiz **component and render path exist**:
  `packages/mdx-components` `Quiz` (fieldset/radio, one question at a time), registered
  as `Quiz`, injected after `afterSection` from `curation/overrides/*.yaml` and/or a
  `{stem}.quiz.yaml` sidecar beside the article. A sidecar may list `quiz:` as one
  block or an array of blocks (each with its own `afterSection`); the PR #32
  top-level `questions` list still parses. `Flashcard` (front/back strip) and
  `Callout` (`info`/`success`/`warn`/`error`) are also registered and inject the
  same way.   `DragDrop` (fill-in-the-blank chip/slot) is registered too. The live
  sample is on `curation/overrides/react-jsx-and-rendering.yaml`
  (`jsx-to-createelement` after `how-it-works-under-the-hood`).
  `article-markdown.tsx` passes `DragDrop` the output of `toClientDragDropWidget()`;
  `accepts` and `correctSlots` stay on the server and are read only by
  `apps/web/lib/dragdrop-actions.ts` (`gradeDragDrop`). Grading is server-side only:
  `apps/web/lib/quiz-actions.ts` (`gradeQuizAnswer`, a Next.js Server Action) is the
  only place `correct` is read after the article page's initial payload is built.
  `article-markdown.tsx` passes `Quiz` the output of `toClientQuizWidget()`
  (`article-widgets.ts`) — `correct` and `explanation` never cross into a `Quiz` prop;
  a review on PR #32 caught an earlier version that shipped the full sidecar (with
  `correct`) straight into the client component, which RSC would have serialized into
  the initial payload regardless of the component's own render logic. The first
  live sample is `curation/overrides/react-jsx-and-rendering.yaml` (not a corpus
  sidecar — content-boundary). Article body chrome uses `.lesson-surface` tokens
  in `apps/web/components/article/lesson-tokens.css`; motion lives in
  `lesson-animations.css` (imported first). Quiz options/verdict, callout
  scroll-reveal, flashcard `rotateY` flip, drag-drop `is-target`/hover, and
  copy-button pulse are gated by `prefers-reduced-motion`. Phase 2 adds a slow
  quiz glow pulse on `:focus-within` only, hover lift on submit/copy (not
  `.av-cbb`), sidebar progress fill on `.av-pbar rect`, and TOC tick easing.
  Phase 3 adds a 480ms decaying shake on `.av-dd-slot.is-flash-no` (the
  FLASH_MS window; settled `.is-no` stays still), an inline-code chip
  hover on `.lesson-surface :not(pre) > code` in `lesson-tokens.css`,
  and a below-fold widget stagger (`data-rise-pending` / `data-rise` via
  `WidgetRise`, same IO pattern as CalloutReveal). First-paint widgets
  do not animate; callouts keep their Phase 1 reveal so they do not
  double-rise.
  Sidecars remain
  the documented future; overrides remain the working mechanism until D17 closes
  (D35).
  Heading-anchored `afterSection` works: fumadocs `MarkdownServer`
  puts function components in the tree where native `h2`/`h3` would be, so
  `injectAfterSections` matches on `props.id` (the catalog slug, assigned at
  mdast by `remarkAssignHeadingIds` using `apps/web/lib/slug.ts`). Native `h2`
  trees still work. `afterSection: ''` is still end-of-article. `githubSlug` /
  `dedupeSlug` in `slug.ts` and `packages/content-schema/src/sections.ts` are
  the same three-line bodies; they had not drifted. An h2 whose next sibling
  is an h3 has an empty section body, so a widget for that h2 lands between
  them — that is the existing "before the next heading" rule, not a miss.
  §7.5 specifies the code-assembly exercise. Video is struck (§16 Q5 decided: SVG plus
  motion).

---

## Open decisions (blocking)

1. **fumadocs spike — PASSED (session 1).** Keep fumadocs-core + fumadocs-mdx. Fallback
   pipeline is not needed.
2. **AngularDemos integration.** Apex `nxhhuy.tech` now CNAME-points at Vercel
   (cut over 2026-08-19); it previously pointed at `angular-demos.pages.dev`.
   Demos remain at `ng21.` / `ng15.`; the apex no longer serves them. How the
   corpus site attaches to those hosts is still Q7: link out, iframe under
   `/demos/*`, or load Angular 21 as a cross-framework federated remote? Not
   decided. Default assumption until decided: **link out**.

Q3 monetization is resolved non-commercial (2026-08-19); quiz scoring is local-only
(§7.4, 2026-08-20). Q5 media is decided: SVG plus motion (2026-08-20). Q8 remains
no personal content, narrowed to permit a contact email in the footer and on
`/en/license` — now enforced in `.cursor/rules/20-never-violate.mdc`.

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
   Debt D6 is closed (`nestjs@v0.3.2`).
   The cheapest remaining Group 1 fix is publishing the two staged `nextjs` articles
   (`cache-lifetimes`, `use-cache-directive`), which closes 4 of the 44.
3. Article and lesson routes now read `catalog.json` (`/en/blog/[corpus]/[slug]`,
  `/en/courses/[course]/lessons/[slug]`). Remaining Phase 1: Shiki (D20),
  Pagefind (D21), `/en/license` (D25), SEO residue (D22), a11y CI (D19).
  D18 (POC a11y on article chrome) is closed. Render-mode gate (D23) is
  `pnpm verify:prerender`. Do not revive `/en/concepts/…`.
4. Quiz, flashcard, callout, and drag-drop primitives exist (D24 slice)
  with Phase 1 + Phase 2 motion polish. Sample usage (2 quizzes, 1
  flashcard, 2 callouts, 1 drag-drop) is
  `curation/overrides/react-jsx-and-rendering.yaml` — not a corpus sidecar
  (content-boundary; D35 still open). Remaining tier-1 widgets:
  code-assembly, stepped-diagram shell, tab group. Remaining animation
  patterns from the 2026-08-27 audit after Phase 3 are skip/defer, not a
  follow-up prompt.
5. **Design-spec polish backlog (2026-08-29).** Four vendor-neutral specs
   land on develop via PRs #81/#82/#83 (PRs #73/#79/#80 history reconciled
   to develop via rebase; this corrects an earlier direct-to-main commit
   path):
   - `prompts/design-spec-2026-08.md` — course-detail (`/courses/[slug]`),
     extended with 4-layer motion stack analysis (CSS keyframes +
     Framer Motion + GSAP+ScrollTrigger + Lenis). 440 lines.
   - `prompts/design-spec-2026-08-lessons.md` — lesson-detail
     (`/courses/[slug]/lessons/[slug]`). 14 sections covering 6 lesson pages.
   - `prompts/design-spec-2026-08-blog.md` — blog index + post
     (`/blog`, `/blog/[slug]`). 18 sections covering 1 index + 5 posts
     (review-first refinement on PR #88, 1287 lines). **Highest-value
     artifact:** the `.blog-content` typography CSS block (17px / 1.8
     line-height / 768px reading column / scoped to article body) —
     ~1h to copy into the design system. Three-layer color tokens
     (site-wide base → `--blog-*` × 2 themes → `[data-blog]` light-mode
     override) is the second-highest-value artifact.
   - `prompts/design-spec-2026-08-home.md` — homepage (`/`). 18 sections.

   **Top action items across the set** (effort × risk, lowest first):
   | Item | Spec | Effort | Risk |
   |---|---|---|---|
   | View Transitions API on lesson content | lessons §3 | ~30min | None |
   | Card hover zoom (`group-hover:scale-110`) | blog §5 | ~30min | None |
   | Section divider (line+dot+label+dot+line) | home §7 | ~30min | None |
   | Film-grain noise overlay (data-URI SVG) | home §2 | ~30min | None |
   | Hero bloom + gradient text | home §2 | ~1h | None |
   | Share buttons (FB/Twitter) | blog §16 | ~1h | None |
   | Pill theme toggle with sliding thumb | lessons §4 | ~2h | Low |
   | Skeleton placeholders for lesson chrome | lessons §9 | ~2h | Low |
   | 3-column audience cards + gradient dividers | home §4 | ~2h | Low |
   | Three-tier accent tokens (`accent` / `accent-deep` / `accent-bloom`) | home §10 | ~2h | Low (breaking) |
   | ScrollStack pinned pain cards | home §3 | ~4h | Med (Framer Motion) |
   | Lenis smooth scroll | lessons / home | ~2h | Low (5KB dep) |

   Framer Motion / GSAP integration is explicitly deferred across all specs
   pending Cache Components compatibility verification. Recommended next
   session: section divider + hero bloom + card hover + film-grain + share
   buttons (~3.5h, lowest risk, highest perceived-polish impact). Promote
   develop → main in a separate admin-squash PR when ready.
