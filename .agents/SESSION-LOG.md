# Session log — corpus-web

Append-only. Newest entries at the bottom. One entry per session, no exceptions.
Format is defined in `.cursor/rules/00-session-protocol.mdc`.

---

## Session 0 — repo scaffold and agent rules — 2026-08-15

**Branch:** `main`

**Files changed:**
- `.cursor/rules/00-session-protocol.mdc` — session start/end protocol, invented-decisions disclosure, four mandatory doc steps
- `.cursor/rules/10-stack-and-topology.mdc` — version table, repo topology, DNS map, monorepo layout
- `.cursor/rules/20-never-violate.mdc` — hard constraints and stop-and-ask triggers
- `.cursor/rules/30-content-pipeline.mdc` — one-way content flow, adapters, sidecars vs overrides
- `.cursor/rules/40-web-nextjs.mdc` — caching strategy, RSC boundaries, styling, i18n, MDX
- `.cursor/rules/50-api-nestjs.mdc` — module inventory, DTOs, TypeORM, auth, OpenAPI
- `scripts/build-agent-docs.mjs` — projects `.mdc` rules into `AGENTS.md` and `CLAUDE.md`; `--check` mode for CI
- `AGENTS.md` — generated
- `CLAUDE.md` — generated
- `.agents/summary.md` — workspace summary, current state, open decisions
- `.agents/SESSION-LOG.md` — this file
- `.agents/skills/README.md` — skill index
- `.agents/skills/commit.md` — `/commit` skill
- `.agents/skills/promote-content.md` — submodule promotion skill
- `CHANGELOG.md` — initialised with `## [Unreleased]`
- `progress.md` — phase tracker
- `roadmap.md` — approved planning document

**Why:** The project spans two runtimes, five submoduled content repos, and a mobile-first
Slack + Cursor Cloud Agent workflow. Without a fixed session protocol, context has to be
re-established by hand every session, and the corpus boundary — the one invariant that
keeps five standalone repos standalone — degrades within weeks.

The rules are authored once in `.cursor/rules/*.mdc` and projected into `AGENTS.md` and
`CLAUDE.md` by a generator, with a CI gate that fails on drift. This is deliberate: it
makes the project portable across coding agents without maintaining three copies of the
same rules, which is the failure mode that makes multi-agent setups rot.

**Invented decisions:**
- Repo name `corpus-web` and single-monorepo shape (not split `-fe` / `-be`)
- Six-file rule split with three always-applied and three glob-scoped
- `.cursor/rules/*.mdc` as canonical source rather than `AGENTS.md`, on the grounds that
  `.mdc` is the richest format (globs + alwaysApply) and is plain markdown anyway
- Marker-delimited generated regions so hand-written preamble survives regeneration
- Emoji status vocabulary carried over from the sibling corpus repos

**Known issues / next steps:** No application code exists. Four open decisions are
recorded in `.agents/summary.md`; items 1 and 2 block Phase 0 and Phase 4 respectively.
Next session is the fumadocs x Next 16.3 x Cache Components spike.

---

## Session 0b — personal-content boundary — 2026-08-15

**Branch:** `main`

**Files changed:**
- `.cursor/rules/20-never-violate.mdc` — added the "Personal content boundary" section
- `AGENTS.md` — regenerated
- `roadmap.md` — §0.0 Q8 row, §1 locale-namespaced URL shape, §4.1 `(landing)` rename, §15 item 13, new §15.1, §16 Q8 resolved, §17 items 15/17/18, approval checklist
- `.agents/summary.md` — boundary stated up front, portfolio open-decision removed, key facts extended
- `progress.md` — Phase 1 item 13 retitled, session log entry
- `CHANGELOG.md` — this change

**Why:** Q8 resolved as no personal content. This is an extension of an invariant the
corpus repos already hold — author footers and credits were removed suite-wide — rather
than a new policy, so it belongs in the hard-constraints rule file where an agent cannot
route around it. The specific failure mode being prevented is an agent treating a missing
About page as an oversight and helpfully generating one; the rule says so explicitly.

Replacing the portfolio left a real gap: nothing specified what `/en` is. Roadmap §15.1
now specifies it as an argument for the corpus rather than for a person — thesis, five
corpus cards, concept-graph teaser, three entry points, reading conventions.

**Invented decisions:**
- The entire contents of §15.1 — no guidance existed on what replaces the portfolio
- Extending the boundary to OG images, `manifest.json`, favicons, and seed/fixture data,
  not only page content
- The licensing carve-out — CC BY 4.0 requires naming a copyright holder, so `LICENSE` and
  `/en/license` are exempt; scoped to licence text only, no linked profile

**Known issues / next steps:** The trade-off is recorded in roadmap §16 Q8: the site no
longer functions as something to point a recruiter at. If the intent was to avoid
*employment* detail specifically rather than all attribution, the rule is currently
stricter than needed and should be narrowed before Phase 1 item 13.

---

## Session 0c — content schema, design direction, CI, ADR-0001 — 2026-08-15

**Branch:** `main`

**Files changed:**
- `packages/content-schema/package.json` — package manifest, zod 4
- `packages/content-schema/tsconfig.json` — strict, NodeNext, `noUncheckedIndexedAccess`
- `packages/content-schema/README.md` — adapter pattern, verification status, claim/rendering split
- `packages/content-schema/src/common.ts` — repo ids, slugs, `${repo}/${articleId}` uid, `related` ref shape
- `packages/content-schema/src/article.ts` — the normalised `Article` + `ArticleSection`
- `packages/content-schema/src/adapters/types.ts` — `RepoAdapter` interface, `AdapterError`
- `packages/content-schema/src/adapters/shared.ts` — status/wave/difficulty normalisation, `related` parsing
- `packages/content-schema/src/adapters/factory.ts` — spec-driven adapter construction
- `packages/content-schema/src/adapters/index.ts` — the five per-repo specs
- `packages/content-schema/src/sidecars.ts` — quiz + deck schemas, `toClientQuiz()` answer-key stripper
- `packages/content-schema/src/curation.ts` — path definitions, component-injection overrides
- `packages/content-schema/src/catalog.ts` — `catalog.json` shape, link report
- `packages/content-schema/src/index.ts` — barrel
- `packages/ui/DESIGN.md` — the "Instrument" direction, palette, type, signature element
- `packages/ui/src/tokens.css` — Tailwind v4 `@theme` tokens derived from DESIGN.md
- `.github/workflows/ci.yml` — four jobs: guards, content, build, quality
- `docs/adr/0000-template.md` — ADR template
- `docs/adr/0001-angular-demos-integration.md` — iframe over cross-framework MF (proposed)
- `prompts/session-2.md` — reality-check the adapters, catalog builder, gates
- `prompts/corpus-description-pass.md` — the Q1 frontmatter pass, run in each corpus repo
- `roadmap.md` — §4.1 gitignore correction
- `.cursor/rules/10-stack-and-topology.mdc` — `content/` described as gitlinks
- `.cursor/rules/20-never-violate.mdc` — new rule: `.gitignore` does not protect the corpus
- `prompts/session-1.md` — task 4 corrected, gate-proving step added
- `.agents/summary.md` — state, and the corrected submodule guard
- `AGENTS.md` — regenerated

**Why:** `content-schema` is the contract three consumers share and was the next blocking
piece regardless of the spike outcome, so it was the right thing to own while the spike is
outstanding. It is authored, typechecked against zod 4.4.3, and smoke-tested: cross-repo
`related` resolution, the `recipes/` prefix, filename/id mismatch, missing dek, two-correct-
options, and duplicate path items all behave correctly. The per-repo field names remain
unverified — session 2 exists to find out where they are wrong.

The design direction was written before any component so the CSS derives from a stated plan
rather than accumulating. The one risk taken is monospace as structural UI type, justified
on the grounds that in this corpus the baseline version is what makes a claim true or false,
so it earns typographic promotion instead of being buried in the prose face.

**A real error was found and corrected.** Session 0 stated that `content/` is gitignored and
called that structurally load-bearing. It is neither — a parent repo tracks a submodule as a
gitlink, not as files, so a `content/` entry in `.gitignore` is inert. It would have read as
protection while providing none, which is worse than no guard at all. Replaced with the
mechanism that actually works: `verify-submodules.mjs` in CI and as a `pre-commit` hook,
plus `submodule.<name>.ignore = none` so `git status` surfaces dirty submodule content.

**Invented decisions:**
- Adapter construction via a spec-driven factory rather than five hand-written adapters —
  the corpora differ in field names, not field meaning, so five adapters would be five
  copies of one function. Documented: if a corpus ever diverges in *meaning*, write it a
  real adapter and drop it from the factory rather than adding a flag.
- `${repo}/${articleId}` as the uid format
- Unknown `status` values collapse to `draft`; unknown `difficulty` values **throw**. The
  asymmetry is deliberate: over-hiding is recoverable, mis-categorising is silent.
- `description` required with no derived fallback
- Adapters throw on a filename/id mismatch, enforcing "the id is always the filename slug"
- The entire "Instrument" design direction, palette, and three typefaces — no brief existed
- ADR-0001's recommendation, pending Q7
- CI job split and the rule that a gate returning 0 on an empty input set is broken

**Known issues / next steps:** `adapters/index.ts` field names are unverified and session 2
task 1 is designed to expose them — expect corrections. `verify-*` scripts referenced by
`ci.yml` do not exist yet (sessions 1–2 create them); CI will fail until then, which is the
correct failure. ADR-0001 stays `proposed` pending Q7.

---

## Session 0d — corpus count corrected to seven — 2026-08-15

**Branch:** `main`

**Files changed:**
- `packages/content-schema/src/common.ts` — `RepoId` extended to seven; `REPO_ORIGINS` and a new `REPO_LABELS` map; `ArticleUid` regex widened
- `packages/content-schema/src/adapters/shared.ts` — `REPO_ALIASES` for both new repos incl. an `authn` alias; confidence caveat
- `packages/content-schema/src/adapters/index.ts` — `auth` and `authz` specs, marked lowest-confidence
- `packages/content-schema/src/adapters/types.ts`, `article.ts` — doc comments
- `packages/content-schema/README.md` — seven-corpus diagram, non-uniform confidence
- `.cursor/rules/10-stack-and-topology.mdc` — mount-point table with per-repo confidence
- `.cursor/rules/20-never-violate.mdc` — new rule against assuming auth/authz share the sibling schema; stop-and-ask now says eighth source
- `.cursor/rules/30-content-pipeline.mdc` — seven in the flow diagram, split confidence
- `roadmap.md` — §0.0 corpus-count entry, counts throughout, §4.0 reinforcement, §15.1 seven cards
- `prompts/session-1.md` — seven submodules, `demo-attacked-web` excluded, new reporting step
- `prompts/session-2.md` — audit auth/authz first, stop-and-report if not markdown
- `prompts/corpus-description-pass.md` — auth/authz explicitly deferred
- `.agents/summary.md`, `progress.md`, `AGENTS.md` — counts and the new key fact

**Why:** `demo-auth-concepts` and `demo-authz-concepts` are corpora and were missing from
every document. Mounted at `content/auth` and `content/authz`. `demo-attacked-web` is
excluded — it appears to be the target application the auth/authz demos attack, which is a
demo dependency rather than content.

The important part is not the count. It is that confidence in the adapter specs is no
longer uniform, and pretending otherwise would be the exact failure the verified-claims
discipline exists to prevent. The five framework corpora share a documented sibling schema.
The two new ones are `demo-`prefixed, report HTML as their primary language, and have no
convention on record — their specs are a guess dressed as configuration. Every document now
says so, and session 2 audits them first with an explicit instruction to stop if they turn
out not to be markdown corpora at all.

**Invented decisions:**
- Mount points `auth` and `authz` rather than `demo-auth` / `demo-authz` — shorter URLs, and
  the `demo-` prefix describes the repo's origin, not its content. Noted the one-character
  URL confusability and mitigated with `REPO_LABELS` so chrome never relies on the slug.
- `authn` accepted as an inbound alias for `auth` in `related` refs, since that is the
  conventional disambiguation and someone will write it.
- `demo-attacked-web` excluded from submodules. **Inferred from the name — not confirmed.**
- `stack_baseline` as the guessed baseline key for both new corpora.
- Deferring the description pass on auth/authz rather than running it blind.

**Known issues / next steps:** `demo-attacked-web`'s role is inferred. If the auth/authz
corpora extract code from it the way the framework corpora extract from their demo modules,
it needs submoduling after all and `verify-code-blocks` will fail without it — session 1's
new reporting step should surface this. Typecheck clean; both new corpora smoke-tested
through the adapter and the cross-repo ref parser.

---

## Session 0e — repo renamed to corpus-web — 2026-08-15

**Branch:** `main`

**Files changed:**
- Every file containing the repo name — `.cursor/rules/00-session-protocol.mdc`,
  `.cursor/rules/10-stack-and-topology.mdc`, `.agents/summary.md`,
  `.agents/SESSION-LOG.md`, `AGENTS.md`, `CHANGELOG.md`, `progress.md`,
  `roadmap.md`, `prompts/corpus-description-pass.md`,
  `packages/content-schema/README.md`, `packages/content-schema/package.json`

**Why:** `concepts-web` -> `corpus-web`, and the npm scope `@concepts/` -> `@corpus/`.
Chosen over `fullstack-tech`, which was considered and rejected: naming a repo after its
stack rather than its domain ages badly, reads as generic, and would lie the moment the
stack changed. `corpus-web` keeps the domain anchor and still sorts alongside the
`*-concepts` siblings.

The rename was token-exact. `concepts` on its own was left untouched everywhere it
legitimately means something else — the seven `*-concepts` corpus repo names, the
`docs/concepts/` folder convention, `conceptIdKey`, `concept_folder`, and the
`ArticleKind` value `'concept'`. A blanket find-and-replace on `concepts` would have
silently corrupted all five and is the obvious way this task goes wrong.

**Invented decisions:**
- npm scope follows the repo name (`@corpus/content-schema`) rather than staying
  `@concepts/`. Keeping them aligned means one fewer name to remember; the alternative
  was leaving the scope as a fossil of the old repo name.

**Known issues / next steps:** Nothing pushed yet, so the rename costs nothing. The GitHub
repo must be created as `EverythingFromDayOne/corpus-web`.

---

## Session 0f — agent skills — 2026-08-15

**Branch:** `main`

**Files changed:**
- `.claude/skills/corpus-next-caching/SKILL.md` + `references/suspense-placement.md`
- `.claude/skills/corpus-content-boundary/SKILL.md`
- `.claude/skills/corpus-adapter/SKILL.md`
- `.claude/skills/corpus-nest-module/SKILL.md`
- `.claude/skills/corpus-mdx-component/SKILL.md`
- `.claude/skills/corpus-commit/SKILL.md` — migrated from `.agents/skills/commit.md`
- `.claude/skills/corpus-promote-content/SKILL.md` — migrated
- `.claude/skills/corpus-session/SKILL.md` — migrated from `new-session.md`
- `.agents/skills/` — **removed**, contents migrated
- `scripts/build-agent-docs.mjs` — indexes and validates skills
- `.cursor/rules/00-session-protocol.mdc` — skills table, rules-vs-skills split
- `.github/workflows/ci.yml` — gate now covers skill frontmatter
- `AGENTS.md`, `CLAUDE.md` — regenerated

**Why:** The selection criterion was narrow on purpose: **a skill earns its place only
where Claude's default behaviour is wrong for this project.** Generic "how to write
NestJS" is wasted context. `corpus-next-caching` exists because the training-data default
is `export const revalidate` and `unstable_cache`, both wrong under Cache Components, and
because `curl` and `next dev` both silently under-report prerender failures — three ways to
be confidently wrong that no amount of general Next.js knowledge prevents.

Two skill folders existed after the first pass, which is two formats in two places and
exactly the drift the generator was built to prevent. `.agents/skills/` was migrated into
`.claude/skills/` and removed. One location, one format, portable across agents.

The rules-vs-skills split is now written down: rules are always-on boundaries, skills are
task-triggered procedures, and a skill references a rule rather than restating it. Without
that line the two collections converge into duplicates within a few sessions.

**Invented decisions:**
- Eight skills, and specifically these eight. No brief existed.
- `.claude/skills/` as the location, over `.cursor/skills/` — the format is Anthropic's and
  is read by multiple agents, so it is the more portable choice.
- The generator validates skill frontmatter and **exits 1** rather than warning. A skill
  whose description omits a trigger is never selected, which is a silent failure — the
  loudest possible check is the right one.
- The trigger check accepts "Use when / before / whenever / after / at / during / for". The
  first version demanded "Use when" exactly and rejected three of my own descriptions;
  loosened rather than reworded, because the stricter rule was wrong, not the descriptions.
- `references/` used only for `corpus-next-caching`. The others fit under the size budget.

**Known issues / next steps:** The skills are untested against real tasks — the observe,
refine, retest cycle starts at session 1. Expect `corpus-next-caching` to need the most
iteration; it makes the most specific claims. A `corpus-design` skill was considered and
dropped, since `packages/ui/DESIGN.md` already covers it and rule 40 points there.

---

## Session 0g — Cursor skill reachability, third-party skill policy — 2026-08-15

**Branch:** `main`

**Files changed:**
- `scripts/build-agent-docs.mjs` — emits `.cursor/rules/60-skills.mdc`; excludes that file when reading source rules
- `.cursor/rules/60-skills.mdc` — **generated**, always-applied skill index for Cursor
- `.cursor/rules/00-session-protocol.mdc` — hand-maintained skills table removed
- `.cursor/rules/20-never-violate.mdc` — third-party skill precedence and install constraints
- `.github/workflows/ci.yml` — comment on what the gate now covers
- `AGENTS.md` — regenerated

**Why:** Skills lived only in `.claude/skills/`, which Cursor does not load natively — and
Cursor is the bulk-execution agent, so eight skills it could not see were eight skills that
would not fire. The fix keeps one source of truth: the generator projects the index into an
always-applied Cursor rule, so the index is permanently in Cursor's context and it opens the
`SKILL.md` on demand. No skill content is duplicated.

The hand-maintained skills table in rule 00 was removed in the same pass. It was correct on
the day it was written and would have been wrong the first time a skill was added — exactly
the drift the generator exists to prevent, reintroduced by hand two sessions earlier.

Third-party skills got a precedence rule. Community skills are general framework knowledge;
these files are this project's decisions. A generic Next.js skill will recommend
`revalidate` and `unstable_cache`, which `corpus-next-caching` forbids. Without a written
precedence, that conflict resolves at random.

**Invented decisions:**
- `.cursor/rules/60-skills.mdc` as the filename and the 60 slot, after the hand-authored 00–50
- Whole-file generation for it rather than marker-splice, since it has no hand-written preamble
- The precedence rule: project skills win, and conflicts get **reported**, not silently resolved
- The stack-mismatch install ban, and the Angular-skills-belong-in-AngularDemos rule

**Known issues / next steps:** Verified the gate fails on drift of the new file (exit 1) and
that adding a skill regenerates both the Cursor rule and the AGENTS.md index. Whether Cursor
reads `.claude/skills/` natively in some version is untested — the generated rule makes that
question moot either way.

---

## Session 1 — monorepo scaffold and fumadocs spike — 2026-08-15

**Branch:** `cursor/session-1-scaffold-e487`

**Files changed:**
- `pnpm-workspace.yaml` — apps/*, packages/*, tooling/*
- `package.json` — root scripts, packageManager pnpm@10.33.0, turbo/eslint/typescript
- `pnpm-lock.yaml` — lockfile for the workspace
- `turbo.json` — build, lint, typecheck, test, verify:submodules
- `.nvmrc` — 22
- `.npmrc` — shamefully-hoist=false, strict-peer-dependencies=false
- `.gitignore` — build output, node_modules, .env, .source; not content/
- `.gitmodules` — seven submodules, ignore=none
- `content/nextjs` — gitlink, nextjs-concepts@v0.2.0
- `content/reactjs` — gitlink, react-concepts@v0.4.0
- `content/angular` — gitlink, angular-concepts@v0.2.0
- `content/nestjs` — gitlink, nestjs-concepts@v0.2.0
- `content/auth` — gitlink, demo-auth-concepts@v0.1.0
- `content/authz` — gitlink, demo-authz-concepts@v0.1.0
- `content/websec` — gitlink, demo-attacked-web@v0.1.0
- `tooling/tsconfig/package.json` — @corpus/tsconfig
- `tooling/tsconfig/base.json` — strict NodeNext base
- `tooling/tsconfig/next.json` — Next/Bundler tsconfig
- `tooling/tsconfig/nest.json` — Nest decorator emit
- `tooling/eslint/package.json` — @corpus/eslint-config
- `tooling/eslint/base.mjs` — shared flat config
- `apps/web/package.json` — Next 16.3.1, fumadocs, React 19.2.8
- `apps/web/tsconfig.json` — extends next.json
- `apps/web/next.config.mjs` — cacheComponents, createMDX, agentRules:false
- `apps/web/next-env.d.ts` — Next-generated refs
- `apps/web/source.config.ts` — fumadocs defineConfig
- `apps/web/eslint.config.mjs` — re-export shared config
- `apps/web/lib/source.ts` — fumadocs loader on content/nextjs/docs
- `apps/web/app/layout.tsx` — html/body shell
- `apps/web/app/[locale]/layout.tsx` — locale passthrough
- `apps/web/app/[locale]/concepts/[repo]/[...slug]/page.tsx` — spike article + TOC
- `apps/api/package.json` — Nest 11.1.29 stub
- `apps/api/tsconfig.json` — nest emit
- `apps/api/eslint.config.mjs` — re-export shared config
- `apps/api/src/app.module.ts` — empty AppModule
- `apps/api/src/main.ts` — Nest bootstrap
- `packages/content-schema/package.json` — lint script, pinned typescript
- `packages/content-schema/tsconfig.json` — extends shared base
- `packages/content-schema/eslint.config.mjs` — re-export shared config
- `packages/content-schema/src/common.ts` — REPO_ORIGINS + REPO_DEFAULT_BRANCH
- `packages/content-schema/src/adapters/shared.ts` — react-concepts alias; unused import
- `packages/ui/package.json` — workspace manifest
- `packages/ui/tsconfig.json` — extends shared base
- `packages/ui/eslint.config.mjs` — re-export shared config
- `packages/ui/src/index.ts` — empty token-package export
- `packages/mdx-components/package.json` — spike MDX map
- `packages/mdx-components/tsconfig.json`
- `packages/mdx-components/eslint.config.mjs`
- `packages/mdx-components/src/index.ts` — getMDXComponents identity merge
- `packages/api-client/package.json` — placeholder
- `packages/api-client/README.md` — generated, never hand-edit
- `scripts/verify-submodules.mjs` — dirty / missing / unpinned fail
- `scripts/sync-content.mjs` — git submodule update --init --recursive
- `scripts/build-catalog.mjs` — counts markdown, refuses empty catalog.json
- `scripts/install-git-hooks.mjs` — copies pre-commit hook
- `scripts/git-hooks/pre-commit` — runs verify-submodules; unsets GIT_DIR so submodule git works from a hook
- `.cursor/rules/10-stack-and-topology.mdc` — branches, react-concepts, fumadocs-mdx 15.x
- `AGENTS.md` — regenerated
- `prompts/session-2.md` — session 1 findings prepended
- `.agents/summary.md` — spike passed, mounts, next steps
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `progress.md` — Phase 0 items 1–3 and D4

**Why:** Phase 0 could not proceed without a real workspace, pinned content, and an
answer on whether fumadocs-mdx builds under Next 16.3 with Cache Components. The
spike rendered `cache-components-model` at
`/en/concepts/nextjs/concepts/caching/cache-components-model`. All four exit
criteria passed: next dev 200 with article body; `next build` clean with Cache
Components enabled; article body present in
`apps/web/.next/server/app/en/concepts/nextjs/concepts/caching/cache-components-model.html`;
TOC headings extracted and matching the article (H1 plus What it is / Why the
default was inverted / The four answers / How it works under the hood / …).

`verify-submodules` was proven: appending a line under `content/nextjs` made the
script exit 1 (`M docs/evolution-ledger.md`); `git -C content/nextjs checkout --`
restored a clean pass.

**Invented decisions:**
- GitHub repo for the React corpus is `react-concepts`, not the session-1 prompt's
  `reactjs-concepts`. Mount stays `content/reactjs`.
- Fumadocs default schema requires `title`; corpus titles are H1s. Schema loosened
  to optional title + passthrough. Collection `files` restricted to the one spike
  article so templates/ledgers are not compiled.
- `fumadocs-mdx` 15.2.3 with `fumadocs-core` 16.14.4 — they version independently.
- TypeScript 5.9.3 (not 7), Nest 11.1.29 (not 11.2), ESLint 9.39.5 (not 10).
- Git hooks copied by a small installer rather than husky (no extra package).
- `build-catalog.mjs` records sources and markdown counts then exits 1 rather than
  emitting an empty `catalog.json`. Article adaptation is session 2.
- `agentRules: false` in next.config so Next 16.3 does not write apps/web/AGENTS.md
  over the repo-generated agent docs.
- Existing `packages/content-schema` and `packages/ui` kept; not replaced with empty stubs.
- No Prettier package; session 1 listed eslint + tsconfig only.
- Cloud agent branch `cursor/session-1-scaffold-e487` rather than `feat/…`.

**Known issues / next steps:**
- `auth`, `authz`, and `websec` are demo labs, not markdown corpora. Session 2 must
  decide adapter deletion. Report captured in `prompts/session-2.md`.
- Spike URL has an extra `concepts/` segment because the loader dir is
  `content/nextjs/docs/` (as specified). Roadmap URLs omit that extra segment.
- Shiki emits inline CSS variables on `<pre>` — styling is out of scope; tokens are
  not applied.
- CI `content` / `quality` jobs still call verify scripts that do not exist.
  Correct failure until session 2.
- Design tokens authored but unapplied. DNS cutover not done.

---

## Session 1 follow-up — schema corrected against the audit — 2026-08-16

**Branch:** `main`

**Files changed:**
- `packages/content-schema/src/common.ts` — `RepoId` cut to four; new `DemoSourceId`; `react-concepts` remote; confirmed default branches; `isDemoSource`
- `packages/content-schema/src/adapters/index.ts` — `auth`/`authz`/`websec` adapters deleted; `reactjs` -> `react`
- `packages/content-schema/src/adapters/shared.ts` — alias table, three-way `resolution` on refs
- `packages/content-schema/src/catalog.ts` — `demoTargets` in the link report
- `docs/adr/0002-demo-labs.md` — **new**, proposed
- `prompts/session-2.md` — rewritten for four corpora
- `prompts/session-1.md` — annotated as executed, with its two errors named
- `.cursor/rules/10/20/30`, `corpus-content-boundary`, `corpus-adapter` skills, `roadmap.md`, `.agents/summary.md`, `progress.md`, `AGENTS.md`

**Why:** The session 1 audit invalidated three assumptions at once. The React remote is
`react-concepts`, not `reactjs-concepts` — mount renamed to `react`, with the old spellings
kept as inbound aliases so existing cross-repo refs still resolve. Default branches are not
uniform and are now confirmed rather than assumed; D4 closed.

The significant one: `auth`, `authz`, and `websec` are runnable demo apps, not corpora. The
error was inferring content from a name — `-concepts` in the repo name, plus proximity to
the suite. Two signals pointed the other way and were under-weighted: the `demo-` prefix
describes what the repo *is*, and `demo-attacked-web` carries seven security alerts against
every sibling's one. The audit existed to catch this and did, which is the system working.

They are not simply deleted. A `related` ref pointing at one must resolve to something
recognisable and warn, or `verify-links` hard-fails on an unknown repo — so `DemoSourceId`
joins `PlannedRepoId`, and `ArticleRef` now carries a three-way `resolution` discriminator:
`article` fails when unresolved, `planned` and `demo` warn.

**Invented decisions:**
- Mount point `react` rather than keeping `reactjs`. It matches the remote, and changing it
  now is free because nothing is built. Aliases accept all four spellings.
- `DemoSourceId` as a distinct category rather than folding demo apps into `PlannedRepoId` —
  they are not unpublished corpora, they are a different kind of thing, and conflating them
  would misreport in the link gate.
- `ArticleRef.planned: boolean` replaced by `resolution: 'article' | 'planned' | 'demo'`. A
  boolean could not express three states, and a second boolean would allow an illegal
  combination.
- ADR-0002's recommendation: deploy the demo labs and iframe them under `/en/demos/*`,
  matching ADR-0001, and **remove them as submodules**.
- ADR-0002's security precondition — `demo-attacked-web` is deliberately vulnerable and must
  not share the `.nxhhuy.tech` cookie domain. Logged as D10.
- Session 2 task 1 corrects PR #1 before merge rather than landing seven submodules and
  removing three afterwards.

**Known issues / next steps:** PR #1 still carries three submodules that should not exist.
The four adapter specs remain unverified against real files — session 2 task 2 is the audit
that settles them. ADR-0002 is `proposed` and needs a decision before Phase 1 item 13.

---

## Session 2 — adapters against reality, section extraction, catalog builder, gates — 2026-08-16

**Branch:** `cursor/session-2-adapters-catalog-c932`

**Files changed:**
- `docs/audit/frontmatter-2026-08-16.md` — new. The task-2 audit report: per-repo file
  counts, distinct frontmatter keys, distinct `status`/`difficulty`/`*_baseline` values,
  and every adaptation failure grouped by reason, for all four mounted corpora
- `packages/content-schema/src/adapters/types.ts` — `RepoAdapter.include` replaced with
  `conceptsRoot` / `recipesRoot` / `excludeDirs`
- `packages/content-schema/src/adapters/factory.ts` — `AdapterSpec` updated to match;
  `title` now derived via `deriveTitle`; `status` passed through as `string | object`
- `packages/content-schema/src/adapters/shared.ts` — `deriveTitle()` (H1 fallback),
  `isIndexFile()`, `normaliseStatus()` widened to accept the object form observed in
  `react`/`nestjs`/some `angular` recipes; unused `RepoId` import removed
- `packages/content-schema/src/adapters/index.ts` — all four specs corrected:
  `nextjs`/`angular` keep `docs/concepts` + `docs/recipes`; `react`/`nestjs` switch to
  `conceptsRoot: null` (repo-root category scan) + `recipesRoot: 'recipes'`; `nestjs`
  additionally excludes `demos`/`prompts`/`scripts`
- `packages/content-schema/src/sections.ts` — new. `extractSections()`: parses the body
  as an mdast tree (`unified` + `remark-parse` + `remark-gfm`), visits `##`/`###` heading
  nodes, slugifies with GitHub's own algorithm, dedupes repeated anchors with `-1`/`-2`
- `packages/content-schema/src/index.ts` — exports `./sections.js`
- `packages/content-schema/package.json` — added `mdast-util-to-string`, `remark-gfm`,
  `remark-parse`, `unified`, `unist-util-visit`; `@types/mdast` devDependency
- `scripts/lib/corpus-fs.mjs` — new. Shared fs helpers: `.gitmodules` parsing, submodule
  tag/commit lookup, recursive markdown listing, `selectArticleFiles()` (applies
  `conceptsRoot`/`recipesRoot`/`excludeDirs`/`index.md`-exclusion), `sha256`,
  `groupByReason` / `printGroupedFailures`
- `scripts/lib/adapt-all.mjs` — new. The single "walk four submodules, adapt every
  selected file" loop, shared by `build-catalog.mjs` and `verify-frontmatter.mjs`
- `scripts/lib/link-report.mjs` — new. `buildLinkReport()`: resolves every `related` ref
  against the full article set into `LinkReport`'s five buckets; shared by
  `build-catalog.mjs` and `verify-links.mjs`
- `scripts/lib/curation.mjs` — new. `loadPathDefinitions()`: reads and validates
  `curation/paths/*.yaml` against `PathDefinition`
- `scripts/audit-frontmatter.mjs` — new. Task-2 deliverable; walks every `.md` file,
  reports selection/adaptation outcomes, writes `docs/audit/frontmatter-<date>.md`
- `scripts/build-catalog.mjs` — replaced the session-1 stub with a real implementation:
  adapt -> resolve links -> load paths -> emit `catalog.json`. Refuses to write on any
  adaptation failure, any unresolved/draft `related` ref, or a path referencing a
  missing/draft article
- `scripts/verify-frontmatter.mjs` — new. Every selected file must adapt cleanly
- `scripts/verify-links.mjs` — new. Zero fatal unresolved refs; zero draft targets
  outside `SHOW_DRAFTS`; planned/demo targets warn
- `scripts/verify-catalog.mjs` — new. Validates the built `catalog.json`: schema, no
  duplicate uid, no path item pointing at a missing/draft article, no article landed in
  the folder-inference `root` fallback
- `scripts/verify-submodules.mjs` — now fails unless `.gitmodules` lists exactly the four
  expected mount paths (`content/nextjs`, `content/react`, `content/angular`,
  `content/nestjs`), not merely "at least one, all clean"
- `package.json` — added `gray-matter`, `yaml` (dependencies) and `tsx`
  (devDependency); new scripts `audit:frontmatter`, `verify:frontmatter`,
  `verify:links`, `verify:catalog`; `build:catalog` now runs via `tsx`
- `pnpm-lock.yaml` — lockfile for the new dependencies
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — current-state and key-facts updates
- `progress.md` — Phase 0/1 item statuses, Debt D2/D3 marked closed, new Debt D11
- `prompts/session-3.md` — new. Authored to close this session

**Why:** Task 1 (dropping the `auth`/`authz`/`websec` submodules) had already landed on
`main` in the session-1 follow-up commit, so this session started from task 2: run the
four adapters, authored from each corpus's own `roadmap.md`/`progress.md` conventions,
against the real files. The audit found the specs wrong in three independent ways, not
one:

1. **Directory shape.** `nextjs` and `angular` wrap articles in `docs/concepts` and
   `docs/recipes`. `react` and `nestjs` do not — concept categories are top-level
   directories in the repo root, and recipes live at a top-level `recipes/<category>/`.
   The original `include` globs assumed the `docs/` wrapper everywhere, so `react` and
   `nestjs` matched **zero** files each, despite carrying 73 and 19 real articles
   respectively. `RepoAdapter` was redesigned around `conceptsRoot` (nullable — `null`
   means "scan the repo root's own top-level directories, excluding recipes and a short
   exclude list") specifically so a *new* concept category added upstream is picked up
   automatically rather than silently dropped, matching the same
   loud-failure-over-silent-gap discipline the corpus already holds for required fields.
2. **`title` does not exist in frontmatter anywhere.** Zero articles across all four
   corpora carry a `title` key — every one relies on the body's H1, the same finding
   session 1 made for fumadocs' schema. `deriveTitle()` prefers an explicit frontmatter
   title (so a corpus can opt back in) and falls back to the first `# ` heading, throwing
   only when neither exists.
3. **`status` is not always a string.** `nextjs`/`angular` concepts write a plain string
   (`draft`, `review`, `needs-upgrade`); `react`/`nestjs` concepts and some `angular`
   recipes write an object (`{ drafted, reviewed }` or `{ upgraded, reviewed }`). Rather
   than guess that `reviewed: true` means "complete" — an invented semantic the corpus
   never documented — every object shape collapses to `draft` unconditionally, the same
   safe direction the string form already used for unrecognised values.

A genuine corpus gap surfaced during the audit, not an adapter bug: **14 articles in
`react-concepts`** have neither a frontmatter `title` nor any `# ` H1 in the body at all
(`concurrent/actions.md`, `concurrent/concurrent-rendering.md`, `concurrent/suspense.md`,
`concurrent/use-and-promises.md`, `ecosystem/data-fetching-tanstack-query.md`,
`ecosystem/routing-react-router.md`, `ecosystem/state-management-landscape.md`,
`ecosystem/styling-approaches.md`, `ecosystem/testing.md`, `forms/forms-at-scale.md`,
`server/server-components.md`, `server/ssr-and-hydration.md`,
`recipes/data-fetching/strictmode-double-mount.md`,
`recipes/data-fetching/request-waterfall.md`). Per the content boundary, this is not
fixed here — it is reported (new Debt D11) for a corpus-side PR and re-tag.

Section extraction (task 4) parses the body as a real mdast tree rather than scanning
lines for `^#`, specifically because several articles (confirmed:
`nextjs/docs/concepts/**`, `react/rendering/rendering-lists-and-keys.md`, and others)
contain fenced code blocks with shell/Python comment lines that themselves start with
`# ` — a regex scanner would misread those as headings; `visit(tree, 'heading', ...)`
never descends into `code` nodes. The GitHub slug algorithm (lowercase, strip everything
but word characters/hyphen/space, turn each remaining space into a hyphen — critically
*not* collapsing runs of spaces first) was verified against real anchors already
authored and depended upon in `react-concepts`: `` `The `try/catch` redirect, paid` ``
-> `the-trycatch-redirect-paid`, `` `React 19's root-level reporting` `` ->
`react-19s-root-level-reporting`, and `` `Stage 4 — the stale-chunk case` `` (em dash
between two spaces) -> `stage-4--the-stale-chunk-case`, matching the corpus's own doubled
hyphen exactly.

The catalog builder (task 5) and its three verify gates (task 6) are fully implemented
and share their core logic (`adapt-all.mjs`, `link-report.mjs`) rather than each
re-walking the corpora independently, so the gates and the artifact they check can never
silently disagree about what counts as an article or a resolved link. Every gate was
proven against the real, current repository state: `verify-submodules` passes (4 pinned,
clean); `verify-frontmatter`, `build-catalog`, and `verify-links` all correctly **fail**,
because every one of the 196 selected files across the four corpora is missing
`description` (Debt D5 — the Q1 pass is explicitly out of scope for this session) and 14
of them are also missing a derivable title (the new D11). `verify-catalog` was proven
against synthetic fixtures (not committed) covering all four of its checks — duplicate
uid, a path referencing a missing article, a path referencing a draft article (both with
and without `SHOW_DRAFTS=1`), and the `root`-folder sentinel — since no real catalog can
build yet to exercise it against. This is the correct, expected state, not a regression:
D5 already tracked "build fails on every article until the pass runs" before this session
started, and the description pass is content authoring that belongs in the corpus repos,
never invented here.

**Invented decisions:**
- `RepoAdapter.conceptsRoot: string | null` (root-scan mode) plus `excludeDirs`, replacing
  the glob-pattern `include: string[]`. No spec dictated this shape; it was chosen so a
  newly added concept-category directory in `react`/`nestjs` is discovered automatically
  rather than needing a matching adapter edit, on the theory that a silently-invisible new
  article is a worse failure mode than none.
- The universal `index.md` exclusion (`nextjs/docs/recipes/index.md` is a hand-authored
  listing page, not an article) applied by filename across all four corpora uniformly,
  rather than as a one-off carve-out for that single file.
- Object-shaped `status` collapses to `draft` **unconditionally**, with no attempt to read
  `reviewed: true` as "complete" — deliberately not inferring meaning for an undocumented
  field shape, even though a `reviewed` key reads suggestively.
- `deriveTitle()` prefers an explicit frontmatter `title` over the H1 if both exist (no
  corpus file currently has both, but this keeps a future corpus's opt-in cheap).
- `gray-matter`, `yaml`, and `tsx` added as new npm dependencies (root); `unified`,
  `remark-parse`, `remark-gfm`, `unist-util-visit`, `mdast-util-to-string`, and
  `@types/mdast` added to `packages/content-schema`. All five are explicitly named or
  strongly implied by `prompts/session-2.md` itself ("parses frontmatter with
  `gray-matter`", "walks the MDX AST") rather than being independently chosen tooling.
- `verify-submodules.mjs`'s expected-mount list is a hand-maintained literal, not an
  import from `RepoId` — it runs from the pre-commit hook via plain `node`, with no
  TypeScript loader, and must stay dependency-free.
- `catalog.json`'s `paths` validation lives in `build-catalog.mjs` itself rather than a
  separate `verify-paths.mjs` — `prompts/session-2.md` scoped path-item validation under
  `verify-catalog.mjs` ("no path item pointing at a missing or draft article"), and
  `build-catalog` needs the identical check before it can safely write the artifact, so
  duplicating it as a fifth script would only invite drift.
- `docs/audit/frontmatter-2026-08-16.md` is regenerated in place (not append-only) by
  re-running `pnpm audit:frontmatter` after the task-3 adapter corrections, since the
  session-2 prompt frames the audit as evidence to correct adapters against, not a diary —
  the committed file reflects the corrected adapters, with the pre-correction findings
  (react/nestjs matching zero files) preserved in this log entry and the PR description
  instead.

**Known issues / next steps:**
- **Debt D5 (blocking, pre-existing):** every one of the 196 currently-selectable articles
  fails `verify-frontmatter` / `build-catalog` / `verify-links` on missing `description`.
  Nothing renders and no catalog exists until `prompts/corpus-description-pass.md` runs in
  each of the four corpus repos and they cut new tags.
- **New Debt D11 (blocking a subset):** 14 `react-concepts` articles have no title at all
  (frontmatter or H1) — listed above. Needs a corpus-side PR adding an H1 to each, then a
  re-tag; tracked so it does not silently disappear into the D5 noise once descriptions
  land.
- `docs/adr/0002-demo-labs.md` remains `proposed`; deploying/embedding the demo labs is
  still out of scope pending that decision.
- `curation/paths/` and `curation/overrides/` do not exist yet — `build-catalog.mjs`
  handles an absent `curation/` directory as zero paths, which is correct for now but
  untested against a real path definition (no fixture was committed; sanity-tested only
  via the synthetic, discarded scratch script noted above).
- `verify-sidecars.mjs` remains deferred per the session prompt — no sidecar files exist.

---

## Session 2 follow-up — deriveTitle reads headings, not lines — 2026-08-16

**Branch:** `cursor/fix-derive-title-mdast-15ee`

**Files changed:**
- `packages/content-schema/src/sections.ts` — new `parseArticleBody()` (the shared parse)
  and `findTitleHeading()` (first depth-1 heading among the tree's top-level children);
  `extractSections()` now accepts `string | Root`
- `packages/content-schema/src/adapters/shared.ts` — `deriveTitle()` takes `string | Root`
  and delegates to `findTitleHeading()`; the regex is gone; error message names the three
  shapes that are not headings
- `packages/content-schema/src/adapters/types.ts` — `AdapterInput.tree?: Root`
- `packages/content-schema/src/adapters/factory.ts` — passes `input.tree ?? input.body`
- `packages/content-schema/test/derive-title.test.ts` — new; eleven tests
- `packages/content-schema/package.json` — `test` script; `gray-matter` and `tsx` declared
  as devDependencies (both already in the lockfile at these versions)
- `pnpm-lock.yaml` — the two devDependency declarations
- `scripts/lib/adapt-all.mjs` — parses each body once, passes the tree to both
  `extractSections()` and `adapter.toArticle()`
- `docs/audit/frontmatter-2026-08-16.md` — regenerated
- `prompts/corpus-description-pass.md` — the skip list is 15 articles, not 14, and names
  why `rendering/react-compiler-deep-dive.md` looks like it has an H1 and does not
- `prompts/session-3.md` — Track A step 2's D11 count corrected to 15
- `progress.md` — Debt D11 corrected to 15 with the new file named; Phase 1 items 6 and 6b
  annotated; session log entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — the D11 count and the title-derivation key fact
- `.agents/SESSION-LOG.md` — this entry

**Why:** `deriveTitle()` matched `/^#\s+(.+)$/m` against the raw article body. That is a
line scanner, and markdown is not a line-oriented format: a fenced code block, an indented
code block, and a blockquote can all contain a line that begins `# ` without any of them
being a heading. The confirmed case is `react/rendering/react-compiler-deep-dive.md`,
which has no H1 anywhere and was being titled `TypeScript projects also need the Babel
core types:` — a shell comment inside an `npm i -D @rolldown/plugin-babel` fence. The
failure mode is the one the adapter discipline exists to prevent: a missing required field
silently satisfied by a plausible-looking wrong value, rather than thrown.

The irony is that the fix already existed twenty lines away. `extractSections()` was
written in session 2 against exactly this hazard, with a doc comment naming fenced `# `
comment lines as the reason it walks an mdast tree instead of scanning lines. Title
derivation simply never got the same treatment. It does now, and it shares
`extractSections()`'s parse rather than adding a second one: `adapt-all.mjs` calls
`parseArticleBody()` once per file and hands the tree to both.

`findTitleHeading()` considers only the tree's **top-level** children, which is a stronger
rule than "not inside a code node" and is what excludes the blockquote case — a `heading`
node nested in a blockquote or a list item is reachable from a full `visit`, and quoting
someone else's H1 does not retitle this article. `extractSections()` deliberately keeps
its full-tree walk, because GitHub does emit an anchor for a nested `##` and those anchors
are real link targets; the asymmetry is commented in both places so a later pass does not
"unify" them.

Re-running the audit moved Debt D11 from 14 articles to 15. The 15th is the file above:
it was never a fourteen-article problem, it was a fifteen-article problem with one article
hidden behind a false positive.

**Invented decisions:**
- **Top-level-children-only, rather than a full `visit` that skips `code` nodes.** The
  session prompt named the blockquote case but not the mechanism. Filtering `code` alone
  would not have excluded a blockquote heading; restricting to the document's own top
  level excludes fenced code, indented code, blockquotes, list items, and footnote
  definitions in one rule with no exclusion list to maintain.
- **Derived titles are now plain text, not raw markdown.** `mdastToString` strips inline
  markup, so six real titles lose backticks they previously carried — e.g.
  `` `mutateAsync` crashes the page — or nested `onSuccess` hell blocks a multi-step
  signup `` becomes `mutateAsync crashes the page — or nested onSuccess hell blocks a
  multi-step signup`. `Article.title` is a plain string feeding `<title>`, OG tags, and
  the sidebar, so markdown syntax in it was a leak. If the article `<h1>` should render
  the code formatting, that wants a separate field rather than raw syntax in this one.
  Full diff of the change: 189 titles identical, 6 text-only changes, 1 title lost (the
  bug), 0 gained.
- **`AdapterInput.tree` is optional.** Making it required would force
  `audit-frontmatter.mjs`, which extracts no sections, to parse solely to satisfy the
  type — there is no second parse there to share.
- **Two of the five required test cases use synthetic fixtures**, marked `SYNTHETIC:` in
  the test names and explained in a comment. A search across all four mounted corpora
  found no article containing an indented-code `# ` line or a `> #` blockquote heading;
  the only matches anywhere under `content/` are `nestjs/prompts/scaffold-repo.md` and
  `nextjs/prompts/session15-corrections.md`, neither of which any adapter selects. Both
  cases are still reachable markdown the old scanner would have misread, so they are
  covered rather than dropped — but they are not corpus coverage and are not labelled as
  such. Setext H1 is synthetic for the same reason: no corpus file uses the form.
- **`node:test` + `tsx` as the test runner**, rather than adding Vitest or Jest. Both are
  already installed, CI already runs `pnpm test`, and installing a test framework is a
  stop-and-ask item. `gray-matter` and `tsx` are now declared in
  `packages/content-schema`'s devDependencies rather than resolved from the root by
  hoisting; both are the same versions already in the lockfile.
- **Tests are not typechecked.** `tsconfig.json` still includes `src/**/*.ts` only, since
  compiling `test/` needs `@types/node`, which this package does not depend on and which
  would be a new dependency plus a Node-major choice (22 vs 24 are both in the store).
  `tsx` strips types at run time, so the tests run but are not type-verified.

**Known issues / next steps:**
- Debt D5 is untouched and still blocking: 58 `react` articles and 173 more across the
  other three corpora fail on missing `description`. `verify:frontmatter`,
  `build-catalog`, and `verify:links` still correctly fail.
- Debt D11 is now 15 articles and still needs a corpus-side PR in `react-concepts` adding
  an H1 to each, then a re-tag. `rendering/react-compiler-deep-dive.md` is the addition.
- The corpus assertions in `derive-title.test.ts` are pinned to submodule content. When
  `react-concepts` lands the D11 fix and this repo bumps the pointer, the two "no title"
  tests will fail by design — that promotion PR should update them rather than delete
  them, and `angular/docs/concepts/reactivity/signals.md` and
  `nextjs/docs/recipes/index.md` carry the same exposure for the positive cases.
- Adding `@types/node` to `packages/content-schema` would let the tests be typechecked. It
  is a one-line change gated on the dependency stop-and-ask.

---

## Session 2 follow-up b — the tests are typechecked — 2026-08-16

**Branch:** `cursor/fix-derive-title-mdast-15ee`

**Files changed:**
- `packages/content-schema/package.json` — `@types/node` `^22.19.0` added as a
  devDependency
- `packages/content-schema/tsconfig.json` — `include` extended to `test/**/*.ts`;
  `types: ["node"]` so the Node globals the tests use are declared rather than picked up
  by whatever `@types` package happens to be in scope
- `packages/content-schema/README.md` — new "Tests and typechecking" section recording
  why the `@types/node` major is 22 and not 24
- `pnpm-lock.yaml` — the new devDependency; resolves to `22.20.1`, the copy `apps/web`
  already pulls in
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — new key fact on the `@types/node` major
- `progress.md` — Phase 1 item 6 note; session log entry

**Why:** The previous entry closed with the tests running but not type-verified: `tsx`
strips types at run time, so `test/derive-title.test.ts` could have referenced a function
that no longer exists, or passed the wrong argument shape, and still have been reported as
passing until the assertion itself failed. `tsconfig.json` now includes `test/`, which
needs `@types/node` because the tests read the corpus off disk (`node:fs`, `node:path`,
`node:url`, `node:test`).

The major is the whole decision. `@types/node` describes a runtime, and this package has
two: `apps/web` runs Node 22 and `apps/api` runs Node 24 — a deliberate divergence
following each corpus's own baseline. Typing a shared package against the **lower** of its
consumers is the only direction that is safe, because the type set is then a subset of
what both runtimes provide, and anything that typechecks here runs on both. Typing against
24 inverts that: a Node-24-only API would typecheck cleanly and then fail at run time on
web, which is the failure this gate exists to catch. Verified rather than assumed — the
global `URLPattern` (stable in Node 24) compiles against `@types/node` 24.13.3 and fails
with `TS2304: Cannot find name 'URLPattern'` against 22.20.1.

**Invented decisions:**
- **The spec is `^22.19.0`, not a bare `^22`.** It matches `apps/web`'s existing spec
  exactly, so pnpm resolves one `22.20.1` rather than risking two entries in the lockfile
  that drift apart. Still within the `^22` the task specified.
- **`types: ["node"]` was added alongside the `include` change.** Without an explicit
  `types` array TypeScript auto-includes every `@types` package it can reach, so the
  program's global scope would depend on hoisting rather than on this package's own
  manifest. `@types/mdast` is unaffected — it is imported by module name, which the
  `types` array does not govern.
- **The reasoning is recorded in `README.md` as well as here.** `package.json` cannot
  carry a comment, and "why 22 and not 24" is exactly the constraint a later dependency
  bump would otherwise erase without noticing.

**Known issues / next steps:**
- Nothing in `src/` needs Node types today; only the tests do. If that stays true, a
  separate `tsconfig.test.json` would keep Node globals out of `src`'s scope entirely.
  One tsconfig was kept because two configs for a package with one source directory and
  one test file is the more expensive mistake.
- Debt D5 and Debt D11 are untouched. `verify:frontmatter` still fails on 183 articles
  missing `description` and the 15 with no derivable title.
- When `apps/web` moves off Node 22, this pin moves with it — not before.

---

## Session promote-content — nextjs v0.3.0 — 2026-08-16

**Branch:** `cursor/promote-nextjs-v0.3.0-6413`

**Files changed:**
- `content/nextjs` — gitlink bumped from `v0.2.0` (`d9ae31d`) to `v0.3.0` (`ad28950`)
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this promotion
- `.agents/summary.md` — D5 no longer universal; nextjs pin recorded
- `progress.md` — item 16 / Debt D5 scoped to the three remaining corpora

**Why:** `nextjs-concepts` tagged `v0.3.0` after adding the required `description`
frontmatter key to all ten articles (9 concepts + 1 recipe). That is the Q1 dek pass
tracked as Debt D5, run in the corpus repo rather than invented here. Bumping the
gitlink is how this site consumes it. No article body changed, so `content_hash`
(sha256 of the body after frontmatter) is unchanged on every nextjs article. No
articles were added, removed, or renamed, and no `article_id` moved.

`verify-frontmatter` / `build-catalog` / `verify-links` still fail, correctly, on the
other three corpora: 73 `react` + 94 `angular` + 19 `nestjs` = 186 remaining
adaptation failures (171 missing `description`, 15 also Debt D11 untitled). The
catalog still cannot be written. That is expected until those repos cut equivalent
tags.

**Invented decisions:**
- Branched `cursor/promote-nextjs-v0.3.0-6413` rather than the skill's
  `content/nextjs-v0.3.0`, because the cloud-agent branch policy requires
  `cursor/<slug>-6413`.
- Did not regenerate `docs/audit/frontmatter-2026-08-16.md` — it is session-2
  evidence dated that day, not a live dashboard.
- Did not run `pnpm verify:code-blocks` — that script is not in `package.json`.
- Logged this as `Session promote-content` rather than inventing a session number;
  it is a skill invocation, not a `prompts/session-N.md` run.

**Known issues / next steps:**
- Hash-invalidation for the ten nextjs articles is the user's call. Body hashes are
  unchanged; the only edit is one added frontmatter line per article.
- Debt D5 remains open on `react-concepts`, `angular-concepts`, and
  `nestjs-concepts`. Promote those separately, one submodule per PR.
- All ten nextjs articles still adapt as `status: draft` (pre-existing). They will
  not ship in production until the corpus marks them complete.
- Do not auto-merge this PR.
## Session promote-content — react v0.5.0 — 2026-08-16

**Branch:** `cursor/promote-react-v0.5.0-a7bb`

**Files changed:**
- `content/react` — gitlink `react-concepts@v0.4.0` (`6989ea0`) → `@v0.5.0` (`daf5b56`)
- `packages/content-schema/src/adapters/index.ts` — react `excludeDirs: ['prompts']`; nestjs comment updated
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this promotion
- `.agents/summary.md` — react pin, D5/D11 remaining counts, planned next steps
- `progress.md` — Phase 1 items 7/7b/16, Debt D5, session log

**Why:** `react-concepts` tagged `v0.5.0` with `description` on 58 titled articles (the
Q1 pass; 15 D11 files skipped because they have no H1). Promoting the gitlink is how
that field reaches `corpus-web`. The 58 bodies are byte-identical to `v0.4.0`, so
`content_hash` (sha256 of the body) does not change and reader completion must not be
invalidated.

`v0.5.0` also added `prompts/description-pass.md`. The react adapter uses
`conceptsRoot: null` (repo-root scan), so that directory would have been selected as a
concept category. Excluding `prompts/` matches the nestjs adapter and is an adapter
correction, not a corpus edit.

**Invented decisions:**
- Branch named `cursor/promote-react-v0.5.0-a7bb` rather than the skill's
  `content/react-v0.5.0`, because this cloud-agent environment requires the
  `cursor/<slug>-a7bb` template
- `excludeDirs: ['prompts']` on the react adapter — the skill does not mention adapter
  edits; without it the prompt file would fail adaptation as a fake article
- Did not regenerate `docs/audit/frontmatter-2026-08-16.md` — that file is the session 2
  audit artifact; current counts live in this entry, summary, and progress
- Skipped `pnpm verify:code-blocks` — the script is named in the promote-content skill
  but does not exist in this repo yet
- Opened the PR while `verify-frontmatter` / `build-catalog` / `verify-links` /
  `verify-catalog` still fail. That is the pre-existing D5 (other three corpora) plus
  D11 (15 untitled react articles), not a regression from this pin. 58 react articles
  now adapt; previously zero did

**Known issues / next steps:**
- Catalog still cannot build: 123 missing `description` (10 nextjs, 94 angular, 19
  nestjs) and 15 react articles with no title (Debt D11, same list as before)
- Promote `nextjs` / `angular` / `nestjs` when they cut description tags
- D11 still needs a corpus-side PR in `react-concepts` adding an H1 to each of the 15,
  then a re-tag. The derive-title tests that assert those files have no title will fail
  by design on that promotion
## Promote-content — angular v0.3.0 — 2026-08-16

**Branch:** `cursor/content-angular-v0.3.0-55e8`

**Files changed:**
- `content/angular` — gitlink `v0.2.0` (`01a0c3d`) → `v0.3.0` (`278f76a`)
- `docs/audit/frontmatter-2026-08-16.md` — regenerated against the new pin
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this promotion
- `.agents/summary.md` — angular pin, D5 remainder, planned next steps
- `progress.md` — item 16 / Debt D5 status after the angular pass

**Why:** `angular-concepts` tagged `v0.3.0` for the Q1 `description` frontmatter pass
(PR #2: "docs: add description frontmatter to all articles"). Promotion is a pointer
bump only — no file under `content/` was edited from this repo. The tag adds one
`description:` line to 93 selected articles and a corpus-side `prompts/description-pass.md`;
article bodies, `article_id` / `recipe_id` values, and `contentHash` (sha256 of the
gray-matter body) are unchanged across every selected file.

After the pin, 93 of 94 selected angular articles adapt. The leftover is
`docs/recipes/elements/widget-deployment.md`, which still has no `description`. That
is a corpus miss, not an adapter bug, and is not patched here. Catalog build remains
blocked on Debt D5 in `nextjs` / `react` / `nestjs` plus this one angular file.

**Invented decisions:**
- Branch named `cursor/content-angular-v0.3.0-55e8` rather than the skill's
  `content/angular-v0.3.0`, to satisfy the cloud-agent branch template while keeping
  the promotion identity in the slug.
- `verify:code-blocks` was not run — the script is not in `package.json` yet.
- `docs/audit/frontmatter-2026-08-16.md` regenerated in place so the committed audit
  matches the new pin, same as session 2's "evidence, not a diary" rule.
- No `prompts/session-N+1.md` was authored — this was a `/promote-content` skill
  invocation, not a numbered session from `prompts/session-N.md`.
- Content gates (`verify:frontmatter`, `build:catalog`, `verify:links`,
  `verify:catalog`) still fail for pre-existing D5 on the other three corpora plus
  the one leftover angular recipe. The promotion is committed anyway; those failures
  are not caused by this pin and cannot be fixed in this repo.

**Known issues / next steps:**
- `docs/recipes/elements/widget-deployment.md` still lacks `description`. Its H1 is
  `Input Coercion: built-in transforms and CDK utilities`, which does not match the
  filename. Fix in `angular-concepts`, cut a new tag, then promote again.
- Debt D5 remains blocking for `nextjs` (10), `react` (58 missing description + 15
  D11), and `nestjs` (19). `catalog.json` still cannot be written.
- Content-hash invalidation: **no hashes changed.** The user still owns that call;
  there is nothing to invalidate.
## Session promote-nestjs-v0.3.0 — pin nestjs-concepts to v0.3.0 — 2026-08-16

**Branch:** `cursor/promote-nestjs-v030-6ac3`

**Files changed:**
- `content/nestjs` — gitlink bumped from `v0.2.0` (`1493917`) to `v0.3.0` (`a9b2c8b`)
- `docs/audit/frontmatter-2026-08-16.md` — regenerated; nestjs 19/19 now adapt
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this promotion
- `.agents/summary.md` — nestjs pin, D5 no longer universal, planned next steps
- `progress.md` — D5 narrowed; new Debt D12; session log line

**Why:** `nestjs-concepts` tagged `v0.3.0` with the Q1 `description` frontmatter pass
across all 19 articles (one insertion per file, no body edits). This repo consumes
content as a tag-pinned submodule, so the pin has to move here before those deks can
adapt. The other three corpora are unchanged, so `build-catalog` still cannot write
`catalog.json`.

**Invented decisions:**
- Branch named `cursor/promote-nestjs-v030-6ac3` to satisfy the cloud-agent prefix
  rather than the skill's `content/<repo>-<tag>` form
- Regenerated `docs/audit/frontmatter-2026-08-16.md` even though `/promote-content`
  does not list it — the nestjs section would otherwise still claim 19 missing
  `description`s
- Skipped `pnpm verify:code-blocks` — the script is not in `package.json` yet
- Recorded nestjs's missing `validation/dtos-and-class-validator.md` as Debt D12
  here (the corpus tracker calls it D13) so `verify-links` does not surprise us
  the moment D5 clears on the other three corpora
- Session log id `promote-nestjs-v0.3.0` rather than a sequential session number —
  this is a content promotion, not a `prompts/session-N.md` work session

**Known issues / next steps:**
- `content_hash` is sha256 of the body after frontmatter strip, so all 19 hashes
  are unchanged. No completion-invalidation decision is needed.
- `verify-frontmatter` / `build-catalog` / `verify-links` still fail on 177
  articles in the other three corpora (D5 + D11). Expected.
- Once nestjs is the only corpus in a catalog build, `verify-links` will still
  fail: every nestjs article has object-shaped `status` which this adapter
  collapses to `draft`, and ~33 `related` refs point at unpublished files
  (queued recipes/concepts plus D12).
- Do not auto-merge this PR.

---

## Session 2 follow-up c — the catalog emits with exclusions — 2026-08-16

**Branch:** `cursor/catalog-emit-with-exclusions-e8aa`

**Files changed:**
- `packages/content-schema/src/catalog.ts` — new `CatalogFailure` schema (`repo`,
  `sourcePath`, `reason`) and a required `failures` array on `Catalog`; the doc comment
  states the emit-with-exclusions contract and where the gate now lives
- `scripts/build-catalog.mjs` — an adaptation failure is a warning and an exclusion, not
  an abort; the failure list travels into `catalog.failures`; the summary line reports
  the excluded count
- `scripts/verify-catalog.mjs` — new check: a non-empty `catalog.failures` exits 1,
  printed grouped by reason
- `prompts/session-3.md` — Track A step 4 no longer implies `build:catalog`'s exit code
  is the adaptation verdict
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — the catalog's new emit-with-exclusions behaviour as a key fact
- `progress.md` — Phase 1 items 7 and 7b annotated; session log entry

**Why:** `build-catalog.mjs` was all-or-nothing: one unadaptable file and it wrote
nothing. That coupling is wrong in both directions. It makes a small number of authoring
gaps — 16, against ~180 finished articles — hold the entire artifact hostage, and it
does so on a distinction the pipeline does not otherwise make. A `draft` article is
already excluded from what ships without failing anything; an article that cannot adapt
is the same kind of thing, an article that is not ready, and it now gets the same
treatment.

Nothing is hidden by the change, which is the part that matters. The exclusions travel
inside the artifact rather than only in a build log, so anything reading `catalog.json`
can see exactly which files are missing and why. `verify-catalog` exits 1 while that
array is non-empty, and `verify-frontmatter` still fails on the source content
unconditionally, so CI is exactly as red as it was before. What changed is that a
partial catalog now exists to develop routes and chrome against, instead of nothing.

Proven end-to-end against a synthetic four-corpus fixture (not committed — no real
catalog can build until Debt D5 lands, and the two failure modes needed to be exercised
in isolation): seven articles, two deliberately broken (one missing `description`, one
with its only `# ` line inside a code fence). `build-catalog` exited 0, wrote five
articles and the two exclusions; `verify-catalog` exited 1 and named both; deleting the
two broken files and rebuilding gave five articles, zero exclusions, and a clean
`verify-catalog`.

**A finding that outlives this change.** With a synthetic `description` injected to
simulate the post-Q1-pass corpus, 181 of 196 articles adapt and 15 fail — but
`build-catalog` still would not write, because the link report is separately fatal: 128
`related` refs are unresolved and 278 point at draft articles. 79 of the unresolved refs
point at the 15 excluded articles; the other 49 point at articles that exist in no
corpus at all (`nestjs/nest-cant-resolve-dependencies`, `nestjs/dynamic-modules`,
`nextjs/use-cache-directive`, and 20 more targets). So this change is necessary for the
16-blocks-180 problem and not sufficient on its own. Extending the same
emit-with-exclusions treatment to unresolved and draft-target refs was deliberately NOT
done here — it is a semantic change to `verify-links` and `.cursor/rules/30`'s
"cross-repo links hard-fail here" rule, and that is a decision to take explicitly rather
than fold into this one.

**Invented decisions:**
- **`schema` stays at `1` rather than bumping to `2`.** Adding a required field is a
  shape change, and the literal exists precisely to mark those. It was left alone because
  no catalog of shape v1 has ever been produced — `build-catalog` has never successfully
  written the file, and the artifact is gitignored and rebuilt from scratch on every
  build, so there is no v1 reader or v1 copy anywhere for the number to distinguish
  against. Bump it the first time a real consumer exists.
- **`failures` is required, not optional.** An optional array would let a consumer read
  a catalog and not know whether "no failures" meant a clean corpus or an old builder.
- **`CatalogFailure` carries no `uid`.** Adaptation is what produces a uid, and every
  entry is a file that did not get that far; `sourcePath` is its only stable identity.
  It would be derivable from the filename slug in most cases, and inventing one for a
  file whose frontmatter never validated is exactly the plausible-wrong-value failure
  the adapters throw to avoid.
- **`build-catalog` exits 0 when it excludes.** Otherwise the exit code carries the same
  all-or-nothing meaning the change was made to remove, and a non-zero exit alongside a
  successfully written artifact is the more confusing signal of the two.
- **The zero-articles refusal is kept.** Emitting a catalog with no articles is not a
  partial build, it is a broken one.
- **The exclusion report prints to stderr and is grouped by reason**, reusing
  `printGroupedFailures`. Sixteen flat lines would bury the single-instance problems.
- **`prompts/session-3.md` Track A step 4 was corrected** rather than left to mislead —
  it told a future session to read `build:catalog`'s exit code as the adaptation verdict,
  which is now false. Factual correction only; no prose was invented.

**Known issues / next steps:**
- The link report is the remaining blocker on a real `catalog.json` — see the finding
  above. Needs an explicit decision before Track A of session 3 can produce an artifact.
- `verify-catalog` runs in CI (`.github/workflows/ci.yml`, `content` job) with no
  `build:catalog` step before it, so it currently fails on a missing `catalog.json`
  rather than on the catalog's contents. Wiring that is a CI gate configuration change
  and is a stop-and-ask item; flagged, not done.
- Debt D5 and Debt D11 are untouched. Against the real corpus `pnpm build:catalog` still
  exits 1 — now on the zero-articles refusal rather than on the failure list, since all
  196 selected files fail.

---

## Session 2 follow-up d — the link report is classified four ways — 2026-08-16

**Branch:** `cursor/catalog-emit-with-exclusions-e8aa`

**Files changed:**
- `packages/content-schema/src/catalog.ts` — `LinkReport` restructured: `resolved` ->
  `edges`, `unresolved` -> `unresolvedTargets`, new `excludedTargets`, and per-bucket doc
  comments stating severity and why. New `LinkEdge` and `ExcludedTarget` shapes. `Catalog`
  gains `excludedTargets` and `draftTargets`, and `edges` is now documented as pointing
  only at articles the catalog contains
- `scripts/lib/link-report.mjs` — `buildLinkReport()` takes the adaptation `failures` and
  classifies four ways; `indexFailuresByUid()` keys the excluded files by
  `${repo}/${filename slug}` so a ref to one is recognised
- `scripts/build-catalog.mjs` — only `unresolvedTargets` is fatal; excluded and draft
  targets warn and travel into the artifact; the summary line reports both counts
- `scripts/verify-links.mjs` — adaptation failures warn instead of failing the gate;
  `unresolvedTargets` is the only fatal condition; the excluded/draft/planned/demo buckets
  are reported as warnings with distinct-target counts
- `scripts/verify-catalog.mjs` — two structural checks: every `edges` entry resolves to an
  article the catalog contains, and every `excludedTargets` entry names a file in
  `failures`. Excluded and draft targets are reported as a renderer warning, not a failure
- `.cursor/rules/30-content-pipeline.mdc` — the "Cross-repo links" section now states the
  four-way classification with a severity table, why an excluded target warns, and the
  filename-slug matching rule
- `AGENTS.md` — regenerated
- `docs/audit/unresolved-refs-2026-08-16.md` — new. All 49 unresolved refs individually:
  source article, raw ref, target, and whether the target is on the target corpus's own
  roadmap, grouped by the fix each one needs
- `prompts/session-3.md` — Track A step 4's link expectation corrected to
  `unresolvedTargets`, with Debt D13 named as the known exception
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — the four-way classification as a key fact; the blocked-catalog
  fact rewritten
- `progress.md` — Debt D12 closed, Debt D13 rewritten with the four causes; Phase 1 item
  7b annotated; session log entry

**Why:** "Unresolved" was one bucket doing four jobs. Follow-up c made an unadaptable
article an exclusion rather than an abort, which left every inbound `related` ref pointing
at a file the catalog deliberately no longer contains — and those refs were still being
reported as unresolved and still failing the build. Measured: 15 excluded articles produce
**79** unresolved refs. The gate was restating 15 root causes 79 times, and the 49 refs
that point at nothing at all — the case the rule was actually written for, and the only one
with no other report anywhere — were 38% of a list nobody would read to the bottom of.

So the report now classifies by cause and fails only where failing tells someone something
new. `edges` is unchanged. `excludedTargets` warns, because `verify-frontmatter` and
`catalog.failures` already name that file once, by path and reason. `draftTargets` warns
and is **recorded**, because a ref to a draft is a correct ref with no route in this build
— it goes live the day the article is marked complete, and the actual defect would be
rendering it as a link that 404s, which is a rendering decision the renderer can now make.
`unresolvedTargets` stays fatal.

An excluded target is matched by `repo` + filename slug. `CatalogFailure` carries no uid
by design (follow-up c), and this does not sneak one in: the slug is what a ref to the file
must resolve to regardless of what its frontmatter says, because the adapter rejects any
article whose id is not its filename slug, and the derived key is used only to downgrade a
fatal to a warning — never to give an unadapted file an identity in the artifact.

**The 49 are itemised in `docs/audit/unresolved-refs-2026-08-16.md`, and they are not one
problem.** 34 distinct targets, all in `nextjs` and `nestjs`, in four groups: 10 refs point
at articles that are **written and present but unpublished** (6 of them at
`nestjs/validation/dtos-and-class-validator.ts` — a complete article with frontmatter and
an H1, saved with a `.ts` extension, so file selection never sees it; 4 at
`nextjs/prompts/cache-lifetimes.md.tpl` and `use-cache-directive.md.tpl`, both carrying
`verified_against: next@16.3.0`). 21 are forward references to concept articles enumerated
on the target corpus's own roadmap and queued in its `progress.md`. 18 are `nestjs` recipe
slugs written into `related` before their recipe track opened — a pattern
`nestjs-concepts/progress.md` already logs as debt. **Zero are rename leftovers:** no file
named `<slug>.md` for any of the 34 targets has ever existed on any branch of any corpus,
and a rename could only orphan a ref by changing the slug itself, since `parseRelated()`
resolves on the slug and discards folder segments. Every rename in the four corpora is a
folder move. PR #9's body said 23 distinct targets; the correct count is 34.

**Invented decisions:**
- **`verify-links` no longer fails on adaptation failures.** It exited 1 the moment any
  file failed to adapt, on the stated grounds that a link graph over partially-adapted
  content is untrustworthy — so it would never have reached the new classification at all,
  and the change would have been inert in the gate that matters. The distinction that was
  missing is exactly the one now present: the graph says which refs land on an excluded
  file and which land on nothing. `verify-frontmatter` owns that failure and still fails
  on it unconditionally. This is the largest inferred decision here and the one most worth
  disagreeing with.
- **`LinkReport.resolved` renamed to `edges` and `unresolved` to `unresolvedTargets`.**
  The instruction named four buckets; `resolved` was the same set under a second name
  (`Catalog.edges` was already built from it), and `unresolved`/`draftTargets` mixed two
  naming conventions in one schema.
- **`ExcludedTarget` carries `sourcePath`.** `from` + `to` would have left a reader
  joining an excluded target to the right `CatalogFailure` by guesswork.
- **`Catalog` carries `excludedTargets` and `draftTargets`.** The instruction asked for
  draft targets to be recorded so the renderer can emit plain text; an excluded target is
  the identical rendering hazard, so recording one and not the other would have left the
  renderer with half a contract.
- **`schema` stays at `1`**, on the same reasoning as follow-up c and in the same PR: no
  catalog of any shape has been produced yet and there is no consumer to distinguish.
- **The two structural checks in `verify-catalog`.** Only a builder bug can fail them, no
  corpus content can. They exist because a renderer trusts `edges` enough to emit a link
  without checking, and mis-classification is the new failure mode this change introduces.
- **`docs/audit/unresolved-refs-2026-08-16.md` exists at all**, rather than only in the PR
  body. The per-ref table is the input to corpus-side work in four different repos, and a
  PR body is not where that survives. Generated by an uncommitted script, same practice as
  the session-2 frontmatter audit.
- **The "on a corpus roadmap?" verdict uses a delimited match**, not a substring: matching
  `caching` anywhere reported a sentence about caching in an unrelated `progress.md` row as
  a plan entry for `nestjs/caching`. One false positive found and removed that way.
- **Group 3's boundary is the ref's own `recipes/` prefix**, not the absence of a roadmap
  mention. Two recipe slugs do appear in `nestjs` planning docs — one in the debt row that
  records them as invented ahead of their track, one inside an example frontmatter block in
  roadmap §6.2 — and neither is a plan entry.

**Known issues / next steps:**
- **`buildLinkReport()` has no unit test.** It lives in `scripts/lib/`, which is outside
  every workspace package, so a test target for it would change the Turborepo task graph —
  a stop-and-ask item. Proven instead against a synthetic four-corpus fixture (not
  committed) that exercises all six buckets, plus the real corpus under a simulated
  description pass. Moving the function into `packages/content-schema/src/` would make it
  testable by the existing `node:test` runner and is the cheap fix.
- The 49 unresolved refs still fail the build, by design. Every one is corpus-side; the
  audit doc groups them by the fix each needs. The `.ts`-extension article is a one-file
  `git mv` in `nestjs-concepts` and closes 6 of them.
- Debt D5 and D11 are untouched. Against the real corpus `verify:links` still exits 1, now
  on the zero-articles refusal, since no article adapts at all.
- `verify-catalog` still runs in CI with no `build:catalog` step before it (flagged in
  follow-up c, still a stop-and-ask).

---

## Session doc-repair — union-merge damage in the two in-place trackers — 2026-08-17

**Branch:** `cursor/repair-union-merged-trackers-3709`

**Files changed:**
- `.agents/summary.md` — five `Last updated` headers collapsed to one; the
  `build-catalog` current-state bullet, the four `Content submodules wired` bullets, the
  five `Debt D5` key facts and the four `Planned next steps` item-1 paragraphs each
  collapsed to one, re-measured entry
- `progress.md` — Phase 1 items 7, 7b and 16 deduplicated; Debt D5 (×4) and D6 (×2)
  deduplicated; the D12/D13 ID collisions resolved and renumbered; new D14 and D15 rows;
  an append-only-IDs note and a "Highest ID issued" line added above the Debt table
- `.cursor/rules/00-session-protocol.mdc` — debt IDs declared append-only and
  never-reused under step 4; new section "Append-only docs vs in-place docs" forbidding
  `merge=union` on `progress.md` and `.agents/summary.md`
- `.gitattributes` — comments stating why only the two append-only docs are listed and
  why the two in-place trackers must never be added
- `AGENTS.md` — regenerated by `pnpm agents:build`
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session

**Why:** `.agents/SESSION-LOG.md` and `CHANGELOG.md` are append-only and carry
`merge=union` in `.gitattributes`, which is correct for them. `progress.md` and
`.agents/summary.md` are edited in place and are deliberately not listed — but the four
promotion rebases (`nextjs@v0.3.0`, `react@v0.5.0`, `angular@v0.3.0`, `nestjs@v0.3.0`)
plus follow-ups c and d were resolved as though they were. The result was two trackers
carrying every historical claim simultaneously: five `Last updated` headers, five copies
of one Phase 1 row, four `Debt D5` rows each stating a different remaining count, and one
debt number, D12, meaning two unrelated things.

Every surviving claim was re-measured rather than inherited. The four submodules were
checked out and the gates run: pins are `nextjs@v0.3.0`, `react@v0.5.0`,
`angular@v0.3.0`, `nestjs@v0.3.0`; **180 of 196 selected articles adapt** (nextjs 10/10,
react 58/73, angular 93/94, nestjs 19/19); `verify-frontmatter` fails on exactly 16 files;
`verify-links` fails on exactly **49 refs across 34 distinct targets**, matching
`docs/audit/unresolved-refs-2026-08-16.md` exactly. Nearly every surviving copy was stale
against that — including the one a "keep the newest" merge would have kept, which is why
the rule now says verify the survivor rather than trust the ordering.

Two substantive findings came out of the reconciliation. **D12's row was factually
wrong**: it claimed `nestjs-concepts` `validation/dtos-and-class-validator.md` was "absent
from disk". The file is present at `validation/dtos-and-class-validator.ts`, complete with
frontmatter and an H1, and is unselectable only because of the extension — the audit had
this right and the debt row did not. **`angular`'s `widget-deployment.md` is a duplicate
article**: its body is byte-identical to `docs/concepts/tooling/cdk-coercion.md` apart
from the relative depth of four link paths, its H1 is `Input Coercion: built-in transforms
and CDK utilities`, and it carries no `description`. It was tracked only inside a D5 row
and had never been given an ID; it is now D15.

**Invented decisions:**
- **The `Last updated` line reads `2026-08-17 (doc repair …)` rather than preserving the
  newest surviving header.** Keeping follow-up c's line would have been literally "the
  newest of each", but the file has just been edited, so that line would have been false
  the moment it was written.
- **Item 16 stays 🟡 rather than going ✅.** The description pass has run in all four
  corpora, but 16 selected files still fail adaptation, and flipping the item to complete
  while its own debt row is open would misreport the phase.
- **The renumbered link-report debt became D14 and the angular duplicate became D15**, in
  that order, because the link-report item was claimed first (follow-up c) and the angular
  duplicate had never been claimed at all.
- **The angular duplicate was given an ID rather than left inside a D5 row.** It is a
  distinct corpus defect with a distinct fix, and it was the only reason the D5 row could
  not simply be closed.
- **Two rows were factually corrected beyond deduplication.** D4 still listed `reactjs`
  and the three demo labs as corpora, and D7 still called the React repo
  `reactjs-concepts`; both were settled by the session-1 follow-up. Neither is a
  union-merge artifact, so correcting them is outside the literal instruction.
- **`.gitattributes` gained explanatory comments.** Only the rule file was asked for; the
  comments were added because `.gitattributes` is where someone will be standing when they
  are about to make this mistake again.
- **`.agents/summary.md` and `progress.md` each gained a two-line header** stating they
  are edited in place and never union-merged, so the constraint is visible in the file
  itself and not only in the rule.

**Known issues / next steps:**
- **`.agents/summary.md` still says the site renders "~120 verified reference articles".
  The measured figure is 196 selected, 180 adapting.** Left alone deliberately: `~120` is
  roadmap-era prose that appears in `roadmap.md` too, and `roadmap.md` is a stable
  planning document that is not updated per session. Correcting one and not the other
  would trade a stale number for an inconsistency. Worth an approved scope change.
- No content, schema, script or application code changed. The gate results above are the
  pre-existing state, unchanged by this session.
- The submodules were checked out (`git submodule update --init`) to run the gates. No
  gitlink moved; `verify-submodules` passes.
- Nothing here fixes D11, D12, D13 or D15 — all four are corpus-side.

---
