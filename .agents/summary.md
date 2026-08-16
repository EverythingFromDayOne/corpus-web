# corpus-web — workspace summary

> Living document. Read this first, every session. Update it with **targeted edits only**
> when something in it becomes false. Never rewrite wholesale.
>
> Last updated: 2026-08-16 (Session 2 follow-up — deriveTitle reads headings, not lines)

---

## What this repo is

The delivery surface for the `EverythingFromDayOne` concepts suite. It renders ~120
verified reference articles from four standalone corpus repos into one site at
`nxhhuy.tech`, and adds the retention layer (progress, quizzes, spaced repetition) that
standalone markdown cannot provide.

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
      `verify-links` / `verify-catalog` gates (session 2) — **cannot currently produce a
      passing build: every article is missing `description` (Debt D5), 15 `react-concepts`
      articles are also missing a title entirely (Debt D11)**
- [x] `packages/ui/DESIGN.md` + `tokens.css` — the "Instrument" direction
- [x] `.github/workflows/ci.yml`
- [x] `docs/adr/0001` — Angular demos integration (proposed, pending Q7)
- [x] `prompts/session-2.md`, `prompts/corpus-description-pass.md`
- [x] Monorepo scaffold (pnpm workspaces + Turborepo)
- [x] **fumadocs-mdx × Next 16.3 × Cache Components spike** — all four exit criteria passed
      against `cache-components-model`
- [x] Content submodules wired, four mounts, pinned to tags
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
- Cross-repo links WARN in the corpus repos and **hard-fail** here, because here they
  can actually resolve.
- Node 22 on `apps/web`, Node 24 on `apps/api`. Deliberate. Follows each corpus baseline.
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
  is picked up automatically (session 2 audit).
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
  some `angular` recipes** (`{ drafted, reviewed }` / `{ upgraded, reviewed }`).
  `normaliseStatus()` collapses any object shape to `draft` unconditionally — it does not
  attempt to read `reviewed: true` as "complete".
- Every one of the ~196 currently-selectable articles fails to adapt on missing
  `description` (Debt D5) — `verify-frontmatter`, `build-catalog`, and `verify-links` are
  all expected to fail until the Q1 description pass runs in each corpus repo. This is
  tracked, pre-existing, and out of scope for the session that discovers it.

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

1. The Q1 `description` frontmatter pass (Debt D5) must run in each of the four corpus
   repos before `build-catalog`/`verify-frontmatter`/`verify-links` can pass; see
   `prompts/corpus-description-pass.md`. A corpus-side fix for Debt D11 (15
   `react-concepts` articles missing any title) is a prerequisite for that corpus.
2. Wire `apps/web` routes + sidebar to `catalog.json` once it can build (Phase 1 items 7–8).
3. Design tokens applied in `packages/ui`.
4. DNS cutover: `nxhhuy.tech` -> Vercel.
