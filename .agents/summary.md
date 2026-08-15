# corpus-web — workspace summary

> Living document. Read this first, every session. Update it with **targeted edits only**
> when something in it becomes false. Never rewrite wholesale.
>
> Last updated: 2026-08-15 (Session 0f — agent skills)

---

## What this repo is

The delivery surface for the `EverythingFromDayOne` concepts suite. It renders ~120
verified reference articles from seven standalone corpus repos into one site at
`nxhhuy.tech`, and adds the retention layer (progress, quizzes, spaced repetition) that
standalone markdown cannot provide.

**It is not a place where content is authored.** The seven corpus repos stay canonical.

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

**Phase 0 — Spike & skeleton. Session 0 complete (scaffold only).**

- [x] Agent rules, generator, and CI drift gate
- [x] Eight agent skills in `.claude/skills/`, indexed into `AGENTS.md`, frontmatter
      validated by the same CI gate
- [x] `roadmap.md` approved
- [x] `packages/content-schema` authored — typechecks clean against zod 4.4.3, adapters
      smoke-tested, extended to seven corpora. **Field names still unverified; `auth` and
      `authz` have no recorded convention at all.**
- [x] `packages/ui/DESIGN.md` + `tokens.css` — the "Instrument" direction
- [x] `.github/workflows/ci.yml`
- [x] `docs/adr/0001` — Angular demos integration (proposed, pending Q7)
- [x] `prompts/session-2.md`, `prompts/corpus-description-pass.md`
- [ ] Monorepo scaffold (pnpm workspaces + Turborepo)
- [ ] **BLOCKING SPIKE:** fumadocs-mdx x Next 16.3 x Cache Components
- [ ] Content submodules wired
- [ ] Design tokens
- [ ] `nxhhuy.tech` DNS cutover

No application code exists yet.

---

## Key facts that are easy to get wrong

- There are **seven** corpora, not five. `content/auth` -> `demo-auth-concepts` and
  `content/authz` -> `demo-authz-concepts` joined late. Their frontmatter convention is
  UNKNOWN — assume nothing. `demo-attacked-web` is not a corpus and is not submoduled.
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

---

## Open decisions (blocking)

1. **fumadocs spike result.** Everything in Phase 0/1 is downstream of it. Fallback is a
   hand-rolled `gray-matter` + remark/rehype + `next-mdx-remote-client` pipeline, roughly
   two extra days.
2. **AngularDemos integration.** Does `nxhhuy.tech` link out to `ng21.`/`ng15.`, iframe
   them under a `/demos/*` route, or load Angular 21 as a cross-framework federated
   remote? Not decided. Default assumption until decided: **link out**.
3. **Monetization.** Gates whether `entitlements` is built at all, whether Vercel Hobby is
   permissible, and whether quiz scoring must be server-side.

---

## Planned next steps

1. Monorepo scaffold — pnpm workspaces, Turborepo, shared eslint/tsconfig/prettier.
2. **fumadocs spike.** Exit criterion: one real article from `content/nextjs/` renders at
   `/en/concepts/nextjs/<slug>` with working TOC and Shiki, `next build` clean, no Cache
   Components errors.
3. Submodule wiring for all seven corpora + `sync-content.mjs` + `verify-submodules`.
4. Design tokens in `packages/ui` — colour scales, type scale, spacing, dark/light
   `@theme` blocks.
5. DNS cutover: `nxhhuy.tech` -> Vercel.
