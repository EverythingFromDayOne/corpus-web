# Session 3 — unblock the catalog, then wire the read-only route tree

**Prerequisite:** FIRST ACTION in `.cursor/rules/00-session-protocol.mdc`, then
`.cursor/rules/30-content-pipeline.mdc`, `corpus-content-boundary`, and
`corpus-next-caching` skills in full.

Session 2 corrected all four adapters against the real corpus files
(`docs/audit/frontmatter-2026-08-16.md`), added `extractSections()`, and shipped a real
`build-catalog.mjs` plus the `verify-frontmatter` / `verify-links` / `verify-catalog`
gates. Every one of those gates currently **fails**, and that failure is expected: every
selected article across all four corpora is missing `description` (Debt D5), and 14
`react-concepts` articles additionally have no title at all — no frontmatter `title`, no
`# ` H1 (Debt D11). Neither is an adapter bug. Neither is fixable from this repo — both
are corpus-side content gaps, and this repo never edits `content/`.

This session has two tracks, run in order. **Do not start Track B until Track A's
prerequisite is confirmed** — building routes against an empty or partial catalog is
wasted work if the catalog is about to change shape.

---

## Track A — confirm and promote (blocking)

1. Check whether `nextjs-concepts`, `react-concepts`, `angular-concepts`, and
   `nestjs-concepts` have run `prompts/corpus-description-pass.md` and cut a new tag. If
   any have not, **stop Track A here and report which repos are still pending** — do not
   invent descriptions, do not lower the bar on `requireDescription()` to unblock
   yourself. This is exactly the "division of labour" boundary in
   `.cursor/rules/00-session-protocol.mdc`: description prose is Claude's job, in the
   corpus repos, not this session's.
2. For `react-concepts` specifically, also confirm Debt D11 is closed — the 14 articles
   listed in `progress.md` need an added `# ` H1 (or explicit `title` frontmatter) before
   they can adapt, independent of the description pass.
3. For each corpus repo that has cut a new tag covering both fixes, promote it here per
   the `corpus-promote-content` skill: bump the submodule pointer, one repo per PR, run
   the gates, never auto-merge.
4. Once all four are promoted, run `pnpm build:catalog` for real. It should now:
   - adapt every selected file with zero failures
   - resolve every `related` ref with zero unresolved and zero unexpected draft targets
   - emit a real `catalog.json`
   If it does not, treat that as a new finding — do not force it green by touching the
   adapters or the corpus. Report exactly which file/ref is still failing and why.
5. Run `pnpm verify:frontmatter && pnpm verify:links && pnpm verify:catalog` and confirm
   all three pass against the real, promoted content. Capture the article/edge/path counts
   in the session log.

**If Track A cannot complete** (one or more corpora still pending their description
pass), stop after step 1 or 2, report status precisely, and move to Track B's
infrastructure-only items that do not require a working catalog — items 9–11 below. Do
not attempt items 6–8 without a real `catalog.json` to point them at.

## Track B — Phase 1 items 7–9: routes, sidebar, chrome

Depends on Track A's `catalog.json`.

6. `apps/web/lib/catalog.ts` (new): a `'use cache'` loader that reads `catalog.json` at
   build time (module-level, per `.cursor/rules/40-web-nextjs.mdc`'s caching table) and
   exposes typed lookups — by uid, by repo, by folder. This replaces the single
   hand-wired spike article from session 1's
   `app/[locale]/concepts/[repo]/[...slug]/page.tsx`.
7. Full route tree: every `complete`-status article in the catalog renders at its
   canonical URL (roadmap §1). `draft`-status articles render only under
   `NEXT_PUBLIC_SHOW_DRAFTS=1`, matching the same flag `build-catalog.mjs` already
   respects for `related` resolution.
8. Sidebar tree, generated from the catalog's `folder` groupings per repo, `'use cache'`
   at module level. Repo index pages (`/en/concepts/[repo]`) list every folder's
   articles.
9. Verify every route in the prerendered output per `corpus-next-caching`: inspect
   `.next/server/app/**/*.html` after `next build`, never `curl` or view-source. Record
   which routes are static vs. partial prerender.

## Infrastructure-only (no catalog required — safe even if Track A is blocked)

10. `curation/paths/` does not exist yet. Author the directory and **one** real
    `PathDefinition` YAML fixture once at least one corpus has real articles to reference
    (do not invent placeholder article ids) — or, if no corpus has promoted yet, defer
    this whole item and say so.
11. `verify-sidecars.mjs`, deferred since session 2 (no sidecar files exist). Still
    deferred unless a corpus has shipped a `.quiz.yaml`/`.deck.yaml` sidecar by this
    session.
12. Audit `scripts/lib/*.mjs` and `scripts/*.mjs` for ESLint coverage — they currently run
    outside `pnpm lint`'s scope entirely (not a workspace package per
    `pnpm-workspace.yaml`). Decide whether to add a `scripts/package.json` + eslint config
    so they get the same gate as everything else, or explicitly document why they don't
    need one.

## Out of scope

- The `description` frontmatter pass itself — that is Claude's work, in the corpus repos
  (`prompts/corpus-description-pass.md`), never invented here
- Fixing Debt D11's missing titles — corpus-side, same reasoning
- Any `apps/api` code
- Editing anything under `content/`
- Deploying or embedding the demo labs (ADR-0002 still `proposed`)
- Design tokens application (`packages/ui` — Phase 0 item 4, independent track)

## Close

Four mandatory doc steps, then `/commit`. Author `prompts/session-4.md`, scoped to
whichever of Track A/B this session actually completed.
