# Session 1 — Monorepo scaffold and the fumadocs spike

**Prerequisite:** read `.cursor/rules/00-session-protocol.mdc` FIRST ACTION, then
`.agents/summary.md`, `.agents/SESSION-LOG.md`, `CHANGELOG.md`, `roadmap.md`, `progress.md`.

This session has one blocking question in it. Task 5 gates the entire project. If it
fails, stop after task 6 and report — do not proceed to Phase 1 work.

---

## 1. Monorepo scaffold

Create pnpm workspaces + Turborepo:

```
pnpm-workspace.yaml     apps/*, packages/*
turbo.json              build, lint, typecheck, test, verify:*
package.json            root scripts (see task 3)
tooling/eslint/         shared flat config
tooling/tsconfig/       base.json, next.json, nest.json — all strict
.gitignore              build output, node_modules, .env — NOT content/ (see task 4)
.nvmrc                  22
```

Do not install any dependency not required by this task list. If something seems missing,
stop and ask.

## 2. Workspace stubs

Create empty-but-buildable placeholders so the task graph is real:
`apps/web`, `apps/api`, `packages/content-schema`, `packages/ui`,
`packages/mdx-components`, `packages/api-client`.

`packages/api-client` gets a `README.md` stating it is generated and must never be
hand-edited.

## 3. Root scripts

```json
"agents:build":  "node scripts/build-agent-docs.mjs",
"agents:check":  "node scripts/build-agent-docs.mjs --check",
"sync:content":  "node scripts/sync-content.mjs",
"build:catalog": "node scripts/build-catalog.mjs",
"verify:submodules": "node scripts/verify-submodules.mjs"
```

Other `verify:*` scripts land in Session 2. Do not stub them as no-ops that exit 0 — a
gate that always passes is worse than a missing gate.

## 4. Content submodules

Add all seven, pinned to their current latest tag.

**`dsa-concepts` is NOT in this list.** It has no GitHub remote — it exists only as a
local repo. It is registered as a planned corpus in `packages/content-schema` and must not
be submoduled. Do not create the remote as part of this session.



```
content/nextjs   -> EverythingFromDayOne/nextjs-concepts
content/reactjs  -> EverythingFromDayOne/reactjs-concepts
content/angular  -> EverythingFromDayOne/angular-concepts
content/nestjs   -> EverythingFromDayOne/nestjs-concepts
content/auth     -> EverythingFromDayOne/demo-auth-concepts
content/authz    -> EverythingFromDayOne/demo-authz-concepts
content/websec   -> EverythingFromDayOne/demo-attacked-web
```

**Report the shape of `content/auth`, `content/authz`, and `content/websec` once cloned:**
top-level directory listing, whether a `docs/` folder exists, the count of `.md` files, and
the frontmatter block of one article from each. Nothing about their conventions is on
record, and `websec` may not be a corpus at all — it may be a deliberately vulnerable
target application whose code the auth/authz articles extract. This costs two minutes and
it is the input session 2 needs most.

For `websec` specifically, also report: does it contain an application (package.json,
src/, an index.html at root)? Do any `auth`/`authz` articles reference paths inside it?

If a repo has no tag, report it and skip that one — do not pin to a branch.

**Report the default branch of every submodule.** They are not uniform — both
`demo-auth-concepts` and `demo-authz-concepts` are on `master`, and the sibling
`AngularDemos` repo uses `development`. `REPO_DEFAULT_BRANCH` in
`packages/content-schema/src/common.ts` assumes `main` for the five framework corpora and
that assumption is unverified — two for two checked so far were `master`. Every wrong entry
is a silently 404ing "View source" link on every article in that corpus.

```
git submodule foreach --quiet 'echo "$name $(git symbolic-ref --short refs/remotes/origin/HEAD | sed s@^origin/@@)"'
```

Correct `REPO_DEFAULT_BRANCH` from the output.

**Report the visibility of every submodule.** All eight are expected public as of
2026-08-15 (`nestjs-concepts` was switched from private). A private submodule cannot be
cloned by `actions/checkout` using `GITHUB_TOKEN` — the token is scoped to this repo only —
so CI and Vercel would both need a PAT or deploy key.

```
gh repo view EverythingFromDayOne/<name> --json visibility -q .visibility
```

If any is private, set its entry in `REPO_IS_PRIVATE` to `true`, report it, and continue.
**Never solve this by committing a credential.**

Write `scripts/verify-submodules.mjs`: fails if any submodule is dirty, missing, or on a
non-tag ref. Add a `postinstall` that runs `git submodule update --init --recursive`.

**Do not put `content/` in `.gitignore`.** The parent repo tracks each submodule as a
gitlink — a commit SHA — not as files, so the entry would be inert and would read as
protection while providing none. Instead:

- set `submodule.<name>.ignore = none` in `.gitmodules`, so `git status` surfaces dirty
  submodule content rather than suppressing it
- install `verify-submodules.mjs` as a `pre-commit` hook as well as a CI gate

Prove the gate works: edit a file inside one submodule, run the script, capture the failure
in the session log, then `git -C content/<repo> checkout .` to restore.

## 5. BLOCKING SPIKE — fumadocs × Next.js 16.3 × Cache Components

In `apps/web`:

- Next.js 16.3, App Router, **Cache Components enabled**
- `fumadocs-core` + `fumadocs-mdx`. **Do not install `fumadocs-ui`.**
- Point the source loader at `content/nextjs/docs/`
- Route: `app/[locale]/concepts/[repo]/[...slug]/page.tsx`
- Render exactly one real article, unstyled, with its TOC extracted

**Exit criteria — all four:**

1. The article renders at `/en/concepts/nextjs/<slug>` in `next dev`
2. `next build` completes with no Cache Components errors
3. The article body is present in `.next/server/app/.../<slug>.html`
   — **verify by reading that file. Not `curl`. Not view-source.**
4. TOC headings are extracted and correct

Report each criterion pass/fail separately. Do not report an overall "it works".

**If the spike fails:** capture the exact error, the failing criterion, and your read on
whether it is a fumadocs limitation or a config problem. Then stop. Do not implement the
fallback pipeline in this session — that is a decision for the user.

## 6. Close

Four mandatory doc steps, then `/commit`. Author `prompts/session-2.md` reflecting the
spike result — its contents differ completely depending on whether task 5 passed.

---

## Out of scope — do not do these

- Styling, design tokens, Tailwind setup
- Sidebar, breadcrumb, TOC rail, or any chrome
- Any `apps/api` code beyond the empty scaffold
- Any content authoring or edits under `content/`
- Search, i18n message catalogue, SEO
