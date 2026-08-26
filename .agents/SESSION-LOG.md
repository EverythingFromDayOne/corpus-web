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

## Session doc-repair follow-up — article-count split — 2026-08-17

**Branch:** `cursor/repair-union-merged-trackers-3709`

**Files changed:**
- `.agents/summary.md` — opening census replaced `~120` with the measured 180 of 196
  and the per-corpus split; Last updated line refreshed
- `progress.md` — authority block for exact article counts; session-log line
- `roadmap.md` — living `~120` claims rewritten to "four corpora, ~200 articles";
  header pointer to `progress.md`; §0.0 dated entry for the split
- `.cursor/rules/00-session-protocol.mdc` — article counts are split by document
  and must not be synced
- `AGENTS.md` — regenerated by `pnpm agents:build`
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session

**Why:** The union-merge repair left `~120` in `.agents/summary.md` on purpose,
because the same number was in `roadmap.md` and copying one without the other would
have traded a stale figure for an inconsistency. That was waiting on an approved
scope change. The change is: the two documents are allowed to disagree in
precision. `progress.md` and `.agents/summary.md` take the measured census (196
selected, 180 adapting, nextjs 10/10, react 58/73, angular 93/94, nestjs 19/19).
`roadmap.md` takes a stable order of magnitude — "four corpora, ~200 articles" —
and a pointer to `progress.md`. A later session that "helpfully" copies one into
the other is the failure this rule exists to prevent.

**Invented decisions:**
- **Q1's "Mechanical pass, ~120 files" in `roadmap.md` §0.0 was left as written.**
  It is a dated 2026-08-15 resolution, not a living census, and rewriting a
  resolved decision-log row would mix history with the new split.
- **`.cursor/rules/30-content-pipeline.mdc` still says "never 120+ files".** That
  file was not named. The claim is "do not rewrite every article when frontmatter
  changes", not a census, so it was left alone.
- **A §0.0 dated entry was added to `roadmap.md`.** The instruction named the
  protocol file as the place to record the split; the decisions log is how this
  file itself records an approved scope change, so the pointer is visible without
  opening the rule.
- **`progress.md` got a dedicated authority block** rather than relying only on
  the numbers already in items 7, 16 and D5. The authority has to be findable
  without reading the phase table.

**Known issues / next steps:**
- `.cursor/rules/30-content-pipeline.mdc` (and therefore the generated `AGENTS.md`
  projection of it) still says "never 120+ files". Out of scope here.
- No content, schema, script or application code changed.

---

## Session promote-nestjs-v0.3.1 — pin nestjs-concepts to v0.3.1 — 2026-08-17

**Branch:** `cursor/promote-nestjs-v0.3.1-7497`

**Files changed:**
- `content/nestjs` — gitlink bumped from `v0.3.0` (`a9b2c8b`) to `v0.3.1` (`3c5c9e1`)
- `docs/audit/frontmatter-2026-08-16.md` — regenerated; nestjs 20/20 now adapt
- `docs/audit/unresolved-refs-2026-08-16.md` — D12's 6 inbound refs removed; new outbound ref recorded; 44 refs / 33 targets
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this promotion
- `.agents/summary.md` — nestjs pin, census 181 of 197, D12 closed in planned next steps
- `progress.md` — D12 closed; D13 44/33; D6 now selectable; census; session log line

**Why:** `nestjs-concepts` tagged `v0.3.1` to recover `validation/dtos-and-class-validator`
as a `.md` file with a `description`. The article was complete at `v0.3.0` but unselectable
because of the `.ts` extension (Debt D12), so six inbound `related` refs failed
`verify-links`. This repo consumes content as a tag-pinned submodule, so the pin has to
move here before that article can adapt. The other three corpora are unchanged.

The six inbound refs now land in `draftTargets` (object-shaped `status` still collapses
to `draft`). The recovered article adds one new unresolved outbound ref to
`nestjs/nested-dto-not-validated`, already a D13 group-3 target. Net: 49 → 44 unresolved
refs, 34 → 33 distinct targets. `build-catalog` still cannot write.

**Invented decisions:**
- Branch named `cursor/promote-nestjs-v0.3.1-7497` to satisfy the cloud-agent prefix
  rather than the skill's `content/<repo>-<tag>` form
- Regenerated `docs/audit/frontmatter-2026-08-16.md` in place (dated filename kept) so
  the nestjs section records 20/20; the rewrite also corrected stale nextjs/react
  adaptation counts that still said 0 adapted
- Re-measured `docs/audit/unresolved-refs-2026-08-16.md` rather than leaving it as a
  2026-08-16 snapshot that would now be false
- Skipped `pnpm verify:code-blocks` — the script is not in `package.json` yet
- Skipped `pnpm sync:content` until after `git add content/nestjs`, because postinstall
  / `sync:content` restore the recorded gitlink and had reset the working tree to
  `v0.3.0` during `pnpm install`
- No `prompts/session-N+1.md` — this is a `/promote-content` skill invocation, not a
  numbered session from `prompts/session-N.md`
- Session log id `promote-nestjs-v0.3.1` rather than a sequential session number
- Did not open a new debt ID for the recovered article's outbound
  `nested-dto-not-validated` ref; it is the same group-3 target D13 already tracked

**Known issues / next steps:**
- `content_hash` is sha256 of the body after frontmatter strip. The 19 previously
  adapting nestjs articles are byte-identical. The recovered article's body hash matches
  the old `.ts` file. No `lesson_progress` row exists for it yet. Hash-invalidation is
  the user's call; there is nothing to invalidate on existing rows.
- `verify-frontmatter` still fails on 16 files (D11 + D15). `verify-links` /
  `build-catalog` still fail on 44 unresolved refs (D13). Expected.
- Debt D6 is now selectable: the known-false claim would render under
  `NEXT_PUBLIC_SHOW_DRAFTS=1`. Production with drafts unset still does not ship it.
- Do not auto-merge this PR.

---

## Session task-doc-refactor — documentation architecture — 2026-08-17

**Branch:** `cursor/task-doc-refactor-7e3a`

**Files changed:**
- `docs/DEBT.md` — new debt register; D1–D15 moved out of `progress.md` with IDs preserved
- `progress.md` — debt table replaced by a pointer; session-log line added
- `.cursor/rules/00-session-protocol.mdc` — FIRST ACTION includes `docs/DEBT.md`; document-authority table; SESSION-LOG/CHANGELOG split; CHANGELOG template is bullets only; in-place merge ban covers `docs/DEBT.md`
- `.gitattributes` — comment names `docs/DEBT.md` as never-union-merge
- `.claude/skills/corpus-commit/SKILL.md` — preflight covers `docs/DEBT.md`
- `.agents/summary.md` — last-updated line; key fact that the register moved
- `AGENTS.md` — regenerated after the rule change
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session

**Why:** `progress.md` was mixing phase status, debt, and a session summary. Debt is the
most-consulted artifact and has its own lifecycle (append-only IDs, rows edited in
place), so it belongs in its own file. SESSION-LOG and CHANGELOG were duplicating
prose every session; the split is now a rule: *what* in the changelog, *why* in the
session log. FIRST ACTION now reads `docs/DEBT.md` so an agent cannot miss the
register.

**Invented decisions:**
- **Kept `.agents/summary.md`** rather than retiring it. The README document map omits
  it because that map is human-facing. The unique thing summary covers, which no other
  file maintains, is the compiled agent-facing snapshot of current gotchas and live
  census. Retiring it would dump that compilation into `progress.md` (wrong lifecycle)
  or the README (wrong audience). Rule 00 states this in prose after the table so the
  table itself stays identical to the README.
- Document-map links in rule 00 are relative to `.cursor/rules/` (`../../…`) so they
  resolve from that file. Same rows as the README.
- `Opened` dates in `docs/DEBT.md` reconstructed from SESSION-LOG first mentions —
  the old table had no Opened column.
- D4 stays in Open. It was never marked closed in `progress.md`.
- Closed-row Closed by / Date taken from the existing ✅ Closed markers; item text
  otherwise preserved. The ✅ prefix itself was dropped because Closed by carries it.
- `corpus-commit` preflight gained a DEBT.md line so `/commit` does not skip the new
  register.
- Did not author `prompts/session-4.md`. This is a named task, not a numbered session.
- Did not edit `prompts/session-3.md`, which still says the D11 list lives in
  `progress.md`.
- CHANGELOG template drops Architecture decisions going forward. Existing entries
  left as history.
- `progress.md` pointer is a markdown link, not the bare path the prompt showed.

**Known issues / next steps:**
- `prompts/session-3.md` Track A step 2 still says the D11 list is in `progress.md`.
  The list is now in `docs/DEBT.md`; `progress.md` has a pointer.
- Content gates (`verify-frontmatter` / `verify-links` / `build-catalog`) remain red
  on D11, D13, D15 — pre-existing, corpus-side.
- Do not merge.

---

## Session debt-d16 — article/recipe templates omit `description` — 2026-08-18

**Branch:** `cursor/debt-d16-article-templates-b29a`

**Files changed:**
- `docs/DEBT.md` — new Debt D16; Highest ID issued bumped D15 → D16; D5 row cross-references D16
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `.agents/summary.md` — debt ID range D1–D15 → D1–D16
- `progress.md` — session-log line

**Why:** The Q1 `description` pass closed D5 on every selected article that has a title,
but `nextjs-concepts` and `angular-concepts` still ship `docs/templates/ARTICLE_TEMPLATE.md`
and `docs/templates/RECIPE_TEMPLATE.md` whose frontmatter omits the now-required key.
Copying either template authors a new D5 failure. That is a distinct defect from the
remaining D5 residues (D11 untitled react articles, D15 angular duplicate), so it gets
its own ID rather than living inside D5.

`react-concepts` and `nestjs-concepts` were checked rather than assumed. Neither has
`ARTICLE_TEMPLATE.md`, `RECIPE_TEMPLATE.md`, a `docs/templates/` directory, or a mention
of either filename. The nestjs agent's "we have no templates" report is confirmed. Those
two cannot reintroduce D5 via this path; they also have no shared template to patch.

**Invented decisions:**
- Cross-referenced D16 from the D5 row, and changed D5's "closes when D11 and D15 close"
  to treat remaining misses and template recurrence as separate close conditions. Without
  that, closing D11+D15 would look like D5 was done while the templates still omitted the
  key.
- Did not open a "missing templates" debt for react/nestjs. Absence is recorded inside
  D16 as a finding, not as a second ID.
- Did not put nextjs-concepts' own progress.md note (templates plus roadmap §5's
  frontmatter list) into the D16 row. The user scoped D16 to the templates; the roadmap
  list is the same class of omission in that corpus and is noted here rather than
  widened into the register.
- Session log id `debt-d16` rather than a sequential session number — this is a named
  Slack task, not a `prompts/session-N.md` run. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- Fix is corpus-side in `nextjs-concepts` and `angular-concepts`: add `description` to
  both templates, then re-tag and `/promote-content`. Not a `corpus-web` adapter change.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not merge until reviewed.

---

## Session content-watch-honest-diff — catalog-diff missing snapshots — 2026-08-18

**Branch:** `cursor/catalog-diff-honest-snapshots-c14e`

**Files changed:**
- `scripts/catalog-diff.mjs` — missing or unparseable snapshots warn instead of collapsing to `{}`
- `scripts/build-catalog.mjs` — writes `catalog.json` with unresolved refs recorded; `verify-links` stays the fatal gate
- `scripts/verify-catalog.mjs` — warns on `unresolvedTargets` without failing on them; warnings print even when `failures` is non-empty
- `scripts/lib/link-report.mjs` — comment: unresolved is fatal in `verify-links`, recorded by `build-catalog`
- `packages/content-schema/src/catalog.ts` — required `Catalog.unresolvedTargets`; shared `UnresolvedTarget` schema
- `.cursor/rules/30-content-pipeline.mdc` — unresolved is FATAL for `verify-links`; `build-catalog` still writes
- `AGENTS.md` — regenerated after the rule 30 change
- `.github/workflows/content-watch.yml` — no `{}` stand-in when `catalog.json` is missing
- `prompts/session-3.md` — Track A step 4: catalog write is no longer blocked by D13
- `.agents/summary.md` — catalog now writes; D13 is a `verify-links` failure
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session
- `progress.md` — Phase 1 item 7 no longer blocked on the catalog write
- `docs/DEBT.md` — D5/D13 impact: catalog writes; `verify-links` still fails on the 44

**Why:** content-watch's PR body was lying. `build-catalog` refused to write on the 44
unresolved refs in D13, so both snapshots were missing, `catalog-diff.mjs` treated
missing as `{}`, and the body reported "articles adapting 0 → 0" and `_none_` for every
list. That is indistinguishable from a genuine no-change, so a PR that added or removed
articles would get merged as a no-op.

---

## Session — `Status` removed from the publication decision — 2026-08-18

**Branch:** `cursor/authoring-stage-not-publication-cac7`

**Files changed:**
- `packages/content-schema/src/common.ts` — `Status` (`z.enum(['draft', 'complete'])`) replaced
  with `AuthoringStage` (`z.string().min(1)`); JSDoc rewritten to state the field is the
  author's own workflow bookmark, never a publication signal
- `packages/content-schema/src/article.ts` — `Article.status: Status` renamed to
  `Article.authoringStage: AuthoringStage`, with a comment stating it carries no
  publication meaning
- `packages/content-schema/src/adapters/shared.ts` — `normaliseStatus` renamed to
  `normaliseAuthoringStage`; the `complete`/`published`/`final` → `'complete'` mapping is
  **deleted**, not extended. Strings are trimmed/lowercased and carried through as-is
  (`draft`, `review`, `needs-upgrade` stay distinct); object shapes (`{ drafted, reviewed }` /
  `{ upgraded, reviewed }`) are encoded as a stable sorted `key:value` string
  (`drafted:true,reviewed:false`) instead of collapsing to `'draft'`
- `packages/content-schema/src/adapters/factory.ts` — builds `authoringStage` via
  `normaliseAuthoringStage(fm.status)` instead of `status` via `normaliseStatus`
- `packages/content-schema/src/adapters/index.ts` — doc comment updated to name
  `normaliseAuthoringStage` and describe `authoringStage` as a display label
- `packages/content-schema/src/catalog.ts` — `Catalog.draftTargets` and
  `LinkReport.draftTargets` JSDoc rewritten: the field is kept in the schema for consumer
  stability but is now vestigial and always `[]`, since there is no more draft gate
- `scripts/lib/link-report.mjs` — `buildLinkReport` no longer takes a `showDrafts` option
  or checks `target.status === 'draft'`; every ref that resolves to an adapted article
  becomes an `edges` entry. `draftTargets` is hardcoded to `[]` in the returned report
- `scripts/build-catalog.mjs` — removed the `SHOW_DRAFTS` env read, the
  `linkReport.draftTargets` warn block, and the path-item
  `target.status === 'draft' && !SHOW_DRAFTS` fatal check (a path may reference any
  adapted article now)
- `scripts/verify-links.mjs` — removed the `SHOW_DRAFTS` env read and the
  `report.draftTargets` warn block
- `scripts/verify-catalog.mjs` — removed the `SHOW_DRAFTS` env read and the path-item
  draft check; the excluded-targets warn line no longer mentions drafts
- `.cursor/rules/30-content-pipeline.mdc` — "Draft gating" section replaced with
  "Publication gate — adaptation, not `status`"; the `Article` shape's `status` field
  renamed to `authoringStage`; the link-bucket severity table's `draftTargets` row marked
  vestigial; `NEXT_PUBLIC_SHOW_DRAFTS` repointed to a UI-surfacing flag, not a render gate
- `.claude/skills/corpus-adapter/SKILL.md` — "the deliberate asymmetry" example no longer
  cites `status` collapsing to `draft` (that collapse is gone); reframed around
  `difficulty` throwing versus a pure display field needing no gate
- `AGENTS.md` — regenerated (`pnpm agents:build`) after the rule 30 change
- `.agents/summary.md` — key facts and open-state notes about `status`/draft-collapse and
  the four-way link classification corrected; catalog numbers re-measured
- `progress.md` — Phase 1 item 7 re-measured with the new edge count
- `docs/DEBT.md` — **D6** row updated: the invalidated `nestjs/dtos-and-class-validator`
  claim is no longer hidden by draft gating and will now render in any build, since nothing
  gates on `authoringStage`
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this session

**Why:** the `status` frontmatter field was being read as a publication signal it was
never designed to carry. `normaliseStatus` collapsed every value that was not exactly
`complete`/`published`/`final` down to `draft`, and none of the four corpora ever writes
any of those three strings — they use `draft`, `review`, `needs-upgrade`, or one of two
object shapes recording an author's private "have I looked at this" checkbox. The
practical effect: **all 181 adapting articles normalised to `draft`**, and
`scripts/lib/link-report.mjs` treated every ref to a `draft` target as a non-rendering
warning instead of a live edge, so `catalog.json` had 181 articles and **0 edges** —
production, unset `NEXT_PUBLIC_SHOW_DRAFTS`, would have shipped a corpus with no
cross-links at all.

The actual publication gate already existed and was doing its job correctly: an article
either adapts — has a title, a description, and frontmatter that validates against its
corpus's adapter — or it is excluded and recorded in `catalog.failures`. `status` was a
second, redundant gate layered on top, and because of the vocabulary mismatch it was a
strictly worse one: it gated on a value no author was ever going to set correctly for this
purpose, because it was never a purpose-built field. Deleting the collapse rather than
extending it with more synonyms (`review` → draft, `needs-upgrade` → draft, ...) was the
right fix because widening the vocabulary would only have delayed the same discovery for
the next raw value a corpus author writes; the field itself is the wrong lever.

`AuthoringStage` keeps the raw label around — under a name that cannot be misread as a
publication state — because it may be useful UI chrome later (an "author flagged this for
review" badge), and because deleting information a corpus author wrote is not this
adapter's call to make. `NEXT_PUBLIC_SHOW_DRAFTS` is kept for the same reason: its
semantics move from "gate rendering" to "surface the badge," but no UI reads
`authoringStage` yet, so the flag's new meaning is documented, not wired up.

**Invented decisions:**
- The canonical string encoding for object-shaped `status` — sorted `key:value` pairs
  joined by commas (`drafted:true,reviewed:false`) — was not specified. Chosen so two
  authors writing the same booleans in a different key order produce the same
  `authoringStage` string, and so the encoding is reversible enough to audit by eye.
- `undefined`/empty string/empty object all normalise to the sentinel string
  `'unspecified'` rather than throwing. `authoringStage` is a display field with no gating
  consequence, so the asymmetry that makes `difficulty` throw on an unrecognised value
  (mis-categorising is silent; over-hiding is loud) does not transfer — there is nothing
  left to over-hide.
- `draftTargets` was kept as a schema field (always `[]`) rather than deleted outright,
  since the task described it as "should now be empty," not "should be removed," and
  removing a field is a larger, unrequested schema change with its own migration
  implications for any future consumer.
- Flagged Debt **D6** as newly urgent: the `nestjs/dtos-and-class-validator` article with
  an upstream-invalidated headline claim was previously never shown in production because
  every article — including that one — normalised to `draft`. It now renders in any build,
  since `authoringStage` no longer gates anything. This is a genuine behavioural
  consequence of the fix, not a regression in this repo's logic, but it raises the
  practical urgency of the corpus-side correction tracked in D6.

**Known issues / next steps:** `verify-links` still fails on the pre-existing 44 unresolved
`related` refs (Debt D13, unrelated to this change) and `verify-catalog` still fails on the
pre-existing 16 adaptation exclusions (Debt D11/D15). Both were confirmed unchanged before
and after this change. `NEXT_PUBLIC_SHOW_DRAFTS` has no live consumer yet — wiring an
`authoringStage` badge into the reader UI is future Phase 1 work (item 8, full route tree),
not part of this session.

The two fixes are one fact seen from two ends. The diff has to say when it could not
tell. The catalog has to exist so there is something to tell. Adaptation failures already
got emit-with-exclusions in follow-up c; unresolved refs were deliberately left fatal for
the write because extending that treatment was a semantic change to the hard-fail rule.
This session takes that decision: `verify-links` stays the gate, `build-catalog` records
the list and writes. Proven by simulating content-watch against `nestjs-concepts`
`v0.3.0` → `v0.3.1`: the body reports 180 → 181 and `nestjs/dtos-and-class-validator`
added, with `_none_` only for lists that genuinely did not change.

**Invented decisions:**
- `Catalog.unresolvedTargets` is required, matching `failures` / `excludedTargets` /
  `draftTargets`. `schema` stays at `1` — no catalog of any previous shape has been
  consumed
- JSON without an `articles` array, including `{}`, is unparseable rather than empty.
  `{}` was the workflow's missing-file stand-in, and treating it as empty was the lie
- When either snapshot is missing, omit the added/removed/rehashed lists rather than
  printing `_none_`. Keep the pin table; count cells say `unavailable`, not `0`
- `verify-catalog` warns on unresolved refs and does not fail on them. `verify-links`
  owns that fatal. Warnings print before the exclusions exit so they are visible while
  D11/D15 keep `failures` non-empty
- content-watch.yml no longer writes `{}` when `catalog.json` is missing, so the new
  catalog-diff warning is reachable from the workflow and not only from a direct
  invocation
- Did not author `prompts/session-N+1.md`. This is a named Slack task, not a numbered
  session. Session 3 Track A step 4 was factually corrected because it still said D13
  blocked the write

**Known issues / next steps:**
- `verify-frontmatter` still fails on 16 files (D11 + D15). `verify-links` still fails
  on 44 unresolved refs (D13). `verify-catalog` still fails on the 16 exclusions.
  Expected, corpus-side. `build-catalog` now exits 0
- Phase 1 item 7 remaining work is wiring routes and the sidebar to the artifact
- Do not auto-merge

---

## Session debt-d6 — close D6 on nestjs-concepts@v0.3.2 — 2026-08-19

**Branch:** `content/nestjs-v0.3.2`

**Files changed:**
- `content/nestjs` — gitlink already bumped `v0.3.1` → `v0.3.2` on this PR (`abae66f`); this commit is the tracker close-out
- `docs/DEBT.md` — D6 moved from Open to Closed; Item is the corrected ValidationPipe claim, not the old "forced by Nest" wording
- `progress.md` — v0.3.2 promotion entry; item 16 pin citation `nestjs@v0.3.1` → `v0.3.2` (20/20 left alone)
- `.agents/summary.md` — D6 known-false headline removed; Nest `forbidUnknownValues` key fact replaced with the corrected claim; pin `v0.3.1` → `v0.3.2`
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task

**Why:** `nestjs-concepts@v0.3.2` already landed the corpus-side correction on this
promotion PR. D6 stayed open because the in-place trackers still described the claim as
false and still said Nest "forces" `forbidUnknownValues: false` — the same error the
corpus just stopped making. Closing the row without rewriting it would have left the
false claim in the register. The three in-place files (`docs/DEBT.md`, `progress.md`,
`.agents/summary.md`) were edited in place; `.gitattributes` covers only SESSION-LOG
and CHANGELOG.

Census re-verified with `pnpm build:catalog` on this branch: 181 articles, 289 edges,
16 excluded, 44 unresolved. No article added, removed, or renamed. Three `content_hash`
changes on `validationpipe-in-depth`, `dtos-and-class-validator`, and
`typescript-for-nest`. D5 and D13 left untouched: D5's `nestjs@v0.3.1` is when the
description pass landed, and this fix changed no `related` refs.

**Invented decisions:**
- Inserted the closed D6 row after D3 so closed IDs stay in numeric order (D2, D3, D6,
  D12, D14)
- Item 16's pin citation updated to `v0.3.2`; the same row's D12 recovery sentence still
  names `v0.3.1` as the tag that recovered the article
- Did not edit `.cursor/rules/20-never-violate.mdc` / `50-api-nestjs.mdc` (or regenerate
  `AGENTS.md`) which still say Nest forces the default — out of the named-file scope
- Did not author `prompts/session-N+1.md`. This is a named Slack task, not a numbered
  session. Close-out lands on existing PR #18; no second PR

The fix prompt suggested a `verify/` directory for the probe, but `nestjs-concepts`
already had a `scripts/` convention via its `check:links` script — the probe landed
beside the article (`validation/forbid-unknown-values.mjs`) instead, and the next
corpus-fix prompt should check for an existing convention rather than proposing one.

**Known issues / next steps:**
- `verify-frontmatter` still fails on 16 files (D11 + D15). `verify-links` still fails
  on 44 unresolved refs (D13). Expected, corpus-side, unchanged
- Three `content_hash` changes are the user's cosmetic-versus-substantive call; this
  close-out does not decide invalidation
- Rule files still carry the pre-correction Nest wording until a later session updates
  them
- Do not auto-merge

---

## Session debt-d6 — claim wording — 2026-08-19

**Branch:** `content/nestjs-v0.3.2`

**Files changed:**
- `docs/DEBT.md` — closed D6 Item uses the instructed "has defaulted" phrasing
- `.agents/summary.md` — key fact aligned to the same sentence
- `CHANGELOG.md` — Fixed bullet aligned to the same sentence
- `.agents/SESSION-LOG.md` — this entry

**Why:** The D6 close-out was already on this branch. The instructed closed-row claim
was "has defaulted … since 0.14.0"; the landed row said "defaults". Aligning the
register, snapshot, and changelog so they carry one sentence.

**Invented decisions:** none beyond the wording alignment.

**Known issues / next steps:** unchanged from the previous `debt-d6` entry. Do not
auto-merge.

---

## Session debt-d6 — rule files seed, not force — 2026-08-19

**Branch:** `content/nestjs-v0.3.2`

**Files changed:**
- `.cursor/rules/20-never-violate.mdc` — Nest "forces" `forbidUnknownValues: false` replaced with seeded overridable default
- `.cursor/rules/50-api-nestjs.mdc` — same correction on the Validation section
- `AGENTS.md` — regenerated; former "forces" hits at lines 378 and 701 are gone
- `CLAUDE.md` — unchanged (pointer file; not a rule-body projection)
- `.cursor/rules/60-skills.mdc` — unchanged (generated from skill descriptions, not these two rules)
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task
- `.agents/summary.md` — Last updated notes that `.cursor/rules` now matches the corpus correction
- `progress.md` — session-log bullet for the rule-file alignment

**Why:** Closing D6 in the trackers left the false "forces" wording in the canonical
rule files. Every future agent run projects those files into `AGENTS.md`, so the
corpus correction would be undone in context the next time an agent opened the
repo. The two named lines now match `nestjs-concepts@v0.3.2`: since
`@nestjs/common` 9.3.2, `ValidationPipe` seeds `forbidUnknownValues: false` as an
overridable default.

**Invented decisions:**
- Kept each replacement to three wrapped lines rather than the original two so the
  9.3.2 / 0.14.0 / 0.14.2 pins and the override constructor fit without becoming
  an article
- Did not edit `.claude/skills/corpus-nest-module/SKILL.md`, which still says Nest
  "forces" the option and indexes as a "forbidUnknownValues reversal" at
  `AGENTS.md` ~755. Out of the named two-file scope
- `CLAUDE.md` is a pointer by design (`renderClaude()` in `scripts/build-agent-docs.mjs`);
  zero hits there is not a projection-sync bug

**Known issues / next steps:**
- `.claude/skills/corpus-nest-module/SKILL.md` still restates the pre-correction claim
- Do not auto-merge

---

## Session debt-d6 — nest-module skill seed, not reversal — 2026-08-19

**Branch:** `content/nestjs-v0.3.2`

**Files changed:**
- `.claude/skills/corpus-nest-module/SKILL.md` — description and Validation section: "forces" / "reversal" replaced with seeded overridable default
- `AGENTS.md` — regenerated; former "reversal" index at line 755 is gone
- `.cursor/rules/60-skills.mdc` — regenerated from the skill description
- `CLAUDE.md` — regenerated if the generator rewrote it; no rule-body projection
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task
- `.agents/summary.md` — Last updated notes the skill matches the corpus correction
- `progress.md` — session-log bullet for the skill alignment

**Why:** The canonical rule files were corrected on the previous push, but the
`corpus-nest-module` skill still said Nest "forces" `forbidUnknownValues` and its
description still projected a "reversal" into `AGENTS.md`. Skill descriptions are
the source for the generated skill index, so leaving that wording would keep
teaching every future agent the claim D6 closed.

**Invented decisions:**
- Description replacement is length-matched: "the forbidUnknownValues reversal" →
  "the forbidUnknownValues seeded default"
- Body heading "a reversal that breaks assumptions" → "a seeded default that
  breaks assumptions"; the mechanism sentence now matches the rule files
  (`@nestjs/common` 9.3.2, seeded overridable default) without adding the
  constructor example the rules already carry
- Did not restyle the Avoid bullet "Never assume standalone `class-validator`
  defaults" — that warning remains true and does not claim Nest forces the option

**Known issues / next steps:**
- Live "Nest forces / reverses this option" wording is gone from `.claude/`,
  `.cursor/`, `docs/`, `scripts/`, `AGENTS.md`, and `CLAUDE.md`. Remaining
  hits quote the old claim as the error being fixed: `prompts/d6-forbid-unknown-values.md`
  (lines 54, 60, 187, 238, 268) and historical SESSION-LOG / CHANGELOG /
  `progress.md` entries. The skill's Avoid bullet still says "Never assume
  standalone `class-validator` defaults" — true, not a forces-claim
- Do not auto-merge

---

## Session poc-grid-review — article layout grid placement at every breakpoint — 2026-08-19

**Branch:** `cursor/poc-grid-placement-every-breakpoint-1a80`

**Files changed:**
- `docs/design/article-layout-poc.html` — desktop template, explicit child placement, and the `.view.nosb` collapse moved into `@media (width > 1000px)`; the ≤1000px block became its exact complement and now places all three children in its single column; the `.view.nosb>.sb{visibility:visible}` specificity patch and `.view>.sb{grid-column:1/-1}` deleted
- `prompts/session-3.md` — the two grid bullets in §3 annotated with the corrected state and the measured before/after tracks
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task
- `progress.md` — session-log bullet; Phase 1 item 8 note that the POC contract no longer carries the two grid defects

**Why:** The review asked three questions about the article component. The first finding is
that the component does not exist. `apps/web` has one route — the session-1 spike at
`/[locale]/concepts/[repo]/[...slug]`, hardcoded to a single `nextjs-concepts` article, with
no shell, sidebar, or rail — and `packages/ui` and `packages/mdx-components` are both empty
stubs. There is no `/en/blog` route, no `/en/courses/[course]/lessons/[slug]` route, and no
extracted article component, so the two-copies question has no subject: nothing is shared
and nothing has drifted. `prompts/session-3.md` §3 specifies the intended shape — one
component taking a chrome variant, two route wrappers — and that session has not been run.

The two grid defects are therefore reviewable only in the contract file itself, and both
were live there. `432d825` added explicit placement but only to the top-level template, so
the ≤1000px block still left `main` at `grid-column:2` against a one-track template. That is
the identical defect the commit claimed to fix, one breakpoint down. Measured in headless
Chrome at an exact 1000px viewport, the resolved tracks were `4.8125px 995.188px` — Chrome
reports the implicit track, which is what makes the diagnosis unambiguous rather than
inferred. Separately, `.view.nosb` at (0,2,0) outranked the ≤1000px `.view` at (0,1,0), so a
collapse performed on desktop carried the three-column template into mobile and gave 56px of
a 390px viewport to an empty rail track. The POC already contained one patch for that
collision, `.view.nosb>.sb{visibility:visible}`, which fixed the visibility half and missed
the template half — the signature of patching around a specificity problem rather than
removing it. Scoping both the template and the collapse to `(width > 1000px)`, complemented
by `(width <= 1000px)`, means no rule has to out-specify another to be undone, and the patch
was deleted rather than extended.

**Invented decisions:**
- **Fixed the POC rather than only reporting.** The task said "report and fix" and named two
  defects that exist only in `docs/design/article-layout-poc.html`. Rule 00 lists
  `docs/design/` as "replaced wholesale when the design moves"; this is a defect correction,
  not a design move, so the edits are surgical and in place. The alternative — leaving the
  contract wrong and fixing it during session 3 — keeps a known-broken artifact as the thing
  session 3 transcribes from.
- **Media Queries Level 4 range syntax** (`width > 1000px` / `width <= 1000px`) for the
  complementary pair, rather than `min-width:1001px` (which leaves fractional viewports
  between 1000 and 1001 unstyled) or `min-width:1000.02px` (a fractional-breakpoint hack).
  The file already requires `:has()` and `color-mix()`, both of which set a higher browser
  floor than range syntax, so this does not move the floor. The `1280px` and `520px` queries
  were left in `max-width` form — they are not part of a complement pair and rewriting them
  is churn.
- **On mobile all three children are placed in column 1**, not just `main`. `.sb` is a
  fixed-position drawer and `.rail` is `display:none`, so neither generates a box in that
  cell; placing them anyway is what makes the block hold at every breakpoint by inspection
  instead of by knowing which children happen to be out of flow today.
- **Removed `.sb` from the ≤1000px `display:none` group.** The next rule set it to
  `display:block` two lines later, so the computed result is identical. It sat inside the
  rules being rewritten and is the same patch-then-undo shape as the specificity defect.
- **Annotated `prompts/session-3.md` rather than rewriting its defect list.** Rule 00 makes
  session prompts immutable once run and annotated thereafter; this one has not been run, but
  an annotation is the lighter change and it stops the next agent reading a bullet that
  describes a defect it will not find. The instruction to correct the remaining POC defects is
  untouched.
- **No new debt ID opened.** The recurrence guard — a check that asserts resolved grid tracks
  per breakpoint — is already tracked as a session-3 §7 deferral alongside the note that two
  grid bugs shipped past every existing gate. A second ID for the same gap would be permanent
  duplicate noise in an append-only register.
- Branch named `cursor/poc-grid-placement-every-breakpoint-1a80` to satisfy the cloud-agent
  prefix and suffix rather than `corpus-commit`'s `fix/<short-slug>` form.
- Session log id `poc-grid-review` rather than a sequential session number — this is a named
  Slack review task, not a `prompts/session-N.md` run. No `prompts/session-N+1.md` authored;
  `prompts/session-3.md` is still the next session and is unrun.

**Known issues / next steps:**
- **No automated check would have caught either defect, and none was added.** The measurement
  used here is a throwaway harness in `/tmp` driving the system `google-chrome`: it renders
  the POC inside fixed-width iframes and reads `getComputedStyle(view).gridTemplateColumns`
  plus `main`'s rect. Making it a gate means a Playwright or CDP dependency, which is a
  stop-and-ask under rule 20, so it was not installed. Note for whoever builds it: headless
  Chrome clamps its own window to roughly 500px, so `--window-size=390,900` silently measures
  a 500px viewport and reports the 390px case as passing. The iframe wrapper is what makes an
  exact 390px measurement possible.
- The remaining POC defects listed in `prompts/session-3.md` §3 are untouched: heading order
  `h1 → h3 → h3 → h2`, the missing `.lang` badge and its absent CSS rule, `#mk` in the second
  figure being referenced by no JavaScript, the mock `✓ 7 blocks verified` strip, and the two
  disagreeing breadcrumbs. Out of the three-item scope.
- The JavaScript still never clears `nosb` when the viewport crosses 1000px and there is no
  resize handler. That is now cosmetically harmless because the class has no declarations
  below the breakpoint, but the real build persists collapse state in a cookie, so the reader
  path into the old bug was a mobile load with a collapsed cookie, not a resize.
- `apps/web` remains the spike. Building the two route wrappers over one article component is
  session 3.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side, untouched here.
- Do not auto-merge.

---

## Session 3 — listing routes — 2026-08-19

**Branch:** `cursor/session-3-listing-routes-9394`

**Files changed:**
- `apps/web/package.json` — Tailwind v4, postcss, `@corpus/ui`; no `@corpus/content-schema`
- `pnpm-lock.yaml` — lockfile for those deps
- `apps/web/postcss.config.mjs` — `@tailwindcss/postcss`
- `apps/web/tsconfig.json` — include `components/` and `messages/`
- `apps/web/next.config.mjs` — `/` → `/en` redirect; transpile `@corpus/ui`
- `apps/web/next-env.d.ts` — Next-generated types path
- `apps/web/app/globals.css` — Tailwind + tokens + graph draw
- `apps/web/app/layout.tsx` — fonts, theme pre-paint script, `data-theme`
- `apps/web/app/[locale]/layout.tsx` — site header/footer, `en` only
- `apps/web/app/[locale]/page.tsx` — `/en` landing
- `apps/web/app/[locale]/courses/page.tsx` — course index
- `apps/web/app/[locale]/courses/[course]/page.tsx` — course detail + `#curriculum`
- `apps/web/app/[locale]/blog/page.tsx` — article index
- `apps/web/app/[locale]/concepts/[repo]/[...slug]/page.tsx` — deleted session-1 spike
- `apps/web/lib/source.ts` — deleted with the spike
- `apps/web/lib/catalog.ts` — listing subset of `catalog.json`, reading time, `relatedHref`
- `apps/web/lib/i18n.ts` — message catalogue helper
- `apps/web/lib/locales.ts` — `en` only
- `apps/web/lib/repos.ts` — four corpus ids without content-schema
- `apps/web/lib/routes.ts` — `/en/blog/…` and `/en/courses/…` hrefs
- `apps/web/lib/site.ts` — origin, theme cookie, 200 wpm
- `apps/web/messages/en.json` — all listing chrome copy
- `apps/web/components/chrome/site-header.tsx` — nav, no sign-in
- `apps/web/components/chrome/nav-links.tsx` — `usePathname` current page
- `apps/web/components/chrome/search-placeholder.tsx` — disabled search
- `apps/web/components/chrome/theme-toggle.tsx` — cookie theme toggle
- `apps/web/components/home/concept-graph-teaser.tsx` — four-node graph
- `apps/web/components/home/corpus-cards.tsx` — live counts + demo-labs placeholder
- `apps/web/components/home/entry-points.tsx` — three doors + reading conventions
- `apps/web/components/courses/course-card.tsx` — index card + flat curriculum with `note`
- `apps/web/components/blog/article-index.tsx` — corpus filter, folder groups
- `apps/web/components/json-ld.tsx` — WebSite / Organization / ItemList
- `docs/DEBT.md` — D17–D26 opened; highest issued D26
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task
- `.agents/summary.md` — listing routes current state; D1–D26; next step is article routes
- `progress.md` — items 7/8/13/14; session bullet

**Why:** Session 3's listing slice is the first catalog-driven surface a reader can
browse. The session-1 spike hardcoded one article and did not read the catalog; it
is replaced, not extended, because the canonical URL is now flat
`/en/blog/[corpus]/[slug]`. Article body, chrome, and both article wrappers stay
out of this invocation so a later one can transcribe the POC without merging two
layout attempts.

**Invented decisions:**
- This invocation implements only `/en`, `/en/courses`, `/en/courses/[course]`,
  `/en/blog`. Article component and both article routes are a separate invocation.
- Installed Tailwind v4 + `@tailwindcss/postcss` + `postcss` in `apps/web`. They
  are the declared stack; the spike had never applied them. No next-intl.
- Message catalogue is `messages/en.json` + `t()`. Thesis copy is quoted from
  roadmap §15.1. Corpus one-liners are identity ("Reference articles on X"), not
  behavioural claims. Course YAML copy is used as-is.
- Listing loader parses a local zod subset of `catalog.json` rather than
  importing `@corpus/content-schema`. Turbopack cannot resolve that package's
  NodeNext `.js` specifiers to `.ts` sources, and the blog filter is a client
  component that must not pull remark.
- Reading time is `max(1, round(words/200))` from the article file with
  frontmatter stripped. Course time is the sum. `estimatedHours` is omitted.
- Course `level` is shown only when every item shares one `difficulty`; the
  first course is mixed/null so the row omits it.
- No fabricated coming-soon course cards. Home has the §15.1 demo-labs row as
  an unlinked coming-soon placeholder (Debt D9).
- Concept graph teaser is four corpus nodes with directed edge weights, not
  181 article nodes. "Full graph" is inert (Phase 4).
- Theme cookie `corpus-theme` via a pre-paint inline script. Toggle is a client
  leaf. Nothing in the cached tree calls `cookies()`.
- Site wordmark is `corpus.web`, from the POC. JSON-LD Organization is
  `EverythingFromDayOne`. Course detail uses `ItemList`, not schema.org `Course`
  (that type invites `Offer`).
- `/` → `/en` is a permanent redirect in `next.config.mjs`.
- Blog corpus filter is client-side state, not `searchParams`, so `/en/blog`
  stays static.
- Lesson and article hrefs are emitted even though those routes are not built
  here. Excluded articles are absent from the index (they 404 later).
- `relatedHref` returns null unless the uid adapted. Listing pages do not
  render `related`; the helper is for the article invocation.
- `--max-width-page: 72rem` in `globals.css` for listing surfaces.
- Branch named `cursor/session-3-listing-routes-9394` per the cloud-agent
  template, not `feat/` from `corpus-commit`.
- Debt D17–D26 opened here to reserve ids. `prompts/session-4.md` was not
  authored; session 3's article routes remain.
- Hosting/Vercel config untouched. `verify-links` was not treated as a commit
  gate (D13, 44 refs, by design).
- When a corpus has two baseline version strings, the listing card uses the
  most common (nextjs `16.3` vs `16.3.0`).

**Known issues / next steps:**
- `/en/blog/[corpus]/[slug]` and `/en/courses/[course]/lessons/[slug]` do not
  exist yet; curriculum and blog cards link to them and will 404 until the
  article invocation lands.
- `next build` reports `○` for `/en`, `/en/blog`, `/en/courses`,
  `/en/courses/react-render-cycle`, and `◐` for the `[locale]` param templates.
  No `ƒ` routes. Inspected `.next/server/app/en.html` (and courses/blog) —
  181 blog hrefs, `#curriculum` present, no sign-in.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Session 4 — Tailwind v4 exact pin corrected to 4.3.3 — 2026-08-19

**Branch:** `cursor/session-3-listing-routes-9394`

**Files changed:**
- `apps/web/package.json` — `tailwindcss` and `@tailwindcss/postcss` exact pin
  `4.1.0` → `4.3.3`
- `pnpm-lock.yaml` — re-resolved for the new pin

**Why:** The previous commit on this branch (`fix(web): pin Tailwind v4 PostCSS
plugin so pnpm dev compiles CSS`) pinned both packages to exact `4.1.0` and said
so explicitly in its own invented-decisions block: "4.1.0 exact, matching the
previous specifier floor, not lockfile 4.3.3." `roadmap.md` §3 constrains
Tailwind to major `v4` only — it names no patch. `4.1.0` is simply the lowest
version satisfying that constraint, not a chosen one, and it silently downgraded
away from `4.3.3`, which `pnpm-lock.yaml` had already resolved from the prior
caret range (`^4.1.0`) and which is what the Vercel preview built against. This
session restores the exact pin to `4.3.3` on both packages so the local
toolchain matches the deployed one, ran `pnpm install` to regenerate the
lockfile, rebuilt `catalog.json` (`pnpm build:catalog` — gitignored, not
committed; needed for the listing routes to render at all, unrelated to the
Tailwind change), and confirmed `pnpm dev` serves all four listing routes
(`/en`, `/en/courses`, `/en/courses/react-render-cycle`, `/en/blog`) at `200`
with compiled CSS (`/_next/static/chunks/[root-of-the-server]*.css`, Tailwind
utility classes present in the rendered HTML).

**Invented decisions:**
- none — `roadmap.md` §3 constrains only the major; `4.3.3` is this session's
  explicit patch choice, matching the version the lockfile had already resolved
  and the Vercel preview was built against, per the task instruction.

**Known issues / next steps:**
- Unrelated: a stray `apps/web/next-env.d.ts` diff (`.next/types` →
  `.next/dev/types`) appeared after running `pnpm dev` and was reverted before
  commit — a Next.js dev-server regeneration artifact, not part of this change.
---

## Session 3 — article routes — 2026-08-19

**Branch:** `cursor/session-3-article-routes-f628`

**Files changed:**
- `apps/web/app/[locale]/blog/[corpus]/[slug]/page.tsx` — canonical article wrapper; 181 `generateStaticParams`
- `apps/web/app/[locale]/courses/[course]/lessons/[slug]/page.tsx` — lesson wrapper; `react-render-cycle` × 12; `rel=canonical` to `/en/blog/…`
- `apps/web/components/article/article-view.tsx` — one article body for both routes
- `apps/web/components/article/article-shell.tsx` — chrome context, header toggle, progress bar, scrim
- `apps/web/components/article/article.css` — listing POC pinned shell + article POC body; 18×2px ticks
- `apps/web/components/article/sidebars.tsx` — corpus tree vs curriculum; per-item `note`
- `apps/web/components/article/toc-rail.tsx` — IntersectionObserver rail
- `apps/web/lib/article-markdown.tsx` — fumadocs MarkdownServer, extract hoist, related/md links
- `apps/web/lib/article-source.ts` — `'use cache'` + `cacheLife('max')` body read
- `apps/web/lib/slug.ts` — GitHub slug algorithm copied from content-schema
- `apps/web/lib/progress.ts` — anonymous `localStorage` progress
- `apps/web/lib/catalog.ts` — sections, related, neighbors, `relatedHref`
- `apps/web/messages/en.json` — `article.*` strings
- `apps/web/app/[locale]/layout.tsx` — shared `ArticleChromeProvider`; listing footer removed from locale layout
- `apps/web/components/chrome/site-header.tsx` — hamburger in the existing top bar; `SiteFooter` on `PageShell`
- `apps/web/app/[locale]/page.tsx` — pass messages into `PageShell`
- `apps/web/app/[locale]/blog/page.tsx` — pass messages into `PageShell`
- `apps/web/app/[locale]/courses/page.tsx` — pass messages into `PageShell`
- `apps/web/app/[locale]/courses/[course]/page.tsx` — pass messages into `PageShell`
- `apps/web/app/globals.css` — `--tb: 3.6rem`; hide header toggle off article routes
- `packages/mdx-components/src/code-block.tsx` — server code block + provenance strip
- `packages/mdx-components/src/code-block-controls.tsx` — copy / download / expand leaves
- `packages/mdx-components/src/index.ts` — register `pre` → `CodeBlock`
- `packages/mdx-components/tsconfig.json` — `module: ESNext`, `moduleResolution: Bundler` so Next can consume the package
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased article-route bullets
- `.agents/summary.md` — article routes now exist
- `progress.md` — items 8 and 9
- `prompts/session-4.md` — remaining Phase 1 work

**Why:** Session 3's listing slice already shipped the four index routes. This invocation is the article component and the two wrappers only. One body, two chrome variants, so a prose or code-block change cannot fork. The listing POC owns pinned columns and document scroll; the article POC owns the body. The shared top bar is reused rather than duplicated, which meant moving the listing footer onto `PageShell` so article routes do not inherit it.

**Invented decisions:**
- One shell for both routes uses listing-POC pinned columns (`padding-left: 19rem; padding-right: 3.5rem`; sidebar/rail `position: fixed` below `--tb`) and document scroll, not the article POC's sticky grid.
- Mobile curriculum is a drawer (article POC pattern), not stacked above the article. Listing POC did not specify one.
- Blog prev/next is previous/next in catalog sort within the same corpus (repo → folder → title), not graph edges.
- Provenance comes from `<!-- extract: path#symbol -->` comments hoisted into fence meta. The verified count is omitted when zero. No mock "7 blocks".
- Heading ids copy the content-schema GitHub slug algorithm into `apps/web/lib/slug.ts` so they match `catalog.sections`.
- Markdown H1 is stripped; the page renders the catalog title.
- Unresolved markdown `.md` links resolve against the article's own corpus only and render as plain text when the target did not adapt.
- Blockquotes starting with "Lead with this" become `.av-hook`; other blockquotes become `.av-co`.
- No `--cool` token; existing `@theme` tokens only.
- Remark via `fumadocs-core/content/md` (`createMarkdownRenderer` + `remarkGfm`); no new npm packages.
- `@corpus/mdx-components` tsconfig is Bundler/ESNext so Next can consume it (was NodeNext).
- Footer lives on listing `PageShell`, not the locale layout, so article routes have no listing footer.
- Sidebar collapse is client-only (no cookie) so the routes stay free of `cookies()`.
- Related `h2` is outside the markdown slugger / rail sections.
- Lesson notes render in the curriculum sidebar even though the listing POC sidebar omitted them.
- Warm-up quiz on lesson pages is a dashed `av-ph` placeholder, not an `h3`.
- Rail ticks are `<a href="#anchor">`, 18×2px default, 30px when `.on`/hover, unchanged from the article POC.
- `export const dynamicParams` is forbidden under Cache Components, so excluded slugs 404 via `notFound()` after being omitted from `generateStaticParams`.
- Shared top bar height is listing POC `--tb: 3.6rem`.
- Article measure follows the article POC's 60rem, not `--measure-prose`.
- Branch named `cursor/session-3-article-routes-f628` per the cloud-agent template, not `feat/` from `corpus-commit`.
- Hosting/Vercel/DNS untouched. `verify-links` was not treated as a commit gate (D13, 44 refs, by design).

**Known issues / next steps:**
- `next build` table: listing concretes stay `○` (`/en`, `/en/blog`, `/en/courses`, `/en/courses/react-render-cycle`). Article and lesson generated paths are grouped as `◐` (`/+184` blog, `/+12` lessons) together with leftover `[slug]` templates. No `ƒ`. Inspected `.next/server/app/en/blog/nextjs/cache-components-model.html` and `en/courses/react-render-cycle/lessons/jsx-and-rendering.html` — full body, 181 blog HTML files, 12 lesson HTML files, lesson `rel=canonical` is the blog URL. `dynamicParams` cannot be set under Cache Components, so unknown slugs remain a request-time `notFound()` branch. Tracked under D23.
- D18 a11y defects were not fixed. Rail ticks stay 18×2px (D19 tension).
- Shiki (D20), Pagefind (D21), SEO residue (D22), `/en/license` (D25), DNS (Phase 0 item 5) are out of scope.
- Do not auto-merge. Do not mark Phase 0 item 5 complete.

---

## Session 3 follow-up — listing chrome defects — 2026-08-19

**Branch:** `cursor/session-3-article-routes-f628`

**Files changed:**
- `apps/web/components/home/concept-graph-teaser.tsx` — deleted; SVG dropped
- `apps/web/components/home/entry-points.tsx` — listing-POC graph coming-soon card as the third grid item
- `apps/web/app/[locale]/page.tsx` — pass live edge count; no graph SVG
- `apps/web/components/chrome/search-placeholder.tsx` — Search label, Coming soon placeholder, ⌘K, disabled + aria-disabled
- `apps/web/components/chrome/site-header.tsx` — `.topbar` locked to `--tb`, no wrap
- `apps/web/components/chrome/nav-links.tsx` — no wrap
- `apps/web/app/globals.css` — top bar, search, coming-soon tag; graph-edge animation removed
- `apps/web/components/article/article.css` — `.av-sbhd` stays `position: static` with opaque surface
- `apps/web/messages/en.json` — POC corpus one-liners; search and graph-card strings
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased chrome-defect bullets
- `.agents/summary.md` — 289 edges are intra-corpus; home uses the coming-soon card
- `progress.md` — items 11 and 13 notes

**Why:** Five non-structural defects on the article-routes PR. The graph SVG used
`w-full` against a 276-unit viewBox and contained four nodes and no edges. The
caption claimed cross-corpus links; measuring `catalog.json` showed all 289
edges are intra-corpus, so drawing inter-corpus stroke-weighted lines would
still render the subject as absent. The listing POC already specifies the
coming-soon card in the "Three ways in" grid, which is the other option the
review allowed. The overflowing search made the sticky top bar taller than
`--tb` while the article sidebar is pinned at `top: var(--tb)`, so the corpus
select sat under the bar; the CORPUS row was never sticky.

**Invented decisions:**
- Drop the SVG rather than draw empty inter-corpus links (0 of 289 edges cross a corpus)
- Live `{count}` in the coming-soon card body rather than a hardcoded 289
- Replace the duplicate "Browse everything" entry card with the graph coming-soon card; "Debugging a specific problem" still links to `/en/blog`
- Leave unused `home.graphHeading` / `graphCaption` / `placeholders.graphFullView` keys in the catalogue
- Corpus card `scope` strings are the POC `h3` one-liners, not the longer supporting paragraphs
- Top bar uses listing-POC `height: var(--tb)` rather than `min-height`

**Known issues / next steps:**
- Pagefind (D21) still replaces this disabled control. Concept-graph view remains Phase 4.
- Do not auto-merge.

---

## Session 3 follow-up — home page POC transcription — 2026-08-19

**Branch:** `cursor/session-3-article-routes-f628`

**Files changed:**
- `apps/web/app/[locale]/page.tsx` — `/en` structure matches listing-POC `#p-home`
- `apps/web/components/home/home.css` — transcribed `#p-home` CSS (hero band, readout, cards, split, conventions)
- `apps/web/components/home/corpus-cards.tsx` — census readout; ratio bar; adapting/version footer; POC blurbs
- `apps/web/components/home/entry-points.tsx` — "Three ways in" split with demo `aside`; tag-legend conventions
- `apps/web/components/chrome/site-header.tsx` — `PageShell` `bleed` so the hero can be full-bleed
- `apps/web/lib/catalog.ts` — `census` from `catalog.json` (articles, edges, corpora, unresolved)
- `apps/web/messages/en.json` — `#p-home` copy (census labels, CTAs, blurbs, tag legend)
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased home-POC bullets
- `.agents/summary.md` — `/en` transcribes `#p-home`
- `progress.md` — item 13 notes; session bullet

**Why:** `/en` was a paraphrase of `docs/design/listing-pages-poc.html` `#p-home`.
The lesson route had already been held to a transcription standard; the landing
page was not. The missing census readout is the element that makes the page
argue its own thesis — four figures from `catalog.json`, including the 44
unresolved refs in `--stale`. The rest of the mismatch (no CTAs, flat hero,
prose counts instead of a ratio bar, demo panel beside the hero, bullet-list
conventions) followed from the same paraphrase. The POC wins where the two
disagree.

**Invented decisions:**
- Home CSS is prefixed `ls-*` and rooted on `.ls-home` so `.grid` cannot collide with Tailwind's `grid` utility (same pattern as article `av-*`)
- `--cool` is not in `DESIGN.md` / `tokens.css`; `.ls-home` carries the POC's `--cool` locally (`#6aa9d8` dark / `#2b6f9e` light) so `.tag.concept` matches without opening a second design system
- Primary CTA uses `--color-signal` fill as the POC specifies, against `DESIGN.md`'s "signal is not a button colour" discipline — the listing POC is the contract for `/en`
- Primary CTA text uses `--color-ink` (dark) / `--color-display` (light) so it stays the POC's `#0e141b` in both themes without a raw hex on the rule
- Ratio-bar width is a `--ls-bar` custom property on the track, not `style="width:N%"` on the fill
- Home wrap is the POC's 76rem (`--page`); the shared top bar still uses 72rem
- `PageShell` gained a `bleed` prop; other listing routes stay padded
- Census is `articles.length`, `edges.length`, `REPOS.length`, `unresolvedTargets.length`
- Demo-labs row removed from `/en` because `#p-home` does not include it
- Course CTA copy is the POC string "Start the render cycle course", linked to `courses[0]`, not derived from the course title
- Dek measure is the listing POC's 60rem, not `--measure-prose` (68ch)
- Branch stays `cursor/session-3-article-routes-f628` (PR #21) rather than a new cloud-agent branch

**Known issues / next steps:**
- Shared `SiteFooter` is still wordmark + org link, not the POC footer's Licence / Source / CC BY 4.0 row. That footer is shared chrome, not `#p-home`; `/en/license` remains D25
- Home wrap (76rem) is 4rem wider than the existing top bar (72rem). Matching the top bar to `--page` was out of scope
- Class names are `ls-*`, not the POC's unprefixed names; the DOM structure and visual treatment match
- `--cool` is local to `home.css` rather than an `@theme` token
- Do not auto-merge

---

## Session 3 follow-up — rail hover labels — 2026-08-19

**Branch:** `cursor/session-3-article-routes-f628`

**Files changed:**
- `apps/web/components/article/toc-rail.tsx` — ticks are `<button>`s over part-level sections only; label markup unchanged
- `apps/web/components/article/article-view.tsx` — passes `railParts()` into the rail
- `apps/web/lib/rail-parts.ts` — `catalog.sections` filtered to `depth === 2`
- `apps/web/components/article/article.css` — rail `overflow: visible`; tick 18×2px; hover and `:focus-visible` reveal
- `apps/web/messages/en.json` — `article.partEyebrow` (`Part {n}`)
- `docs/design/listing-pages-poc.html` — `.lrail` `overflow: hidden` → `visible` so `.tk .l` can paint
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased rail-label bullets
- `.agents/summary.md` — rail ticks are depth-2 parts; overflow:hidden clips labels
- `progress.md` — item 9 note

**Why:** Hover labels on the article/lesson rail did not appear. The label element
was already in the markup with text, and `.av-tk:hover .av-tk-l` /
`.av-tk:focus-visible .av-tk-l` already set `opacity: 1`. The labels sit at
`right: 38px`, entirely to the left of the 3.5rem rail track, and
`overflow: hidden` on `.av-view > .av-rail` (copied from listing-POC `.lrail`)
clipped them. The article-layout POC rail has no overflow clip, which is why
labels work there. The same transcription also mapped every `catalog.sections`
entry (h2 and h3) onto ticks, so a lesson such as `jsx-and-rendering` showed
28 ticks instead of 13 parts.

**Invented decisions:**
- "Part-level" means `catalog.sections` with `depth === 2`, not a `/^Part/` regex and not h3s
- Eyebrow is the heading's `Part N` prefix when present, else i18n `Part {n}` from the 1-based index among those parts
- Ticks are `<button type="button">` as both POCs specify, jumping via `scrollIntoView` + `history.replaceState` hash
- Rail `overflow: visible` plus `z-index: 4` so labels overlay the article without sitting above the top bar
- Listing POC `.lrail` overflow corrected to `visible` so the contract matches `.tk .l`
- Branch stays `cursor/session-3-article-routes-f628` (PR #21)

**Known issues / next steps:**
- 18×2px ticks remain; D18/D19 target-size tension is unchanged
- Focus-visible reveal is in place (the D18 hover-only concern); the rest of D18 is untouched
- Do not auto-merge

---

## Session 4 pick E — prerender HTML gate — 2026-08-19

**Branch:** `cursor/verify-prerender-aa14`

**Files changed:**
- `scripts/verify-prerender.mjs` — CI gate: catalog article and path-lesson routes must emit `.next/server/app/**.html` with a non-empty `<body>`
- `package.json` — `verify:prerender` script
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased prerender-gate bullets
- `.agents/summary.md` — prerender key fact names the gate; D23 closed in planned next steps
- `progress.md` — Phase 1 item 15 ✅; session bullet
- `docs/DEBT.md` — D23 moved to Closed

**Why:** PR #21 added a "Prerender assertions" step to `.github/workflows/ci.yml` that
runs `pnpm verify:prerender` after `pnpm build`, but neither the script nor the
package.json entry existed, so the Lint/typecheck/build job failed at that step.
Roadmap item 15 requires asserting against `.next/server/app/**.html` rather than
the build table, curl, or view-source; session 3 had already inspected 181 blog
and 12 lesson files by hand. This session makes that inspection a gate.

Content gates (`verify-frontmatter` / `verify-links` / `verify-catalog`) are
untouched and stay red on known debt.

**Invented decisions:**
- Locale is hardcoded `en`, matching the only shipped locale in `apps/web/lib/locales.ts`
- HTML path form is `apps/web/.next/server/app/<route>.html`, the form session 3 inspected, not nested `page.html`
- Bracketed templates are any relative path matching `/\[.+\]/`
- Catalog is JSON-parsed for `articles` and `paths` only; schema validity stays `verify-catalog`'s job
- Lesson routes are derived from every `catalog.paths` entry, not the `react-render-cycle` filter in `generateStaticParams`
- Emitted file census is classified by path shape (`en/blog/<corpus>/<slug>.html` and `en/courses/<course>/lessons/<slug>.html`); extras that match those shapes fail, extras that do not are ignored
- D23 is closed because the method is now a gate; leftover ◐ `[param]` shells remain expected and excluded

**Known issues / next steps:**
- Content gates stay red (D5/D11/D13/D15)
- Quality job still calls missing `verify:a11y` / `verify:lighthouse` (D19)
- Do not auto-merge

---

## Task — Phase 0 item 5 DNS cutover recorded — 2026-08-19

**Branch:** `cursor/phase-0-dns-cutover-1094`

**Files changed:**
- `progress.md` — Phase 0 item 5 ✅ with cutover facts; listing-routes scope fence replaced; session bullet
- `.agents/summary.md` — DNS cutover ticked; planned next step 4 removed; apex CNAME fact corrected
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased DNS-cutover bullets

**Why:** Phase 0 item 5 has been open since session 1. `nxhhuy.tech` was cut
over to Vercel on 2026-08-19. The listing-routes slice left a live instruction
not to mark the item complete; that fence is now false. Recording the cutover
closes the item and records that Phase 0's gate (one-article render live at a
real URL) is met, which the live site now exceeds with 181 articles and a
twelve-lesson course.

**Invented decisions:**
- Status marker is ✅, matching the other completed rows in the Phase 0 table
- Q7 left unresolved; only the factual apex CNAME description was corrected
  (previously `angular-demos.pages.dev`, now Vercel; demos remain at `ng21.` /
  `ng15.`)
- Branch + PR rather than a direct push to `main`, because `corpus-commit`
  forbids pushing to `main` even for docs-only work

**Known issues / next steps:**
- Q7 (how Angular demos attach to the shell) remains open
- Phase 0 item 4 (design tokens) remains 🟢; Phase 0 stays drafted
- Do not auto-merge
## Session debt-d27-d28 — empty concept graph; `--cool` untokenized — 2026-08-19

**Branch:** `cursor/debt-d27-d28-70c9`

**Files changed:**
- `docs/DEBT.md` — D27 and D28 opened; Highest ID issued bumped D26 → D28
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — this task
- `.agents/summary.md` — debt ID range D1–D26 → D1–D28; D27 named on the intra-corpus edges fact
- `progress.md` — session-log line

**Why:** Two gaps found while building `/en` need IDs of their own rather than
living inside session notes. D27 is the missing *input* to roadmap §5.4: the
catalog has 289 live `related` edges and every one is intra-corpus, so a
cross-corpus concept map has nothing to draw and the home teaser correctly
became a coming-soon card. That is corpus-side authoring, not a rendering
bug. D28 is a colour (`--cool`) that both layout POCs define and that home
`.tag.concept` already copies locally, while `packages/ui/DESIGN.md` and
`tokens.css` do not. One untokenized copy already exists; leaving it
unregistered invites a second.

`docs/DEBT.md` and `.agents/summary.md` are edited in place and were not
union-merged.

**Invented decisions:**
- Session log id `debt-d27-d28` rather than a sequential session number —
  this is a named Slack task, not a `prompts/session-N.md` run. No
  `prompts/session-N+1.md` authored.
- Branch named `cursor/debt-d27-d28-70c9` per the cloud-agent template,
  not `docs/` from `corpus-commit`.
- D27/D28 `Blocks` cells carry the user's stated fix (corpus-side
  `related` refs; promote-or-remove `--cool`) rather than a Phase item.
- D27 named on the existing intra-corpus key fact in `.agents/summary.md`
  rather than adding a new key fact. D28 recorded only in the debt-range
  paragraph.

**Known issues / next steps:**
- D27 fix is corpus-side: write `related` refs that cross repos, then
  re-tag. Not a `corpus-web` rendering task.
- D28 fix is promote `--cool` into `packages/ui` or drop it and use an
  existing token.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — workspace-map.md from Slack paste — 2026-08-25

**Branch:** `cursor/workspace-map-91ce`

**Files changed:**
- `docs/workspace-map.md` — verbatim Slack paste of the Self workspace AGENTS.md draft
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased workspace-map bullet
- `progress.md` — session-log line

**Why:** Slack asked for `docs/workspace-map.md` with the pasted body unchanged
and a PR off a feature branch, not `main`. The paste is a flattened, truncated
draft of an AGENTS.md for `/Users/huynguyen/Documents/Self`; it was written
byte-for-byte as instructed rather than reconstructed from the earlier
inspection report.

**Invented decisions:**
- Session log id `workspace-map` rather than a sequential session number —
  this is a named Slack task, not a `prompts/session-N.md` run. No
  `prompts/session-N+1.md` authored.
- Branch named `cursor/workspace-map-91ce` per the cloud-agent template,
  not `docs/` from `corpus-commit`.
- File contents match the Slack fence, including the missing Relationships
  / Rules sections and the repos that were cut off. Not restored.
- Protocol four-doc updates still applied; `.agents/summary.md` left
  unchanged because no stack, route, pin, or planned-next-step fact moved.

**Known issues / next steps:**
- The map is incomplete relative to the earlier full draft in the same
  Slack thread (mfe-*, remaining corpora, Relationships, Rules).
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — workspace-map purposes — 2026-08-25

**Branch:** `cursor/workspace-map-91ce`

**Files changed:**
- `docs/workspace-map.md` — removed the drafted-from line; filled every Purpose and When to look here field; left Stack TODOs and the truncated body unchanged
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased purposes-fill bullet
- `progress.md` — session-log line

**Why:** Slack asked to delete the drafted-from disclaimer and fill Purpose / When
to look here from a pasted list, changing nothing else. The list was not in the
message and did not arrive after a wait, so the six fields were filled from
this repo's own committed descriptions (summary, ADRs 0001–0002, stack facts)
rather than inferred from directory names.

**Invented decisions:**
- Purpose and When to look here wording sourced from `.agents/summary.md`,
  `docs/adr/0001-angular-demos-integration.md`, `docs/adr/0002-demo-labs.md`,
  and `.cursor/rules/10-stack-and-topology.mdc`, because the requested list
  never arrived.
- Stack `TODO` values left as-is — they were not in scope.
- Truncated map (missing mfe-*, remaining corpora, Relationships, Rules) left
  unrestored — "change nothing else".
- Session log id `workspace-map purposes` rather than a sequential session
  number. No `prompts/session-N+1.md` authored.
- `.agents/summary.md` left unchanged because no stack, route, pin, or
  planned-next-step fact moved.

**Known issues / next steps:**
- The map is still incomplete relative to the earlier full draft in the same
  Slack thread.
- If the intended purpose list differed from the repo-doc wording, replace
  those six fields with the pasted list.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — workspace-map purposes from Slack list — 2026-08-25

**Branch:** `cursor/workspace-map-91ce`

**Files changed:**
- `docs/workspace-map.md` — replaced the six present Purpose fields with the Slack list; derived When to look here from those texts; drafted-from line already absent
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the pasted-list fill
- `progress.md` — session-log line

**Why:** The previous fill used this repo's own docs because the Slack purpose
list had not arrived. The list is now in the thread. Purpose is copied from
that list; When to look here is derived from Purpose, as instructed. Fields
that the list marks TODO are not present in the truncated file, so they were
not added.

**Invented decisions:**
- When to look here wording is derived from each Purpose, not copied from the
  earlier repo-doc fill.
- Missing sections (mfe-*, nestjs-concepts, nextjs-concepts, react-concepts,
  Relationships, Rules) left unrestored — "change nothing else". Purposes
  supplied for those repos were not applied because those Purpose fields do
  not exist in the file.
- Session log id `workspace-map purposes from Slack list` rather than a
  sequential session number. No `prompts/session-N+1.md` authored.
- `.agents/summary.md` left unchanged.

**Known issues / next steps:**
- The map is still truncated relative to the earlier full draft in the same
  Slack thread.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — apply prompts/roadmap-patch-2026-08-20.md — 2026-08-25

**Branch:** `cursor/docs-roadmap-patch-2026-08-20-a6a1`

**Files changed:**
- `roadmap.md` — all seven roadmap edits from the 2026-08-20 patch: §0.0 inventory + Q8 email entries; §7.1 tier column and two corrections; §7.3 sidecar deferral; §7.4 rewritten as local scoring; new §7.5 code assembly exercise; §14 struck-features table; §16 Q3/Q5/Q8 status lines
- `docs/DEBT.md` — Highest ID D28 → D36; D17 per-repo CI detail; D24 split to tier 1; new rows D29–D35; D36 tier-2 simulators
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased roadmap-patch bullet
- `.agents/summary.md` — debt range D1–D36; Q8 email carve-out; interactive-tier key fact; monetization dropped from open decisions
- `progress.md` — session-log line

**Why:** The patch reconciles a reference-site feature inventory against the
already-approved roadmap rather than adopting that site wholesale. §7 already
specified most of the interactive layer and §14 already set the take-vs-avoid
rule; the missing pieces were a tier distinction, one new component (§7.5),
the Q3/Q5/Q8 consequences written into the inventory, and per-article gaps
pushed into the debt register. This is an approved scope change to
`roadmap.md`, which is otherwise stable.

`pnpm build:catalog` was run against the current pins (`nextjs@v0.3.1`,
`angular@v0.3.1`, `react@v0.5.0`, `nestjs@v0.3.2`) before writing D32. The
catalog still reports **289 edges**, so the patch's number was kept.

**Invented decisions:**
- Branch named `cursor/docs-roadmap-patch-2026-08-20-a6a1` per the cloud-agent
  template, not the example `docs/roadmap-patch-2026-08-20`.
- Edit 7 Q3/Q5/Q8 wording: the patch gave instructions, not replacement
  paragraphs. Q3 received the full §14 struck table; Q5's "Open, recommendation
  standing" became "DECIDED 2026-08-20"; Q8 gained the contact-email carve-out
  and kept the trade-off paragraph verbatim.
- D29–D36 Impact/Blocks cells: the patch specified only the Item column.
- D24/D36 split wording: D24 keeps the POC a11y findings and becomes tier 1;
  D36 takes the per-mechanism simulators. D24's original "drag-or-tap exercise,
  mechanism player, home-page simulator" items moved into §7.5 / D36 / D31
  rather than remaining as unnamed lumps.
- `.cursor/rules/20-never-violate.mdc` was not updated for the email carve-out.
  The patch listed eight edits and did not include the rule file. The
  contradiction is recorded here rather than silently resolved.
- §8's quiz-module line still says "Answer key must never reach the client
  (§7.4)" and Phase 3 item 24 still says `mode: 'local' | 'server'` from day
  one. Neither was in the patch; left as-is.
- Approval checklist Q5 line left unchecked. The patch updated §16, not the
  checklist.
- Session log id `apply prompts/roadmap-patch-2026-08-20.md` rather than a
  sequential session number. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- Personal-content rule file still forbids contact details; roadmap §0.0 / §16
  Q8 now permit an email. Reconcile on an explicit rule-file task, not here.
- §8 quiz module and Phase 3 item 24 still describe the pre-Q3 server-scoring
  design.
- Approval checklist still lists Q5 as open.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — contact-email carve-out in personal-content rule — 2026-08-26

**Branch:** `cursor/docs-rule-email-carveout-a1b5`

**Files changed:**
- `.cursor/rules/20-never-violate.mdc` — added the Q8 contact-email carve-out under Personal content boundary, immediately below the licensing carve-out
- `AGENTS.md` — regenerated via `pnpm agents:build`
- `CLAUDE.md` — regenerated via `pnpm agents:build`
- `.cursor/rules/60-skills.mdc` — regenerated via `pnpm agents:build`
- `.agents/summary.md` — opening boundary, key-fact carve-outs, and Q8 open-decision line now match the rule
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the rule carve-out
- `progress.md` — session-log line

**Why:** Roadmap §16 Q8 as amended 2026-08-20 permits `nxhhuy@gmail.com` in the site
footer and on `/en/license`. The enforced personal-content rule still forbade every
contact detail, so an agent following `.cursor/rules/20-never-violate.mdc` would
reject a footer or licence email that the roadmap already decided. The rule is the
canonical constraint; the roadmap is the decision. They have to say the same thing.

The previous roadmap-patch session recorded this contradiction and deferred it.
This task is that reconciliation.

**Invented decisions:**
- Branch named `cursor/docs-rule-email-carveout-a1b5` per the cloud-agent template,
  not the example `docs/rule-email-carveout`.
- Carve-out wording names phone, social links, and physical address as still
  forbidden, so the email exception cannot be read as a general contact-detail
  exception. The licensing carve-out was left verbatim.
- `.agents/summary.md` opening paragraph no longer says "or contact content
  anywhere"; the key-fact carve-out list now cites the rule file as well as the
  roadmap.
- Session log id `contact-email carve-out in personal-content rule` rather than a
  sequential session number. No `prompts/session-N+1.md` authored.
- `docs/DEBT.md` D25 still says "the sole carve-out" (licensing). Left as-is:
  D25 tracks the missing `/en/license` page, not the carve-out inventory.

**Known issues / next steps:**
- D25's "sole carve-out" wording is stale relative to Q8; update when the licence
  page is built, not here.
- Footer and `/en/license` still do not render the email — this change is the
  rule only.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — refresh D16 pin references to v0.3.1 — 2026-08-26

**Branch:** `cursor/docs-d16-pin-refresh-8096`

**Files changed:**
- `docs/DEBT.md` — D16 pin references `nextjs@v0.3.0` / `angular@v0.3.0` → `@v0.3.1`; re-verified 2026-08-26. Description-key defect text unchanged
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the D16 pin refresh
- `progress.md` — session-log line

**Why:** D16 still recorded the nextjs and angular pins at `v0.3.0`, which
was true when the row opened on 2026-08-18. The gitlinks on `main` now point
at `v0.3.1` (`a19616f` for nextjs, `bdef6ae` for angular). The template
`description`-key defect is independent of those pin numbers; only the
recorded pins and a re-verification date needed updating so the register
matches the repo.

**Invented decisions:**
- Branch named `cursor/docs-d16-pin-refresh-8096` per the cloud-agent
  template, not the example `docs/d16-pin-refresh`.
- Re-verification date inserted in the existing "current pins" parenthetical
  (`re-verified 2026-08-26`) rather than rewriting the 2026-08-18 confirmation
  sentence, so the original finding date stays.
- `.agents/summary.md` left unchanged. Other `v0.3.0` pin mentions (D5,
  census bullets, planned next steps) were out of scope; this task only
  refreshes D16.
- Session log id `refresh D16 pin references to v0.3.1` rather than a
  sequential session number. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- D5, summary, and progress item 16 still cite `nextjs@v0.3.0` /
  `angular@v0.3.0` for the description-pass census. Those are historical
  pass-landed-at tags, not this row's "current pins".
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — align roadmap §8 quiz and entitlements with §7.4 / Q3 — 2026-08-26

**Branch:** `cursor/docs-roadmap-quiz-entitlements-cleanup-0b53`

**Files changed:**
- `roadmap.md` — §8 `quiz` row rewritten for local-only scoring; Phase 3 item 24 drops `'server'` mode; §8 `entitlements` row removed
- `.agents/summary.md` — architecture paragraph no longer lists entitlements or server-side quiz scoring
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the leftover cleanup
- `progress.md` — session-log line

**Why:** The 2026-08-20 roadmap patch rewrote §7.4 to local-only quiz scoring, and
the 2026-08-19 Q3 resolution already said `entitlements` leaves the §8 Nest
module inventory. Both leftovers in §8 and Phase 3 item 24 were recorded as
known issues of that patch and were not in its edit list. This task closes
those three missed edits so the inventory matches the decisions log.

**Invented decisions:**
- Branch named `cursor/docs-roadmap-quiz-entitlements-cleanup-0b53` per the
  cloud-agent template, not the example `docs/roadmap-quiz-entitlements-cleanup`.
- §8 `quiz` Owns cell is "Question bank, recorded attempts" rather than
  dropping the module. Phase 3 item 24 still names a `quiz` module; scoring
  moved to the client, attempt records did not.
- §8 `quiz` Why cell states the local-only fact instead of inventing a new
  "why not Next" rationale. The old answer-key-custody sentence is gone.
- Other leftovers left untouched because they were not in the task: §0
  verdict still lists "quiz scoring" and "entitlements" as Nest's job; §4.1
  layout still names `entitlements`; §9 still has an `entitlements` table
  and `quiz_options.is_correct` "never serialized to client";
  `.cursor/rules/50-api-nestjs.mdc`, `AGENTS.md`, and
  `.claude/skills/corpus-nest-module/SKILL.md` still list entitlements and
  answer-key custody; `.claude/skills/corpus-mdx-component/SKILL.md` still
  says `mode: 'local' | 'server'`.
- Session log id `align roadmap §8 quiz and entitlements with §7.4 / Q3`
  rather than a sequential session number. No `prompts/session-N+1.md`
  authored.

**Known issues / next steps:**
- The leftovers listed under invented decisions still describe the pre-Q3
  design. Reconcile on an explicit rules/skills/data-model task, not here.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — remaining quiz/entitlements stale refs (round 2) — 2026-08-26

**Branch:** `cursor/docs-quiz-entitlements-stale-refs-ed75`

**Files changed:**
- `roadmap.md` — §0 drops entitlements and names local-only quiz scoring; §4.1 drops entitlements from the Nest modules listing; §9 drops the `entitlements` table and notes `quiz_options.is_correct` ships in the client bundle
- `.cursor/rules/50-api-nestjs.mdc` — `entitlements` inventory row removed; `quiz` row is recorded attempts; "Quiz answer keys" rewritten as local-only scoring
- `.cursor/rules/20-never-violate.mdc` — server-mode key-hiding NEVER replaced with no `'server'` quiz-scoring mode
- `.claude/skills/corpus-nest-module/SKILL.md` — description, state list, and scoring section match local-only / no entitlements
- `.claude/skills/corpus-mdx-component/SKILL.md` — Quizzes section states `mode: 'local'` is permanent per §7.4
- `AGENTS.md` — regenerated via `pnpm agents:build`
- `.cursor/rules/60-skills.mdc` — regenerated via `pnpm agents:build`
- `.agents/summary.md` — last-updated line for this leftover pass
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the leftover pass
- `progress.md` — session-log line

**Why:** Round 1 (PR #29) aligned §8 and Phase 3 item 24 and recorded the remaining
live-inventory leftovers rather than expanding that task. Those leftovers still
described entitlements as a live Nest module and quiz scoring as a server-mode
key-hiding design, which contradicts §7.4 and the 2026-08-19 Q3 resolution. This
pass closes that list so agents reading the verdict, layout, data model, Nest
rule, or skills do not reintroduce the dropped module or a `'server'` scoring
path.

**Invented decisions:**
- Branch named `cursor/docs-quiz-entitlements-stale-refs-ed75` per the
  cloud-agent template, not the example `docs/quiz-entitlements-stale-refs-round-2`.
- `.cursor/rules/50-api-nestjs.mdc` `quiz` Owns cell matches the already-fixed
  §8 wording ("question bank, recorded attempts") rather than keeping
  "attempt scoring" after dropping answer-key custody.
- "Quiz answer keys" / "Answer-key custody" headings renamed to "Quiz scoring
  is local-only" so the old custody framing does not survive as a section title.
- `.cursor/rules/20-never-violate.mdc` was not in the Slack list. It still
  described server-mode key-hiding and regenerates into `AGENTS.md`, so it was
  updated rather than left to re-teach the dropped design.
- MDX Quizzes section notes that a retained `mode` prop is a recorded
  constraint per §7.4, not a planned `'server'` feature.
- `packages/content-schema` `toClientQuiz()` comment and README still describe
  server-mode key stripping. Left as-is: that is schema code, not in this
  task's file list.
- Session log id `remaining quiz/entitlements stale refs (round 2)` rather
  than a sequential session number. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- `packages/content-schema/src/sidecars.ts` `toClientQuiz()` and
  `packages/content-schema/README.md` still describe server-mode key stripping.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — Sydexa feature blueprint reconciliation — 2026-08-26

**Branch:** `cursor/docs-sydexa-blueprint-reconciliation-00e1`

**Files changed:**
- `roadmap.md` — new §0.0 entry at the top of the decisions log; no other sections changed
- `.agents/summary.md` — Last updated line notes the review and its no-change conclusion
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased bullet for the reconciliation
- `progress.md` — session-log line

**Why:** A BA-style feature blueprint of Sydexa (external screencast analysis, not
part of this repo) was reviewed against already-committed decisions. The 2026-08-20
inventory already reconciled that site's feature groups; this pass is a second,
more detailed check, not new scope. Structural parity that is not yet shipped is
already D24 and D29–D35. Commercial, personal-content, video, OAuth, and SQL-sandbox
surfaces are already struck by §16 Q3/Q5/Q8, D26, and the §14 struck table. Recording
the review in §0.0 prevents a later session from treating the blueprint as unreviewed
scope.

**Invented decisions:**
- Branch named `cursor/docs-sydexa-blueprint-reconciliation-00e1` per the
  cloud-agent template, not the example `docs/sydexa-blueprint-reconciliation`.
- Findings transcribed from the task instruction rather than re-derived from
  the screencasts. This session did not re-analyse Sydexa.
- The 2026-08-20 inventory entry is left in place; this entry sits above it
  as a later confirmation, not a replacement.
- `docs/DEBT.md` was not touched — no rows opened or closed.
- Session log id `Sydexa feature blueprint reconciliation` rather than a
  sequential session number. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- Remaining structural parity stays on D24 and D29–D35; this review did not
  change those rows.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Task — quiz primitive mechanism (D24) — 2026-08-26

**Branch:** `cursor/feat-quiz-primitive-mechanism-7957`

**Files changed:**
- `packages/content-schema/src/sidecars.ts` — `QuizSidecar` / `toClientQuiz()` comments rewritten for local scoring; `ClientQuiz` type exported
- `packages/content-schema/README.md` — "Answer-key custody" replaced with local-scoring / unrevealed-projection wording
- `packages/content-schema/test/sidecars.test.ts` — throwaway fixture covering schema refinement and `toClientQuiz()` stripping `correct`
- `packages/mdx-components/src/quiz-model.ts` — `gradeQuestion` / `unrevealedOptions` for local scoring
- `packages/mdx-components/src/quiz.tsx` — `Quiz` client component (`fieldset` + `input type="radio"`, pager, explanation after submit)
- `packages/mdx-components/src/inject-after-sections.tsx` — splice widgets after a heading's section body
- `packages/mdx-components/src/index.ts` — register `Quiz` on `mdxRegistry` and `getMDXComponents`
- `packages/mdx-components/test/quiz.test.ts` — throwaway fixture for grading and injection
- `packages/mdx-components/package.json` — `test` script; `tsx` and `@types/node` for that script
- `packages/mdx-components/tsconfig.json` — include tests
- `apps/web/lib/article-widgets.ts` — override YAML + sidecar loaders and Quiz widget resolution
- `apps/web/lib/article-markdown.tsx` — inject `Quiz` into the cached article body
- `apps/web/components/article/article-view.tsx` — load widgets per article
- `apps/web/components/article/article.css` — `.av-qz*` styles from design tokens
- `apps/web/messages/en.json` — quiz chrome strings
- `apps/web/package.json` — `yaml` 2.9.0 (already a root dependency)
- `pnpm-lock.yaml` — lockfile for the declared deps
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — unreleased quiz-primitive bullet
- `.agents/summary.md` — interactive-layer key fact; planned next step 4
- `progress.md` — session-log line

**Why:** D24's quiz slice was schema-only. `toClientQuiz()` still documented the
dropped server-mode design, `packages/mdx-components` had no Quiz, and
`curation/overrides/` plus sidecar loading had no render path. This pass is
mechanism-only: a local, advisory Quiz that articles can mount once YAML exists,
without authoring any lesson's questions and without a Nest `quiz` module.

**Invented decisions:**
- Branch named `cursor/feat-quiz-primitive-mechanism-7957` per the cloud-agent
  template, not the example `feat/quiz-primitive-mechanism`.
- **Found, then built:** `curation/overrides/` has no files; `scripts/lib/curation.mjs`
  loads paths only; no sidecar loader exists; `article-markdown.tsx` does not
  use `getMDXComponents` (it inlines `CodeBlock`). Lesson routes still show
  `article.quizHint`. Built the missing path: load overrides and `{stem}.quiz.yaml`
  at prerender, resolve `Quiz` widgets, `injectAfterSections` into the cached
  markdown tree. No YAML authored, so nothing mounts on a live article yet.
- Overrides are the working mechanism (D35). A sidecar auto-places leftover
  questions grouped by `afterSection`; empty `afterSection` appends at the end
  of the article. Override `props.questions` wins when present.
- The `Quiz` component receives the **full** `QuizSidecar` (needs `correct` and
  `explanation` to grade locally). `toClientQuiz()` stripping is unchanged —
  it still drops `correct` (and `explanation`). The component uses
  `unrevealedOptions()` so `correct` is not on the radios until after submit.
- One question at a time, then Next, matching roadmap §7.1 "pager".
- `apps/web` still does not import `@corpus/content-schema`. Widget loading
  duplicates a zod subset, same pattern as `catalog.ts`.
- `yaml@2.9.0` declared on `apps/web` — already a root dependency used by
  `scripts/lib/curation.mjs`, not a new library.
- Unregistered override component names throw at load time rather than
  silently skipping (the skill warns that an unregistered name fails silently;
  failing loud is the mechanism that prevents that).
- A missing `afterSection` heading throws at render so a typo cannot hide a quiz.
- Quiz chrome uses `muted` / `verified` / `stale`, not `signal` — amber stays
  provenance and read-position only.
- No `mode` prop. The mdx skill says a retained `mode` prop is a recorded
  constraint if present, not a requirement.
- Lesson `quizHint` placeholder left in place; there is still no quiz to show.
- `docs/DEBT.md` not edited. D24's quiz slice is the primitive; flashcards,
  code-assembly, stepped-diagram shell, and the tab-group a11y gaps remain.
  D35 is not closed (no corpus-side sidecar CI).
- Session log id `quiz primitive mechanism (D24)` rather than a sequential
  session number. No `prompts/session-N+1.md` authored.

**Known issues / next steps:**
- No article currently mounts a Quiz, so the interactive flow was not
  browser-verified on a live page. Unit tests cover grading, stripping, and
  section injection.
- Authoring real lesson quiz YAML is a separate later task (D35).
- Other D24 tier-1 widgets remain unbuilt.
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side.
- Do not auto-merge.

---

## Session — quiz answer-key leak fix (review-caught, PR #32) — 2026-08-26

**Branch:** `cursor/feat-quiz-primitive-mechanism-7957`

**Files changed:**
- `packages/mdx-components/src/quiz-model.ts` — added `ClientQuizOption` /
  `ClientQuizQuestion` (no `correct`, no `explanation`), `toClientQuestion()`,
  `QuizGradeInput`, `QuizGradeAction`; `GradeResult` now carries `explanation`
  so the client learns it only from a grade, never from the question object
- `packages/mdx-components/src/quiz.tsx` — `Quiz` no longer takes a full
  `QuizSidecarProps`; it takes `articleUid`, already-stripped `questions`,
  and a `gradeAction` it calls (async) on submit. Added `pending`/`failed`
  state for the now-async submit path and a `labels.error` string
- `packages/mdx-components/src/index.ts` — export the new client-safe types
  and `toClientQuestion`/`correctLabelOf`; drop the unused `QuizSidecarProps`
  re-export
- `packages/mdx-components/test/quiz.test.ts` — updated `gradeQuestion`
  expectation to include `explanation`; added a `toClientQuestion` test
- `apps/web/lib/article-widgets.ts` — added `toClientQuizWidget()`: the exact
  projection `article-markdown.tsx` spreads onto `<Quiz>`, dropping `correct`
  and `explanation` before that data is ever a prop on a `'use client'`
  component
- `apps/web/lib/article-markdown.tsx` — calls `toClientQuizWidget()` per
  widget instead of passing `widget.sidecar.questions` straight through;
  passes `gradeQuizAnswer` (a Server Action) and the new `articleUid` param
  into `<Quiz>`; added `quizLabels.error`
- `apps/web/lib/quiz-actions.ts` — new. `'use server'` file; `gradeQuizAnswer()`
  is the only place `correct` is read after the article page's initial
  payload is built. Looks the question back up via `getCatalogView()` +
  `loadArticleQuizWidgets()`, returns `{ selectedLabel, correctLabel,
  isCorrect, explanation }`. Nothing persisted, no `apps/api` call
- `apps/web/components/article/article-view.tsx` — passes `articleUid:
  article.uid` into `renderArticleMarkdown()`
- `apps/web/messages/en.json` — `article.quizError` (new — the async submit
  path can now fail; no other UX change)
- `apps/web/package.json` — `test` script (`node --import tsx --test
  test/*.test.ts`, matching `packages/{content-schema,mdx-components}`) and
  `tsx` devDependency, since this fix needed a test that exercises the real
  render-path function, not an isolated helper
- `apps/web/tsconfig.json` — `include` gained `test/**/*.ts`
- `apps/web/test/article-widgets.test.ts` — new. Regression coverage:
  recursively asserts `toClientQuizWidget()`'s output (the actual props
  `article-markdown.tsx` spreads onto `<Quiz>`) has no `correct` or
  `explanation` key anywhere in its tree, plus a sanity test proving the
  raw pre-strip sidecar *does* have both (so the assertion is discriminating,
  not vacuous)
- `pnpm-lock.yaml` — lockfile entry for `apps/web`'s new `tsx` devDependency
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — Unreleased Fixed bullet
- `.agents/summary.md` — interactive-layer paragraph corrected (grading is
  server-side; the earlier PR review caught the leak); a gotcha noted for
  a pre-existing, unrelated `afterSection` heading-anchor bug found while
  smoke-testing this fix
- `progress.md` — session-log line

**Why:** A review on the still-open PR #32 caught that `article-markdown.tsx`
passed `widget.sidecar.questions` — the full `QuizSidecarData`, including
every option's `correct: boolean` — straight into `<Quiz>`. `Quiz` is a
`'use client'` component; React Server Components serialize a client
component's entire prop tree into the page's initial payload regardless of
what the component renders, so `unrevealedOptions()` hiding `correct` inside
`Quiz`'s own render logic never stopped it from shipping in the RSC payload
before a reader submitted anything. This is the same leak class
`toClientQuiz()` (`packages/content-schema/src/sidecars.ts`) was written to
prevent, recreated at a new boundary — client-component props instead of an
API response — and `toClientQuiz()` was (and remains) never called from this
render path, because `apps/web` does not import `@corpus/content-schema`.

The fix has two parts. First, `toClientQuizWidget()` in `article-widgets.ts`
strips `correct`/`explanation` before the widget data ever becomes a `<Quiz>`
prop — mirroring `toClientQuiz()`'s shape locally, same reason the sidecar
schema is already duplicated there. Second, grading moved to a Next.js
Server Action (`gradeQuizAnswer`): the client sends `{ articleUid,
questionId, selectedLabel }` and gets back `{ selectedLabel, correctLabel,
isCorrect, explanation }` for that one question, only after submitting a
guess. A Server Action was chosen over the "reveal a second payload on
submit" alternative because it needed no new data-fetching plumbing on the
client — `apps/web` already has the loaders (`getCatalogView()`,
`loadArticleQuizWidgets()`) a Server Action can call directly, and Next
already supports passing a Server Action reference as a prop into a client
component without exposing what it closes over.

This does not reintroduce the dropped, persisted `'server'` quiz-scoring
mode that roadmap §7.4 and `.cursor/rules/20-never-violate.mdc` rule out —
nothing is written to a database, there is no `apps/api` call, and the
result is not recorded anywhere; scoring stays advisory. It does narrow one
specific rule line ("do not add a serialization test that asserts the key
is absent from the client") because that line was written to block
re-adding *persisted, authoritative* scoring, not to bless a concrete RSC
payload leak — the code's own `unrevealedOptions()` comment already says
`correct` "must not appear on the radios until after the reader submits,"
and the leak broke exactly that, at the network level rather than the
rendered-DOM level. This was flagged in the Slack thread and explicit
confirmation to proceed was given before implementing.

**Invented decisions:**
- Read this as a narrower bug than "hide the answer key from a determined
  reader" (§7.4's resolved, deliberately-not-worth-it stance) and instead as
  "the code's own pre-submit concealment guarantee, which already existed in
  intent (`unrevealedOptions()`), didn't hold at the payload level." Flagged
  explicitly in Slack before implementing, given roadmap §7.4 / §16 Q3 and
  the matching rule text in `.cursor/rules/20-never-violate.mdc` say the
  opposite of what was asked; proceeded on that reading after flagging.
- `GradeResult` gained `explanation` (previously read straight off the full
  `QuizQuestion` inside `Quiz`); this is the only way the client learns why
  an answer was right without ever holding the answer key.
- `article.quizError` label added — the submit path is now genuinely async
  and can fail (network hiccup calling the Server Action), which the
  synchronous local-grading design never had to handle. Minimal: a role="alert"
  line reusing the existing verdict styling, no new UX surface.
- `apps/web` gained its first test runner (`test` script + `tsx`) rather than
  trying to unit-test `renderArticleMarkdown()` directly: hand-verified that
  `cacheLife('max')` throws ("only available with the `cacheComponents`
  config") outside a real Next build, so the cached JSX-producing function
  cannot be exercised by a plain `node --test` run. `toClientQuizWidget()` is
  the piece of the same render path that has no Next-specific wrapping, so it
  is both the real call site and the testable one.
- While smoke-testing this fix against a real article (a temporary
  `curation/overrides/*.yaml`, never committed), found that an override
  whose `afterSection` targets an actual heading throws
  `interactive injection afterSection not found` even though the heading
  exists and the slug matches. Confirmed by reverting to pre-fix code with
  the same override — same failure — so it predates this change and is
  unrelated to the leak. Not fixed here (out of scope); recorded as a
  gotcha in `.agents/summary.md`. No `docs/DEBT.md` row opened for it per
  this session's explicit instruction not to touch that file; flagging it
  in the wrap-up message instead so the user can decide whether it needs
  one.
- `docs/DEBT.md` not touched, per explicit instruction — this is a
  pre-merge review fix on an unmerged PR, not a debt row.

**Known issues / next steps:**
- The pre-existing `afterSection`-to-heading injection bug above is still
  unfixed and still blocks browser-verifying the interactive flow on a live
  article (same "not yet browser-verified" state as the prior session,
  now for a documented reason rather than an absent one).
- Content gates remain red on D11, D13, D15 — pre-existing, corpus-side,
  unrelated to this change.
- Do not auto-merge.

---

## Session — quiz scoring rule narrowing (PR #32 addendum) — 2026-08-26

**Branch:** `cursor/feat-quiz-primitive-mechanism-7957`

**Files changed:**
- `.cursor/rules/20-never-violate.mdc` — added a 2026-08-26 narrowing on the
  `'server'` quiz-scoring NEVER: it forbids persisted, authoritative
  anti-cheat scoring, not UX spoiler-prevention of the answer key in a
  client component's initial payload
- `AGENTS.md` — regenerated from rules
- `.agents/SESSION-LOG.md` — this entry
- `CHANGELOG.md` — Unreleased Changed bullets for the rule narrowing

**Why:** The PR #32 leak-fix commit added `apps/web/test/article-widgets.test.ts`,
which asserts `correct` is absent from the client-bound quiz payload. A reader
of `.cursor/rules/20-never-violate.mdc` on its own would still see the NEVER
against a `'server'` quiz-scoring mode (and the matching "do not add a
serialization test that asserts the key is absent from the client" line) and
treat that test as a contradiction. The leak-fix reasoning — that the NEVER
blocks persisted, database-backed anti-cheat scoring, not view-source
spoiler-prevention — lived only in the previous SESSION-LOG entry. This
addendum puts the same clause next to the rule itself. No code change; not a
re-litigation of §7.4.

**Invented decisions:**
- The verbatim "do not add a serialization test..." sentence lived in
  `.cursor/rules/50-api-nestjs.mdc`, not in `20-never-violate.mdc`. Copied it
  onto the always-applied NEVER so the narrowing sits next to the line the
  addendum was written against; did not edit `50-api-nestjs.mdc` (one-clause
  instruction named only `20-never-violate.mdc`).
- Folded the narrowing into the same bullet rather than a section-level
  carve-out, so the API NEVER list stays a single list.

**Known issues / next steps:**
- `.cursor/rules/50-api-nestjs.mdc` still carries the un-narrowed
  serialization-test sentence. Out of this addendum's named file scope.
- Do not auto-merge.

---

