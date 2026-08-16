# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
