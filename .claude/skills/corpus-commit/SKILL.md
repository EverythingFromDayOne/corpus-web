---
name: corpus-commit
description: "Commit and push procedure for corpus-web. Use before any git commit or push, and whenever a session is being closed. Covers the four mandatory documentation updates that gate every commit, the gate suite that must pass, branch naming, and the Conventional Commits format including the invented-decisions block."
---

## Preflight — all four must pass, in order

1. `.agents/SESSION-LOG.md` has an entry for this session, in the exact format from
   `.cursor/rules/00-session-protocol.mdc`, listing **every** changed file individually.
2. `CHANGELOG.md` has an entry for this session, inserted **directly below the
   `## [Unreleased]` header** — newest entry first, above every existing entry.
   **Never append at EOF.** This is the opposite convention from
   `.agents/SESSION-LOG.md` and `progress.md`, which append chronologically
   (oldest first, newest entry added at the end) — do not mix the two up.
3. `.agents/summary.md` has been updated **if and only if** something in it became false.
   Targeted edits only.
4. `progress.md` reflects the new status of any item touched. If a debt row
   changed, `docs/DEBT.md` was updated too.

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

## `progress.md` append pitfall

When appending a new session entry to `progress.md`, **never** use Python `text.replace(long_anchor, anchor + new, 1)` where `anchor` is a leading fragment of the previous session's heading or body. Session lines in `progress.md` are long single-paragraph entries (often 200+ chars on one line); a `replace` on a leading fragment will silently split the line into "heading-only" + new entry + orphaned body, because Python `str.replace` does not respect line boundaries — only exact-string boundaries.

Safe patterns:
- Anchor on the SHORTEST unique trailing fragment (the previous session's final `**Files:**` line, the terminal `---` separator, or the literal file end).
- Or: read the whole file, locate the literal end via a sentinel, and `write_file` the whole thing with appended content (loses `patch` granularity but guarantees no line-splitting).
- Or: use `cat >> FILE <<'EOF'` (terminal heredoc append) — works because it appends at EOF, not at a content anchor.

Symptom of a bug: a session heading rendered as `**Session N — short heading only):**` followed by the new entry and an orphaned paragraph starting with the verb that was in the middle of the previous line ("Huy merged PR...", "Closure path...", etc.). Catch it before pushing — `git diff HEAD -- progress.md` after committing will reveal it.
