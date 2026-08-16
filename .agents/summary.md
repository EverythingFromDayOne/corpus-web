# corpus-web — workspace summary

> Living document. Read this first, every session. Update it with **targeted edits only**
> when something in it becomes false. Never rewrite wholesale.
>
> Last updated: 2026-08-15 (Session 1 — monorepo scaffold and fumadocs spike)

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

**Phase 0 — Spike & skeleton. Session 1 complete (scaffold + spike passed).**

- [x] Agent rules, generator, and CI drift gate
- [x] Eight agent skills in `.claude/skills/`, indexed into `AGENTS.md`, frontmatter
      validated by the same CI gate
- [x] `roadmap.md` approved
- [x] `packages/content-schema` authored — typechecks clean against zod 4.4.3, adapters
      smoke-tested, extended to seven corpora. **Field names still unverified; `auth` and
      `authz` are not markdown corpora (session 1).**
- [x] `packages/ui/DESIGN.md` + `tokens.css` — the "Instrument" direction
- [x] `.github/workflows/ci.yml`
- [x] `docs/adr/0001` — Angular demos integration (proposed, pending Q7)
- [x] `prompts/session-2.md`, `prompts/corpus-description-pass.md`
- [x] Monorepo scaffold (pnpm workspaces + Turborepo)
- [x] **fumadocs-mdx × Next 16.3 × Cache Components spike** — all four exit criteria passed
      against `cache-components-model`
- [x] Content submodules wired, seven mounts, pinned to tags
- [ ] Design tokens applied
- [ ] `nxhhuy.tech` DNS cutover

Application code now exists: `apps/web` renders one real nextjs-concepts article;
`apps/api` is an empty Nest bootstrap.

---

## Key facts that are easy to get wrong
- There are **four** corpora: `nextjs`, `react`, `angular`, `nestjs`. The React repo is
  `react-concepts`, mounted at `content/react`.
- `auth`, `authz`, `websec` are **runnable demo apps, not corpora** — no `docs/`, no
  frontmatter, no adapters, not submodules. Session 1 audit. See ADR-0002.
- Default branches: `main` for `nextjs` and `nestjs`, `master` for `react` and `angular`.

- There are **seven** mounted submodules, not five. `content/auth` ->
  `demo-auth-concepts`, `content/authz` -> `demo-authz-concepts`, `content/websec` ->
  `demo-attacked-web`. Session 1 cloned them: **none of the three is a markdown
  corpus.** They are demo-lab trees (per-concept folders + `prompts/*.md` with no
  frontmatter, no `docs/`). `websec` stays mounted as a code-extraction / structural
  sibling; it should produce no articles. Session 2 decides adapter deletion.
- The React GitHub repo is `EverythingFromDayOne/react-concepts`, not
  `reactjs-concepts`. Mount point stays `content/reactjs`.
- Default branches are not uniform. `main`: nextjs, nestjs. `master`: reactjs,
  angular, auth, authz, websec.
- `fumadocs-core` is 16.x; `fumadocs-mdx` is 15.x. They version independently.
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

1. **fumadocs spike — PASSED (session 1).** Keep fumadocs-core + fumadocs-mdx. Fallback
   pipeline is not needed.
2. **AngularDemos integration.** Does `nxhhuy.tech` link out to `ng21.`/`ng15.`, iframe
   them under a `/demos/*` route, or load Angular 21 as a cross-framework federated
   remote? Not decided. Default assumption until decided: **link out**.
3. **Monetization.** Gates whether `entitlements` is built at all, whether Vercel Hobby is
   permissible, and whether quiz scoring must be server-side.

---

## Planned next steps

1. Session 2 — reality-check adapters against the seven mounts. `auth` / `authz` /
   `websec` are demo labs; decide whether to delete those adapters.
2. Design tokens applied in `packages/ui`.
3. DNS cutover: `nxhhuy.tech` -> Vercel.
