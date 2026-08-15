---
name: corpus-commit
description: "Commit and push procedure for corpus-web. Use before any git commit or push, and whenever a session is being closed. Covers the four mandatory documentation updates that gate every commit, the gate suite that must pass, branch naming, and the Conventional Commits format including the invented-decisions block."
---

## Preflight — all four must pass, in order

1. `.agents/SESSION-LOG.md` has an entry for this session, in the exact format from
   `.cursor/rules/00-session-protocol.mdc`, listing **every** changed file individually.
2. `CHANGELOG.md` has an entry under `## [Unreleased]` for this session.
3. `.agents/summary.md` has been updated **if and only if** something in it became false.
   Targeted edits only.
4. `progress.md` reflects the new status of any item touched.

If any of these is missing, stop and complete it. Do not commit.

## Gates

Run before committing. All must pass:

```
pnpm agents:check      # AGENTS.md / CLAUDE.md in sync with .cursor/rules/
pnpm verify:submodules # every content submodule pinned to a tag, none dirty
pnpm verify:frontmatter
pnpm verify:links      # cross-repo links HARD FAIL here
pnpm verify:catalog
pnpm lint && pnpm typecheck && pnpm build
```

If a gate fails, fix the cause. Never bypass with `--no-verify`.

## Branch naming

```
feat/<short-slug>     new capability
fix/<short-slug>      bug fix
chore/<short-slug>    tooling, deps, config
content/<repo>-<tag>  submodule promotion (see /promote-content)
docs/<short-slug>     docs, rules, agent context only
```

## Commit message

Conventional Commits. Scope is the workspace path segment.

```
<type>(<scope>): <imperative summary under 72 chars>

<body — what changed and why, wrapped at 80>

Invented decisions:
- <one line each, or omit the block entirely if none>
```

Types: `feat` `fix` `chore` `docs` `refactor` `test` `perf` `build` `ci` `content`.
Scopes: `web` `api` `content-schema` `ui` `mdx` `api-client` `scripts` `agents` `repo`.

Example:

```
feat(web): render corpus articles with fumadocs source loader

Wires fumadocs-core's loader against the seven content submodules and renders
the first nextjs-concepts article at /en/concepts/nextjs/[...slug]. Cache
Components verified clean against .next/server/app output.

Invented decisions:
- Locale segment defaults to `en` via middleware rather than a root redirect
```

## Push

Push to the working branch and open a PR. **Never push directly to `main`.**
PR title matches the commit summary. PR body links the SESSION-LOG entry.

Content promotion PRs are **never auto-merged**.
