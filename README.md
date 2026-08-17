# corpus-web

The delivery surface for the `EverythingFromDayOne` concepts suite. Renders four
standalone corpus repos into one site at `nxhhuy.tech`, and adds the retention layer
— progress, quizzes, spaced repetition — that standalone markdown cannot provide.

**This repo does not author content.** The four corpora stay canonical; they are
consumed here as git submodules pinned to tags.

---

## Start here

**If you are a coding agent:** read [`AGENTS.md`](./AGENTS.md), then follow the
FIRST ACTION section it contains. Do not explore the repo first.

**If you are a human:** read [`roadmap.md`](./roadmap.md) for the architecture and
the phase plan, then [`progress.md`](./progress.md) for where things actually stand.

---

## Document map

Every document is authoritative for exactly one thing. When two disagree, the one
listed here wins for its own column — do not sync them to each other.

| Document | Authoritative for | Lifecycle |
|---|---|---|
| [`.cursor/rules/*.mdc`](./.cursor/rules) | Constraints and conventions | Edited in place. **Canonical** — `AGENTS.md`, `CLAUDE.md` and `60-skills.mdc` are generated from these |
| [`.claude/skills/*/SKILL.md`](./.claude/skills) | Task procedures | Edited in place. Loaded when a task matches the description |
| [`AGENTS.md`](./AGENTS.md) | Agent entry point | **Generated.** Never hand-edit |
| [`roadmap.md`](./roadmap.md) | Architecture, decisions, phase plan | Stable. Changes only on an approved scope change. Carries orders of magnitude, never exact counts |
| [`progress.md`](./progress.md) | Phase and item status, measured counts | Edited in place, every session |
| [`docs/DEBT.md`](./docs/DEBT.md) | Known gaps, with IDs | Append-only IDs, **never reused**. Rows edited in place |
| [`.agents/SESSION-LOG.md`](./.agents/SESSION-LOG.md) | What happened and **why**, incl. invented decisions | Append-only. One entry per session |
| [`CHANGELOG.md`](./CHANGELOG.md) | What changed, in release terms | Append-only. Bullets only — reasoning belongs in the session log |
| [`docs/adr/`](./docs/adr) | Decisions with alternatives and consequences | Append-only. Status changes in place |
| [`docs/audit/`](./docs/audit) | Point-in-time measurements | Immutable once written. Dated filenames |
| [`docs/design/`](./docs/design) | Visual contracts | Replaced wholesale when the design moves |
| [`prompts/session-N.md`](./prompts) | The scope of one session | Immutable once run. Annotated, never rewritten |

**The distinction that matters most:** `roadmap.md` says *"four corpora, ~200
articles"* and never changes; `progress.md` says *"197 selected, 181 adapting"* and
changes every session. Syncing one to the other destroys the property that makes
each useful.

---

## Architecture in one paragraph

Content is build-time. Next.js 16.3 with Cache Components owns rendering, and
Postgres is never in the read path for an article body. NestJS 11 owns everything
user-specific — auth, progress, quiz scoring, flashcard scheduling. The test for any
endpoint: **if the API were down, would reading break?** If yes, it is in the wrong
service. An API outage degrades the site to a read-only corpus, never to a blank page.

Full reasoning in [`roadmap.md`](./roadmap.md); the monorepo decision is §4.0.

---

## Layout

```
apps/web                  Next.js 16.3 — rendering, corpus, landing
apps/api                  NestJS 11    — auth, progress, quiz, srs, catalog
packages/content-schema   zod schemas, per-corpus frontmatter adapters, catalog shape
packages/ui               design tokens + owned primitives
packages/mdx-components   the interactive layer
packages/api-client       GENERATED from Nest OpenAPI — never hand-edited
content/                  FOUR SUBMODULES (gitlinks) — never edited from this repo
curation/                 paths/*.yaml, overrides/*.yaml
docs/                     adr/ · audit/ · design/ · DEBT.md
scripts/                  sync, catalog, verify gates, agent-doc generation
prompts/                  session prompts, committed before invocation
```

---

## Content

Four mounted corpora, pinned to tags. `progress.md` is authoritative for counts.

| Mount | Repo | Default branch |
|---|---|---|
| `content/nextjs` | `nextjs-concepts` | `main` |
| `content/react` | `react-concepts` | `master` |
| `content/angular` | `angular-concepts` | `master` |
| `content/nestjs` | `nestjs-concepts` | `main` |

Not corpora: `dsa-concepts` is a planned corpus with no remote yet;
`demo-auth-concepts`, `demo-authz-concepts` and `demo-attacked-web` are runnable demo
apps — see [`docs/adr/0002-demo-labs.md`](./docs/adr/0002-demo-labs.md).

---

## Commands

```bash
pnpm install            # runs submodule init via postinstall
pnpm agents:build       # regenerate AGENTS.md, CLAUDE.md, 60-skills.mdc
pnpm agents:check       # CI drift gate for the above
pnpm sync:content
pnpm build:catalog
pnpm verify:submodules  # every submodule on a tag, none dirty
pnpm verify:frontmatter
pnpm verify:links
pnpm verify:catalog
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

**Clone with submodules**, or `content/` arrives empty:

```bash
git clone --recurse-submodules https://github.com/EverythingFromDayOne/corpus-web.git
# already cloned without it:
git submodule update --init --recursive
```

---

## Conventions that bite

**Never edit anything under `content/`.** Those are gitlinks into four standalone
repos. Editing through the bookmark edits the other book, and `verify-submodules`
fails on any dirty submodule. Content changes go: edit in the corpus repo → tag →
`/promote-content` here.

**`progress.md`, `.agents/summary.md` and `docs/DEBT.md` are edited in place and must
never be union-merged.** `.gitattributes` covers only the two append-only files. Six
union-merges corrupted both trackers during one round of promotions and cost a full
session to repair.

**Debt IDs are append-only and never reused.** Three sessions independently assigned
D12 and D13 to different items before this was written down.

**`AGENTS.md`, `CLAUDE.md` and `.cursor/rules/60-skills.mdc` are generated.** Edit the
source and run `pnpm agents:build`; CI fails on drift.

**Gates are red for tracked reasons.** See [`docs/DEBT.md`](./docs/DEBT.md) and issue
#3. Any failure not listed there is new — investigate rather than assuming it is known.

---

## Licence

Content is CC BY 4.0 from the corpus repos. Code in this repo is MIT.
