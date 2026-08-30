# Hermes-Coding handover kit — corpus-web

> **What this is.** A one-shot context pack that hands a stateless
> sub-agent everything it needs to do useful work in this repo in
> one prompt, with no follow-up turns. Load this file alongside
> `prompts/HANDOFF-session-protocol.md` and the named task prompt.
>
> **What this is NOT.** A replacement for `AGENTS.md`. The rules
> there are canonical and immutable; this file is a curated
> briefing that cites them.

---

## 0. Read order — non-negotiable

Before anything else, read these files IN ORDER. Do not skip, do not
parallelize, do not run any other command before the first five are
in context:

1. `.agents/summary.md` — agent snapshot, **read first**
2. `.agents/SESSION-LOG.md` — append-only history; read top entry
   and the `## Phase 0 / Phase 1` entries for current state
3. `CHANGELOG.md` — read `## [Unreleased]` and the last 3 dated
   blocks to know what's shipping
4. `roadmap.md` — §0.0 Decisions log and the section covering your
   task (§5–§8 if you're working on the web app, §9–§10 if on the
   API, etc.)
5. `progress.md` — current phase table + the most recent
   **Session log** entries (top of file)
6. `docs/DEBT.md` — top of file for "Highest ID issued," then
   the relevant open rows (don't read closed rows unless the
   task explicitly closes them)

After the first five, IF a `prompts/HANDOFF-session-protocol.md`
supplement is attached, read it next. Then IF a `prompts/session-N.md`
or task-specific prompt is named, read it last.

After all six sources are in context, **state your read of the
scope in one sentence** (what you're doing and what's out of scope)
before doing anything.

---

## 1. What this repo is, in one paragraph

`corpus-web` is the delivery surface for the `EverythingFromDayOne`
concepts suite. It renders ~196 articles from four standalone corpus
repos (`content/{nextjs,react,angular,nestjs}`, each a git submodule
pinned to a tag) into one site at `nxhhuy.tech`, and runs a course
catalog over a subset of those articles. Four corpora, one graph,
one deployment.

It is a monorepo (Turborepo + pnpm) with two apps (`apps/web`,
`apps/api`), four shared packages (`packages/{content-schema,ui,mdx-components,api-client}`),
hand-authored curation (`curation/overrides/*.yaml`, `curation/paths/*.yaml`),
and four content submodules. Built and deployed to Vercel with
edge + Node SSR; Cache Components is non-negotiable (don't disable).

---

## 2. Stack versions — pin these in your head

| Component | Version | Notes |
|---|---|---|
| Node | `apps/web` Node 22, `apps/api` Node 24 | shared packages pin `@types/node ^22` |
| `pnpm` | workspace protocol | use the project's pinned pnpm via `corepack` or install |
| `next` | `16.3.x` | Cache Components ON; App Router only; never Pages Router |
| `tailwindcss` | `4.3.x` | `@theme` tokens, no raw hex, no inline styles |
| `@nestjs/common` | `>=9.3.2` (production) and class-validator `>=0.14.2` | `ValidationPipe({forbidUnknownValues:true})` requires explicit `true` |
| TypeScript | `strict + noUncheckedIndexedAccess + verbatimModuleSyntax` | unused params allowed, unused locals fail |

`.agents/summary.md` §"Stack versions" carries the live list. If
your task would land in any of these versions, check there first.

---

## 3. Hard constraints — pick from this list if relevant

The full list lives in `.cursor/rules/20-never-violate.mdc`. These
are the ones sub-agents most often trip on. **All `NEVER` rules apply
unless the prompt explicitly overrides them.**

### Content (most violated)

- **NEVER edit anything under `content/`.** The four corpora are
  submodules, owned by their own repos. Any change there is a
  separate PR against the corpus, then a submodule bump here.
- **NEVER add site-specific MDX components into a corpus article.**
  Use `curation/overrides/*.yaml` injection. Reason: GitHub is
  the only reader of corpus source right now; an `<EventLoopSim />`
  in the article breaks GitHub rendering.
- **NEVER hand-write a code block into an article.** Code is
  extracted verbatim from verified demos by build scripts.
- **NEVER auto-merge a content promotion PR.** Bumping a
  submodule pointer is a human decision.

### Web

- **NEVER disable Cache Components.** The site is the proof-of-work
  for the `nextjs-concepts` thesis. Turning it off forfeits the
  argument.
- **NEVER use Pages Router.** App Router only.
- **NEVER use inline styles or raw hex.** Tailwind v4 utilities +
  `@theme` tokens only.
- **NEVER put business logic in `apps/web/app/api/`.** BFF only —
  session cookie proxying, nothing else.
- **NEVER hand-write a fetch to `api.nxhhuy.tech`.** Use
  `packages/api-client` (OpenAPI-generated, swagger-decorated).
- **NEVER verify prerendered shell content with `curl` or
  view-source.** The response is streamed. Inspect
  `.next/server/app/<route>.html` directly.
- **NEVER hardcode a user-visible string.** All routes live under
  `/[locale]/`; strings go through the message catalogue even
  while `en` is the only shipped locale.
- **NEVER use scroll listeners for the TOC rail.**
  `IntersectionObserver`.

### Personal-content boundary (no exceptions)

- **NEVER add an About, Bio, Team, Hire Me, or Contact page.**
- **NEVER add a name, photo, avatar, job title, employer, client,
  colleague, prior project, location, or contact detail** to any
  page, component, or asset.
- **NEVER emit `Person` JSON-LD or `<meta name="author">`.**
- **NEVER seed demo or fixture data with real names.**

**Carve-out:** `nxhhuy@gmail.com` may appear in the footer and on
`/en/license`. That's the entire contact surface. CC BY 4.0
attribution on `/en/license` is required — naming the copyright
holder is a legal requirement, not bio.

If a task requires personal content, **stop and ask**, don't infer.

---

## 4. Verification chain — the gates to run before declaring done

Always run, in order, and ALL must pass before a "done" verdict:

```bash
pnpm typecheck                      # 5/5 packages must pass
pnpm --filter @corpus/web build     # 236/236 static pages must pass
pnpm verify:prerender               # 196/196 blog + 18/18 lesson HTML
```

Plus, when relevant:

```bash
pnpm verify:frontmatter             # 196/196 articles adapt
pnpm verify:links                   # may fail pre-existing D13 (44/33); record in body, don't chase
```

**Gates that may legitimately fail:**

- `verify:links` — pre-existing D13 (44 unresolved refs across 33
  distinct targets in `nextjs` and `nestjs` corpora). Not your job.
  Record the failure in the PR body under a "Known issues" heading.

**Verification on Vercel Preview** (when your task hits a route):

- Open the Preview URL in a real browser, not curl. Cache Components
  streaming renders nothing meaningful to `curl`.
- Use Vercel Preview **for visual smoke, not authority**. Authority
  is local `pnpm build` + the four verification gates above.

---

## 5. Commit + PR workflow

### Branches and targets

- `main` — production, deployed to `nxhhuy.tech`. Admin-enforced.
  Branching off it is fine; merging requires admin.
- `develop` — pre-production mirror, deployed to
  `develop.nxhhuy.tech`. Lighter protection; linear history required.
- Feature work: branch off `main` or off `develop` depending on
  what you intend to ship to.
  - **Polish / additive work** → branch off `main` → PR to `develop`
    → squash-merge. This is the PR #86, #89, #90, #91 pattern.
  - **Release work** → branch off `develop` → PR to `main` →
    admin-squash. This is the develop→main promotion (PR #57, #61,
    #66, #69, etc.). One release PR per session at most.
- **Promotion is a separate decision.** Don't open a
  develop→main release PR unless the user has explicitly decided
  to promote. Always ask first.

### Commit conventions

- **Conventional Commits** style prefixes: `feat:` `fix:` `docs:`
  `chore:` `refactor:` `style:` `test:` `perf:`
- Subject ≤ 72 chars, imperative mood, no trailing period
- Multi-file work gets **one** commit per logical change; PR can
  carry 1–N commits but pattern is **small N, not N=M**
- **Doc wrap is a separate commit.** After all feature commits:
  - one `docs(session): wrap the 4 canonical state files for PR #N`
    commit that touches `.agents/SESSION-LOG.md`, `.agents/summary.md`,
    `CHANGELOG.md`, `progress.md`
- **Use `-F /tmp/<name>.txt`** for commit messages that contain
  backticks, fenced code blocks, or shell commands — shell will
  interpret backticks as command substitution otherwise.

### PR body shape

```
feat(scope): 1-line subject (≤72 chars)

[Body paragraphs explaining what + why + deviations from prompt.
Disclose every invented decision here.]

## Files changed
[short list — long lists go to SESSION-LOG only]

## Verification
[typecheck / build / prerender / frontmatter / links results]

## Known issues
[anything deferred or in-scope-but-untouched]
```

### Squash-merge only

- Always `--squash` on merge. Never `--merge` or `--rebase`. Linear
  history is enforced on `main` and `develop`.

---

## 6. Message catalogue rule (i18n)

Every user-visible string in `apps/web` lives under
`apps/web/messages/en.json`. Adding a new key:

```json
{
  "myFeature": {
    "label": "My label",
    "action": "My action"
  }
}
```

Then read in code via:

```ts
import { t, type Messages } from '@/lib/i18n';
const label = t(messages, 'myFeature.label');
```

**Pattern:** keys nest under existing namespace blocks. Top-level
`share.label` throws `Missing message` at prerender; `article.share.label`
matches the `article.sectionDividerLabel` precedent. **Typecheck does NOT
catch this — only the build prerender does.** When the prompt's example
contradicts the existing file, the file wins.

Also: the layout **always sets `data-blog` on `<html>`** for blog routes
(spec §14). Tokens behind `[data-blog]` only fire inside blog chrome.

---

## 7. Sub-agent discipline — invented decisions

The agent's `#1 failure mode** is silently filling in gaps with
plausible-but-wrong choices. The protocol:

1. **State the scope in one sentence** before doing anything.
2. **For every choice the prompt didn't specify, name it.** Format:
   "**Invented decision N**: [what]. [why]. [citation or precedent]."
3. If a choice would be a major deviation (different library,
   breaking change, content touched), **stop and ask**. Don't
   guess-and-go.
4. Never silently assume "the user probably wanted X." A silent
   assumption is a failed session even when it happened to be right.

Document all invented decisions in `.agents/SESSION-LOG.md` under
`**Invented decisions:**` heading at end-of-session, even trivial ones.

---

## 8. Brand-string guard

This site publishes a corpus, not itself. Before merging any of
your changes, grep modified files for:

```bash
grep -ciE '\b(sydexa|100 days|ng-|nxhhuy@|vercel|tailwind)\b' \
  apps/web/components/<your-file>.tsx apps/web/app/<your-dir>/*.tsx
```

Expected result: **0**. If non-zero, you have a brand-string leak,
fix it before committing.

Personal-content boundary check is its own grep:

```bash
grep -ciE '\b(author|byline|about|bio|hire me|contact)\b' \
  apps/web/components/<your-file>.tsx
```

Expected: **0**.

---

## 9. Review-first for sub-agent drafts

When you (the sub-agent) author a multi-page artifact — a
spec, a schema, a refactor — **save the draft but do not commit
until user has reviewed**. Pattern from PR #88 (blog spec 1296-line
draft): write the draft to `/tmp/<task>-draft.md` AND in-place to
the destination path; the user reviews; on "go" you commit the
trimmed version.

A silent-assumption sub-agent artifact shipped without review is
worse than no artifact. The pattern is: **review-first is the
default for sub-agent deliverables**, not for risky ones only.

---

## 10. The 4 canonical state files (mandatory wrap, every session)

Every session, even tiny ones, must end with **all four**:

| File | What goes in |
|---|---|
| `.agents/SESSION-LOG.md` | append-only entry; "what happened and why"; invented decisions disclosed |
| `CHANGELOG.md` | append-only block under `## [Unreleased]`; bullets only, no prose |
| `.agents/summary.md` | **targeted edits only**; rewrite the "Last updated" line at top |
| `progress.md` | Session log table at top; one row per session |

Do not skip any. Do not commit until all four are in.

**Debt IDs are append-only and are never reused.** Highest ID
issued at the top of `docs/DEBT.md`. Open a new row, never
re-purpose an existing one.

**`.gitattributes` does this for `.agents/SESSION-LOG.md` and
`CHANGELOG.md`:**
```
.agents/SESSION-LOG.md merge=union
CHANGELOG.md merge=union
```
which means concurrent edits DON'T conflict — they get appended.
`.agents/summary.md` is intentionally NOT in `.gitattributes`
because it's edited in place, not appended.

---

## 11. Worked example — PR #91 (pill theme toggle)

> **Branch off `main` → 2 commits + 1 docs wrap + 1 merge
> resolution → squash to develop.**

| # | Commit | What it does |
|---|---|---|
| 1 | `feat(polish): upgrade theme toggle to pill with sliding thumb (D20 batch 3)` | Single file `apps/web/components/chrome/theme-toggle.tsx`. Pill 72×36, two glyphs `☀` `☾`, thumb slides on click. |
| 2 | `fix(polish): replace text-glyph sun/moon with inline SVG` | Same file. Glyphs didn't render (Archivo + IBM Plex Mono lack U+2600/U+263E); replaced with inline SVG. |
| 3 | `docs(session): wrap the 4 canonical state files for PR #91` | Updates all 4 docs. |
| 4 | `merge: resolve PR #91 conflicts against origin/develop` | 4 content conflicts, all HEAD-wins except progress.md which kept both rows; SESSION-LOG + CHANGELOG auto-merged via `merge=union`. |

User reviews, merges squash at `b58749c` on `develop`. Develop
auto-deploys to `develop.nxhhuy.tech`.

**Total wall time: feature 30 min, fix 30 min, docs 10 min,
conflict resolve 10 min. PR #91 took ~90 min end to end including
the visual-smoke round trip. That's the upper bound for a single
CSS-only polish item.**

---

## 12. Reference documents (cited, not duplicated)

If you need the canonical wording for something, look it up — do
not paraphrase or guess:

| Topic | File |
|---|---|
| Hard rules, content boundary, personal-content boundary | `.cursor/rules/20-never-violate.mdc` |
| Session protocol, doc authority, mandatory wrap | `.cursor/rules/00-session-protocol.mdc` |
| Stack versions, monorepo topology | `.cursor/rules/10-stack-and-topology.mdc` |
| Next.js specifics (Cache Components, App Router) | `.cursor/rules/40-web-nextjs.mdc` |
| NestJS specifics (ValidationPipe, anti-cheat, DTOs) | `.cursor/rules/50-api-nestjs.mdc` |
| Content pipeline, submodule bump discipline | `.cursor/rules/30-content-pipeline.mdc` |
| Skill index | `.cursor/rules/60-skills.mdc` |
| Architecture / decisions / phases | `roadmap.md` |
| Live counts, session log | `progress.md` |
| Open gaps with IDs | `docs/DEBT.md` |
| Design vocabulary (vendor-neutral) | `prompts/design-spec-2026-08*.md` |
| Recent polish batch prompts | `prompts/d20-d24-polish-batch.md` |

---

## 13. Failure modes to expect

| Symptom | Likely cause |
|---|---|
| Build prerender throws `Missing message: foo.bar` | i18n key not nested under existing namespace block; check `messages/en.json` for the precedent |
| `verify:frontmatter` drops a corpus | submodule pin drifted; run `pnpm verify-submodules` |
| TypeScript `Argument of type 'X' is not assignable to parameter of type '"en"'` | new locale string, need to widen the union or assert |
| `curl http://localhost:3000` returns empty `<body>` | Cache Components streamed; inspect `.next/server/app/<route>.html` instead |
| Merge conflict on `.agents/SESSION-LOG.md` | should NEVER conflict — check `.gitattributes` |
| PR scans as CONFLICTING on push | branched from `main`, target is `develop`; expected, resolve HEAD-vs-develop per established pattern |
| Vercel Auth redirects to login page | Preview environment protection is ON by default; Vercel Auth keeps it on for the `develop.nxhhuy.tech` testing environment (user explicit 2026-08-30) |

---

## 14. One-line summary to repeat back

**Corpus delivery surface; four submodules under `content/`,
Tailwind v4 / Next 16.3 Cache Components + Pnpm monorepo;
route local-folder strings via message catalogue;
commit-feature → docs-wrap → resolve-merge-conflicts → user-squashes;
feedback-first on drafts; personal-content boundary is absolute.**
