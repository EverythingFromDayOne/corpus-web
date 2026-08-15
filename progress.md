# corpus-web — progress

Maintainer-facing tracking document. See `.agents/summary.md` for the agent-facing
snapshot and `roadmap.md` for the planning rationale.

`roadmap.md` is stable and is not updated per session. This file is.

## Legend

- ✅ Complete and reviewed
- 🟢 Drafted / working, awaiting review
- 🟡 In progress
- ⚪ Queued
- ❌ Dropped / out of scope

---

## Phase 0 — Spike & skeleton (🟡 in progress)

| # | Item | Status | Notes |
|---|---|---|---|
| 0 | Agent rules + generator + drift gate | ✅ | Session 0 |
| 1 | Monorepo scaffold (pnpm + Turborepo) | ⚪ | |
| 2 | **fumadocs × Next 16.3 × Cache Components spike** | ⚪ | **Blocking.** 1 day timebox. Fallback: hand-rolled remark/rehype pipeline |
| 3 | Content submodules + `sync-content.mjs` + `verify-submodules` | ⚪ | **Seven** mounted repos, pinned to tags. `dsa` excluded — see Debt |
| 4 | Design tokens in `packages/ui` | 🟢 | `DESIGN.md` + `tokens.css` authored; unapplied |
| 5 | DNS cutover `nxhhuy.tech` → Vercel | ⚪ | |

**Gate:** one real article renders at a live URL.

---

## Phase 1 — Read-only corpus (⚪ queued)

| # | Item | Status | Notes |
|---|---|---|---|
| 6 | Frontmatter adapters + zod union, seven mounted repos | 🟡 | authored + typechecked; **field names unverified** (session 2 task 1) |
| 7 | `build-catalog.mjs` → routes + sidebar tree | ⚪ | |
| 8 | Full route tree, every completed article renders | ⚪ | |
| 9 | Chrome: sidebar, breadcrumb, TOC rail, prev/next | ⚪ | |
| 10 | Shiki code blocks (copy / download / expand) | ⚪ | |
| 11 | Pagefind search + ⌘K dialog | ⚪ | |
| 12 | Mobile layout | ⚪ | |
| 13 | Corpus landing at `/en` + `/en/license` (roadmap §15.1) | ⚪ | |
| 14 | SEO baseline: metadata, OG, sitemap, JSON-LD | ⚪ | |
| 15 | Cache Components strategy, verified via `.next/server/app/**.html` | ⚪ | |
| 16 | `description` frontmatter pass, five framework corpora (~120 files) | ⚪ | prompt written; auth/authz deferred pending audit |

**Gate:** a complete, shippable, useful site with zero backend.

---

## Phase 2 — Backend & identity (⚪ queued)
## Phase 3 — Retention loop (⚪ queued)
## Phase 4 — Depth (⚪ queued)
## Phase 5 — Conditional (⚪ queued)

See `roadmap.md` §15 for item-level detail.

---

## Debt

Known, deliberate, and tracked. Not blockers unless marked.

| # | Item | Impact if unresolved | Blocks |
|---|---|---|---|
| D1 | **`dsa-concepts` has no GitHub remote** — 13 verified articles, 118/118 code blocks, 121/121 links, 539/539 tests, all sitting in a local repo only. Registered as `PlannedRepoId`; no adapter; produces no articles. Cross-corpus refs to it warn rather than fail. | The suite's only fully-verified corpus is absent from the site. Its benchmark methodology — median of 11 trials after 10 warmup calls, adversarial inputs alongside random — is the strongest single claim in the whole body of work and currently has no reader. | Nothing. Resolve by creating the remote, pushing, tagging `v1.0.0`, then moving `dsa` from `PlannedRepoId` to `RepoId`, adding its adapter spec, and submoduling it. |
| D2 | **`websec` role unestablished** — `demo-attacked-web` may be a corpus, a vulnerable target app whose code the auth/authz articles extract, or both. Its adapter is a placeholder. | Either a corpus renders wrong, or `verify-code-blocks` fails for lack of a demo source. | Session 2 task 1 |
| D3 | **`auth` / `authz` frontmatter convention unknown** — no recorded schema; adapter specs are guesses. | Adapters fail on real files. | Session 2 task 1 |
| D4 | **Default branches unverified** for the four framework corpora. Confirmed: `nextjs` and `nestjs` are `main`; `auth`, `authz`, `websec` are `master`. | Silently 404ing "View source" links across a whole corpus. | Session 1 task 4 |
| D5 | **`description` frontmatter absent everywhere** — required field, no fallback. | Build fails on every article until the pass runs. | Phase 1 item 16 |
| D6 | **`nestjs-concepts` article 16** — headline claim invalidated by article 17 (`forbidUnknownValues: false` is forced by Nest). Correction not yet applied upstream. | A known-false claim is pinned in `v0.2.0` and would render. | Fix in the corpus repo, then re-tag |
| D7 | **`reactjs-concepts` anchor slugs unverified** for articles 27–36 and recipes 5–10. | Broken in-page cross-references. | Session 2 task 3 |
| D8 | **`angular-concepts`** — 6 of 23 Phase 2 articles outstanding; `attribute-directives` is a stub. | Six articles absent from the site. | Angular Phase 2 |

---

## Session log

- **Session 0g (2026-08-15):** generated `.cursor/rules/60-skills.mdc` so Cursor reaches
  the skills; third-party skill precedence rules added.
- **Session 0f (2026-08-15):** eight agent skills authored in `.claude/skills/`, indexed
  into `AGENTS.md`, frontmatter validated in CI. `.agents/skills/` migrated and removed.
- **Session 0e (2026-08-15):** repo renamed `concepts-web` -> `corpus-web`; npm scope
  -> `@corpus/`. Token-exact, no collateral damage to legitimate `concepts` usages.
- **Session 0d (2026-08-15):** corpus set finalised at **seven mounted** —
  `demo-attacked-web` added as `websec`; `dsa-concepts` reclassified as planned (no
  remote) and moved to Debt D1. Introduced `PlannedRepoId` / `KnownRepoId` so refs to
  unpublished corpora warn rather than hard-fail. Repo visibility and per-repo default
  branch now modelled.
- **Session 0c (2026-08-15):** `packages/content-schema` authored and typechecked (zod
  4.4.3, adapters smoke-tested); `packages/ui` design direction + tokens; CI workflow;
  ADR template + ADR-0001; session-2 and corpus-description-pass prompts. Corrected a
  session-0 error: `.gitignore` cannot protect submodule contents.
- **Session 0b (2026-08-15):** Q8 resolved — no personal content. Added the personal-content
  boundary rule, replaced the portfolio plan with a corpus landing spec (roadmap §15.1).
- **Session 0 (2026-08-15):** repo scaffold — six Cursor rule files, agent-doc generator
  with CI drift gate, `.agents/` docs, changelog, this tracker. No application code.
  Next: fumadocs spike.
