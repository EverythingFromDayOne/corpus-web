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
