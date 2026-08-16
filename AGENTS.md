<!-- BEGIN GENERATED: do not edit below. Source: .cursor/rules/*.mdc -->
# AGENTS.md

> **Generated file.** Do not edit. Source of truth is `.cursor/rules/*.mdc`.
> Regenerate with `pnpm agents:build`. CI enforces this via `pnpm agents:check`.

This file exists so the project is portable across coding agents. Cursor reads
`.cursor/rules/`; most other agents read this file. Both are the same rules.

---

## Always-applied rules

<!-- source: .cursor/rules/00-session-protocol.mdc -->

# Session protocol — corpus-web

## FIRST ACTION — before anything else

Do NOT explore the repo. Do NOT run commands. Do NOT read source files.
Open and read these exact files, in this order:

1. `.agents/summary.md`
2. `.agents/SESSION-LOG.md`
3. `CHANGELOG.md`
4. `roadmap.md`
5. `progress.md`

Then respond using only what those files contain.
If any file is missing, say so and stop.

If the prompt names a session file (`prompts/session-N.md`), read that sixth and treat it
as the authoritative task list. Anything not in it is out of scope.

---

## Division of labour

- **Claude** authors prose, session prompts, schemas, architectural decisions, and content.
- **Cursor** executes file operations, runs builds and gates, opens PRs.
- Cursor does not invent content. If a task requires writing reader-facing prose or a
  technical claim, stop and report that the session prompt is underspecified.

---

## Invented decisions — mandatory disclosure

Any decision inferred rather than instructed MUST be stated explicitly in the session
output and in the SESSION-LOG entry under a heading `**Invented decisions:**`.

A silent assumption is a failed session even when the assumption was correct.

---

## After EVERY session — mandatory steps

Complete all four. Do not skip even if the session was small.
Do not commit until all four are done.

### 1. Append to `.agents/SESSION-LOG.md`

Exact format. List every file specifically — never summarise as "various files".

~~~
## Session [N] — [topic] — [YYYY-MM-DD]

**Branch:** [current git branch]

**Files changed:**
- `path/to/file` — one-line reason

**Why:** [1-2 paragraphs on the architectural decision or problem solved]

**Invented decisions:** [bulleted, or "none"]

**Known issues / next steps:** [anything deferred or incomplete]

---
~~~

### 2. Append to `CHANGELOG.md` under `## [Unreleased]`

~~~
### [YYYY-MM-DD] — [branch name] — [short topic title]

**Added**
- bullet per addition

**Changed**
- bullet per change

**Fixed**
- bullet per fix

**Architecture decisions**
- one-liner per decision made
~~~

If `## [Unreleased]` does not exist, create it directly below the `# Changelog` heading.

### 3. Update `.agents/summary.md` — targeted edits only

Update only if one of these changed: new apps/packages/routes, new dependencies,
deployment or DNS config, content submodule pointers, architecture decisions affecting
future sessions, or a completed item under "Planned next steps".

Do NOT rewrite `.agents/summary.md` wholesale. Edit the specific sections that changed.

### 4. Update `progress.md`

Status vocabulary, suite-wide: WHITE=queued, YELLOW=in progress, GREEN=drafted,
CHECK=complete, X=dropped. Use the emoji forms already present in the file.

`roadmap.md` is a stable planning document. It is NOT a progress tracker and is not
updated per session — only on an approved scope change.

---

## Agent-doc portability

Rules are authored in `.cursor/rules/*.mdc` and are the single source of truth.
`AGENTS.md` and `CLAUDE.md` are GENERATED. Never hand-edit them.

After changing any rule file, run:

```
pnpm agents:build
```

CI runs `pnpm agents:check` and fails on drift. This is what lets the project move
between Cursor, Claude Code, Codex, or any other agent without rewriting context.

---

## Skills

Skills live in `.claude/skills/`, one directory per skill, each with a `SKILL.md`.
`AGENTS.md` carries a generated index of them for agents without native skill support.

**Rules are boundaries; skills are procedures.** These rule files say what must never
happen. A skill says how to do the thing once you are doing it. A skill must never restate
a rule — it references it. If a constraint belongs in both, it belongs in the rule.

The index of available skills and their triggers is in `60-skills.mdc`, which is
generated — never maintain a skill list by hand in this file.

**Never run raw `git commit`.** Use `corpus-commit`.

Adding a skill: create `.claude/skills/<name>/SKILL.md` with `name` matching the directory
and a `description` stating its trigger, then run `pnpm agents:build`. The generator
validates both and fails on drift.

---

<!-- source: .cursor/rules/10-stack-and-topology.mdc -->

# Stack facts — do not guess

Read `package.json` before asserting any version. If a version here disagrees with
`package.json`, `package.json` wins and `.agents/summary.md` must be corrected.

## Versions

| What | Version | Note |
|---|---|---|
| Next.js | 16.3 | App Router, **Cache Components ON** |
| React | 19.2 | Matches `react-concepts` baseline |
| TypeScript | 5.9+ | strict, suite-wide |
| Tailwind CSS | v4 | CSS-first `@theme` config |
| fumadocs-core / fumadocs-mdx | 16.x line | `fumadocs-ui` is NOT used |
| Shiki | v3+ via `rehype-pretty-code` | build-time only |
| NestJS | 11.1.x | Matches `nestjs-concepts` baseline |
| Node | **22 LTS** on web, **24 LTS** on api | deliberate divergence, per corpus baselines |
| Express | 5 | per `nestjs-concepts` |
| TypeORM | 1.1.x | Prisma is `nestjs-concepts` Phase 2 — do not fork that decision here |
| PostgreSQL | 18 | Neon |
| pnpm | 10.33.0 | workspaces |
| Turborepo | latest | task graph + remote cache |

## Repo topology

- **`corpus-web`** (this repo) — monorepo: `apps/web` + `apps/api` + `packages/*`
- **Content submodules** under `content/`, pinned to tags, never edited from here.
  **Four corpora**, confirmed by the session 1 audit:

  | Mount | Repo | Default branch |
  |---|---|---|
  | `content/nextjs` | `nextjs-concepts` | `main` |
  | `content/react` | `react-concepts` | `master` |
  | `content/angular` | `angular-concepts` | `master` |
  | `content/nestjs` | `nestjs-concepts` | `main` |

  All public. Branches are NOT uniform — a wrong entry in `REPO_DEFAULT_BRANCH` silently
  404s every "View source" link in that corpus.

- **`dsa-concepts` is PLANNED, not mounted.** No GitHub remote; it exists only locally.
  Registered in `PlannedRepoId`, no adapter, produces no articles. Refs to it WARN.

- **`demo-auth-concepts`, `demo-authz-concepts`, `demo-attacked-web` are runnable demo
  apps, NOT corpora.** No `docs/`, no frontmatter. Registered in `DemoSourceId` so refs
  resolve and warn rather than failing. **Not submodules** — see `docs/adr/0002-demo-labs.md`.

All under the `EverythingFromDayOne` GitHub org.

## DNS map

| Host | Serves | Platform |
|---|---|---|
| `nxhhuy.tech` | this repo, `apps/web` | Vercel |
| `api.nxhhuy.tech` | this repo, `apps/api` | Fly.io |
| `cdn.nxhhuy.tech` | static media, OG images | Cloudflare R2 |
| `ng21.nxhhuy.tech` | AngularDemos — Angular 21 | separate deploy |
| `ng15.nxhhuy.tech` | AngularDemos — Angular 15 | separate deploy |

Cookie domain is `.nxhhuy.tech` so the apex and `api.` share a session without
third-party-cookie problems. This is why the API is not on a `*.fly.dev` host in prod.

## Monorepo layout

```
apps/web                  Next.js 16.3 — rendering, corpus, portfolio
apps/api                  NestJS 11    — auth, progress, quiz, srs, catalog
packages/content-schema   zod schemas: frontmatter, quiz, deck, path
packages/ui               design tokens + owned primitives
packages/mdx-components   the interactive layer
packages/api-client       GENERATED from Nest OpenAPI — never hand-edited
content/                  FOUR SUBMODULES (gitlinks) — never edited from this repo
curation/                 hand-authored: paths/*.yaml, overrides/*.yaml
scripts/                  sync, catalog, verify gates, agent-doc generation
prompts/                  session prompts, committed
```

---

<!-- source: .cursor/rules/20-never-violate.mdc -->

# Rules — never violate

## Content boundary

- **NEVER edit any file under `content/`.** It is submoduled corpus from four standalone
  repos. Those repos are the single source of truth and are portfolio artifacts in their
  own right.
- **NEVER add site-specific MDX components into a corpus article.** The moment an article
  contains `<EventLoopSim />` it stops rendering on GitHub, which is currently its only
  reader. Use `curation/overrides/*.yaml` injection instead.
- **NEVER treat `auth`, `authz`, or `websec` as corpora.** The session 1 audit confirmed
  they are runnable demo apps with no `docs/` and no frontmatter. They have no adapters and
  are not submodules of this repo.
- **NEVER hand-write a code block into an article.** Code is extracted verbatim from
  verified demo modules by build scripts. Suite-wide invariant.
- **NEVER float a submodule ref.** Pin to tags. `verify-submodules` fails otherwise.
- **NEVER assume `.gitignore` protects the corpus.** It does not and cannot — the parent
  repo tracks each submodule as a gitlink, not as files, so a `content/` entry in
  `.gitignore` is inert. The guard is `verify-submodules.mjs` in CI and as a `pre-commit`
  hook, plus `submodule.<name>.ignore = none` in `.gitmodules` so `git status` surfaces
  dirty submodule content rather than hiding it.
- **NEVER auto-merge a content promotion PR.** Bumping a submodule pointer is a human
  decision.

## Web

- **NEVER use the Pages Router.** App Router only.
- **NEVER disable Cache Components.** The site is the proof-of-work for the
  `nextjs-concepts` thesis; turning it off forfeits the argument.
- **NEVER verify prerendered shell content with `curl` or view-source.** The response is
  streamed. Inspect `.next/server/app/<route>.html` instead.
- **NEVER put business logic in `apps/web/app/api/`.** BFF only — session cookie proxying
  and nothing else.
- **NEVER hand-write a fetch call to `api.nxhhuy.tech`.** Use `packages/api-client`.
- **NEVER use inline styles or raw hex values.** Tailwind v4 utilities backed by `@theme`
  tokens only.
- **NEVER use scroll listeners for the TOC rail.** `IntersectionObserver`.
- **NEVER hardcode a user-visible string.** All routes live under `/[locale]/`; strings go
  through the message catalogue even while `en` is the only shipped locale.

## API

- **NEVER set `synchronize: true` on TypeORM.** Migrations only.
- **NEVER return an entity from a controller.** DTOs only.
- **NEVER hard-delete a `lessons` row.** Archive it. `lesson_progress` points at it and
  articles get renamed and moved.
- **NEVER include a quiz answer key in a response DTO** when the quiz is in `server` mode.
  The key never leaves the server.
- **NEVER skip `@nestjs/swagger` decorators.** `packages/api-client` is generated from the
  OpenAPI document; an undecorated endpoint is an invisible endpoint.
- Note: Nest forces `forbidUnknownValues: false` on `ValidationPipe`, reversing what
  `class-validator` does standalone. Do not assume the standalone behaviour.

## Personal content boundary

This site publishes a technical corpus. It is **not** a personal site, a portfolio, or a
résumé, despite the domain. The corpus repos already strip author footers and credits;
this rule extends that invariant to the delivery surface.

- **NEVER add an About, Bio, Team, Hire Me, or Contact page.**
- **NEVER add a name, photo, avatar, job title, employer, client, colleague, prior
  project, location, or contact detail** to any page, component, or asset.
- **NEVER add an author byline, "written by", or `author` frontmatter mapping** to an
  article template.
- **NEVER emit `Person` JSON-LD, `<meta name="author">`, or an author field in OG tags.**
  Structured data is `WebSite` / `TechArticle` / `Organization` only.
- **NEVER put a name or employer into an OG image, favicon, or `manifest.json`.**
- **NEVER add social links, a newsletter signup framed around a person, or a "follow me".**
  A repo link to `EverythingFromDayOne` is fine — that is a project link.
- **NEVER seed demo, seed, or fixture data with real names, employers, or clients.** Use
  obviously synthetic values.

**Carve-out — licensing is not personal content.** `LICENSE` files and a `/en/license`
page must name the copyright holder, because CC BY 4.0 is an attribution licence and the
attribution has to be to someone. That is a legal requirement, not a bio. Keep it to the
licence text and nothing more — no linked profile, no "about the author" block beside it.

If a task seems to require personal content, stop and ask. Do not infer that an empty
About page is an oversight to be helpfully filled.

## Skills

- **NEVER let a third-party skill override a `corpus-*` skill or a rule file.** Community
  skills are general framework knowledge; these files are this project's decisions. Where
  they disagree, the project wins — and the conflict gets reported, not silently resolved.
- **NEVER install a skill bundle whose stack this repo does not use.** A Prisma or AI-SDK
  skill will confidently suggest Prisma and AI SDK. `apps/api` uses TypeORM.
- **NEVER install Angular skills here.** This repo renders articles about Angular; it does
  not write Angular. Those belong in `AngularDemos`.
- **NEVER run a blind `npx skills update`.** Upstreams rename folders and drift. Diff first.

## Agent docs

- **NEVER hand-edit `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/60-skills.mdc`.** Generated from `.cursor/rules/*.mdc` by
  All three are generated from `.cursor/rules/*.mdc` and `.claude/skills/*/SKILL.md` by
  `pnpm agents:build`.

---

## Stop and ask the user before

- Installing any new npm package
- Any version bump or downgrade of Next, React, Nest, Node, TypeScript, or Tailwind
- Any migration touching `lesson_progress`, `card_reviews`, or `quiz_attempts`
- Changing the frontmatter schema in `packages/content-schema`
- Adding a fifth content source, or submoduling any demo lab
- Changing hosting, DNS, or the cookie domain
- Changing the Turborepo task graph or CI gate configuration
- Doing more than the current session prompt specifies

---

## Path-scoped rules

Load the rule whose globs match the files you are editing.

### `30-content-pipeline.mdc` — Content sync, frontmatter adapters, catalog, sidecars. Applies to content and pipeline code.

**Applies to:** `content/**`, `curation/**`, `scripts/**`, `packages/content-schema/**`

# Content pipeline

## Direction of flow — one way only

```
4 mounted corpus repos (canonical)  [+1 planned: dsa · 3 demo apps: not corpora]
  -> git submodule, pinned to tag
    -> scripts/sync-content.mjs
      -> packages/content-schema adapters (normalise, do NOT rewrite)
        -> scripts/build-catalog.mjs -> catalog.json
          -> apps/web routes + sidebar   (render)
          -> POST api/catalog/sync       (FK targets for progress)
```

Nothing flows back. There is no path by which this repo modifies a corpus repo.

## Frontmatter

The four mounted repos have compatible-but-not-identical frontmatter. Do NOT unify them by
rewriting the corpora. Unify with per-repo **adapters** in `packages/content-schema`
that normalise into one internal `Article` shape.

All four share a documented schema, so the specs are informed guesses rather than
hypotheses — but still guesses. Session 2 runs them against the real files.

Normalised shape:

```ts
type Article = {
  id: string;          // `${repo}/${article_id}` — globally unique, stable forever
  repo: RepoId;
  kind: 'concept' | 'recipe';
  folder: string;
  title: string;
  description: string; // the dek — REQUIRED, doubles as meta description
  wave: number | null;
  difficulty: 'foundational' | 'intermediate' | 'advanced' | null;
  baseline: { framework: string; version: string };
  status: 'draft' | 'complete';
  related: ArticleRef[];
  sourcePath: string;  // drives the "Edit on GitHub" link
  contentHash: string; // sha256 of body — drives the DB upsert
};
```

When a corpus changes its frontmatter, **one adapter changes** — never 120+ files.

`article_id` / `recipe_id` is always the filename slug, never a sequence number.

## Draft gating

`status: 'draft'` renders only when `NEXT_PUBLIC_SHOW_DRAFTS=1`. Production ships
completed work only. A path may not reference a draft article — `verify-catalog` fails.

## Cross-repo links

The corpus repos WARN on cross-repo links because they cannot resolve standalone.
Here they CAN resolve, so here they are a **hard failure**. `verify-links` in this repo
is strictly stronger than the per-repo gate.

**Two exceptions, both warn rather than fail.** A ref to a PLANNED corpus (`dsa`, no remote
yet) points at work that exists but is unpublished — failing over it would push authors
toward deleting correct cross-references. A ref to a DEMO app (`auth`, `authz`, `websec`)
points at a runnable application rather than an article, which is legitimate. They land in
`LinkReport.plannedTargets` and `demoTargets` respectively.

## content_hash

The pivot for catalog sync. Unchanged hash means no-op. A changed hash flags affected
`lesson_progress` rows for **optional** invalidation — never automatic. A typo fix must
not wipe a reader's completion streak.

## Sidecars vs overrides

The rule: **if it is a claim, it lives in the corpus. If it is a rendering, it lives here.**

1. **Sidecars — committed to the corpus repo**, next to the article:
   `js-patterns-react.quiz.yaml`, `js-patterns-react.deck.yaml`.
   Quizzes and flashcards are content and stay under the corpus's verified-claims
   discipline and its own CI.
2. **Overrides — `curation/overrides/*.yaml` in this repo**:
   a map of `article_id -> [{ afterHeading, component, props }]`.
   This is how a rich interactive widget lands in an article without touching it.

## Submodule promotion

Corpus repo tags a release -> `repository_dispatch` fires at this repo -> Action bumps the
submodule pointer, runs all gates, opens a PR. **Never auto-merges.**

---

### `40-web-nextjs.mdc` — Next.js 16.3 conventions — caching, RSC boundaries, styling, i18n, MDX.

**Applies to:** `apps/web/**`, `packages/ui/**`, `packages/mdx-components/**`

# apps/web — Next.js 16.3

## Caching strategy (Cache Components ON)

| Surface | Strategy |
|---|---|
| Article body | `'use cache'` + `cacheLife('max')`, keyed on `contentHash` |
| Sidebar tree | `'use cache'`, module level |
| Search index | static asset, not a server route |
| Progress ticks (TOC rail) | Suspense boundary, uncached, per-user |
| Quiz results / SRS due count | Suspense, uncached |

`'use cache: private'` provides **zero server-side caching** — it is per-session request
memoization only. Do not expect it to reduce API load.

**Degradation contract:** an API outage degrades the site to a read-only corpus, never to
a blank page. The article shell must prerender independently of `api.nxhhuy.tech`.

**Verification:** inspect `.next/server/app/<route>.html` after `next build`. Do not use
`curl` or view-source — the response is streamed and both under-report. Note also that
`next dev` under-reports severity: some prerender failures present as HTTP 200 in dev and
are fatal at build.

## Server / client boundaries

- RSC by default. `'use client'` only at interaction leaves, never on a layout or page.
- Never pass a class instance across the client boundary — on a prerendered route this is
  a hard build failure, not silent degradation.
- Sync IO inside a `'use cache'` scope is legal and freezes at entry creation. Do not
  read env or clock inside one and expect freshness.

## Styling

- Tailwind v4 only. Tokens declared in `@theme` blocks in `packages/ui`.
- No inline styles. No raw hex. No arbitrary values that bypass a token.
- Dark is the default theme and gets the design attention.
- Theme and sidebar-collapse state live in cookies, not `localStorage`, so SSR renders
  the correct state without a flash.

## MDX

- Every MDX component is registered in `packages/mdx-components` and exported through one
  map. Never define a component inline in a route file.
- Code blocks are highlighted at build time by Shiki via `rehype-pretty-code`. No
  client-side highlighter ships.
- Playground tiers: **Tier 1** is a Web Worker eval with a `console` shim and a hard
  timeout — this is the default and covers every plain-JS snippet. **Tier 2** is Sandpack,
  lazy-loaded behind an explicit "Open interactive editor" click, used only where JSX must
  actually render. Sandpack must never be in a default page load.

## Layout

- TOC rail uses `IntersectionObserver`. Never scroll listeners.
- Mobile layout is Phase 1 work, not deferred polish. Sidebar-first layouts degrade badly
  when mobile is an afterthought.

## i18n

- All routes live under `/[locale]/`. `en` is the only shipped locale.
- Every user-visible string goes through the message catalogue from day one, including
  while there is one locale. Retrofitting locale into a live URL structure is genuinely
  painful; this is cheap insurance.
- `vi` is a future phase. Do not add `vi` message files or translated content without an
  approved scope change.

## API access

`packages/api-client` is generated from the Nest OpenAPI document in CI. Never hand-write
a fetch call to the API. `apps/web/app/api/` is a BFF for session cookie proxying only.

---

### `50-api-nestjs.mdc` — NestJS 11 conventions — modules, DTOs, TypeORM, auth, OpenAPI.

**Applies to:** `apps/api/**`

# apps/api — NestJS 11

## What this service is for

State, not content. Postgres never sits in the read path for an article body.

Module inventory:

| Module | Owns |
|---|---|
| `auth` | registration, login, sessions, refresh rotation, OAuth |
| `users` | profile, preferences (theme, sidebar, locale) |
| `catalog` | ingests `catalog.json`; owns `lessons`, `lesson_sections`, `paths` |
| `progress` | lesson + section completion, streaks |
| `quiz` | question bank, attempt scoring, **answer key custody** |
| `srs` | flashcard scheduling (FSRS), due queues |
| `notes` | highlights, bookmarks, per-article notes |
| `entitlements` | free vs paid access |
| `analytics` | event ingest -> BullMQ -> aggregates |
| `admin` | catalog inspection, attempt review |

The test for any new endpoint: **if the API were down, would reading break?** If yes, it
is in the wrong service.

## Structure

- One module per domain, `src/modules/<domain>/`.
- Controller -> Service -> Repository. Controllers contain no business logic.
- Named exports. Co-located `*.spec.ts`.

## Validation

- Every request body has a DTO with `class-validator` decorators.
- `ValidationPipe` with `whitelist: true`, `transform: true`.
- **Nest forces `forbidUnknownValues: false`**, which reverses `class-validator`'s
  standalone default. Do not write tests that assume the standalone behaviour.

## Persistence

- TypeORM migrations only. `synchronize: true` is forbidden in every environment.
- Never return an entity from a controller — map to a DTO.
- `lessons` rows are archived, never deleted. Add a `lesson_aliases` row on every rename;
  that table also feeds the Next `redirects()` config so old URLs keep working.

## Auth

- Nest is the identity provider. Session cookie: `httpOnly`, `Secure`, `SameSite=Lax`,
  `Domain=.nxhhuy.tech`.
- Short-lived access token + rotating refresh token. Refresh reuse detection revokes the
  whole family.
- The client uses single-flight refresh, implemented per the `react-concepts`
  `refresh-storm` recipe.
- `@nestjs/throttler` + Redis on login, register, and refresh.

## Quiz answer keys

`quiz_options.is_correct` is never serialized to a client in `server` mode. The response
carries the verdict and the explanation, never the key. Add a serialization test that
asserts this — it is the kind of leak that survives review.

## OpenAPI

`@nestjs/swagger` decorators are mandatory on every endpoint and DTO.
`packages/api-client` is generated from the emitted document in CI. An undecorated
endpoint is an invisible endpoint.

---

## Skills

Task-triggered procedures in `.claude/skills/`. Rules above are always-on
constraints; skills are how-to, loaded when the task matches. Read the full
`SKILL.md` before acting on the matching task.

- **`corpus-adapter`** — How to write and correct per-corpus frontmatter adapters in packages/content-schema. Use when a frontmatter validation error appears, when auditing a corpus against its adapter spec, when adding a corpus, or when normalising a new frontmatter field. Explains why adapters throw instead of defaulting, and why three sibling repos have no adapter at all.
  → `.claude/skills/corpus-adapter/SKILL.md`

- **`corpus-commit`** — Commit and push procedure for corpus-web. Use before any git commit or push, and whenever a session is being closed. Covers the four mandatory documentation updates that gate every commit, the gate suite that must pass, branch naming, and the Conventional Commits format including the invented-decisions block.
  → `.claude/skills/corpus-commit/SKILL.md`

- **`corpus-content-boundary`** — Rules for anything touching content/, the seven submoduled corpus repos. Use when a gate fails on a corpus file, when adding quiz or flashcard sidecars, when injecting an interactive component into an article, when bumping a submodule to a new tag, or whenever a task would be solved by editing a file under content/. Explains why editing the corpus from this repo is never the fix.
  → `.claude/skills/corpus-content-boundary/SKILL.md`

- **`corpus-mdx-component`** — How to build interactive components for the article reading experience — quizzes, flashcard decks, runnable code playgrounds, stepped simulators, and code blocks. Use when adding or editing anything in packages/mdx-components or packages/ui, or when a task asks for an interactive explainer inside an article. Covers the two playground tiers, component registration, and the design token discipline.
  → `.claude/skills/corpus-mdx-component/SKILL.md`

- **`corpus-nest-module`** — Conventions for apps/api, the NestJS 11 service. Use when adding or editing a module, controller, service, DTO, guard, entity, or TypeORM migration, and when deciding whether a piece of functionality belongs in the API at all. Covers answer-key custody, the forbidUnknownValues reversal, and why lessons rows are archived rather than deleted.
  → `.claude/skills/corpus-nest-module/SKILL.md`

- **`corpus-next-caching`** — Caching, rendering and verification rules for Next.js 16.3 with Cache Components enabled. Use when adding or editing any route, page, layout, loading boundary, Suspense boundary, server component, or data fetch in apps/web, and when verifying prerender output. Covers 'use cache', cacheLife, the client boundary, and why curl and next dev both under-report failures.
  → `.claude/skills/corpus-next-caching/SKILL.md`

- **`corpus-promote-content`** — Procedure for bumping a content submodule to a newer corpus tag. Use whenever content needs updating from one of the seven corpus repos, when a corpus cuts a new release, or when a repository_dispatch promotion PR needs handling. Covers tag pinning, catalog diff review, and the cosmetic-versus-substantive content_hash decision that the user must make.
  → `.claude/skills/corpus-promote-content/SKILL.md`

- **`corpus-session`** — Opening and closing a work session in corpus-web from a committed prompt file. Use at the start of any session invoked as "follow prompts/session-N.md", and when closing a session. Covers the mandatory read order, scope restatement, the invented-decisions disclosure requirement, and authoring the next session prompt.
  → `.claude/skills/corpus-session/SKILL.md`
<!-- END GENERATED -->
