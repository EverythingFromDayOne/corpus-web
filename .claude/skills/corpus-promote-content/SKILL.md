---
name: corpus-promote-content
description: "Procedure for bumping a content submodule to a newer corpus tag. Use whenever content needs updating from one of the seven corpus repos, when a corpus cuts a new release, or when a repository_dispatch promotion PR needs handling. Covers tag pinning, catalog diff review, and the cosmetic-versus-substantive content_hash decision that the user must make."
---

## Preconditions

- The corpus repo has a **tag**, not just commits on a branch. Floating refs are rejected
  by `verify-submodules`.
- No uncommitted changes anywhere in `content/`. If there are, something has edited the
  corpus from this repo — stop and report it as a rule violation before doing anything else.

## Procedure

1. Identify the target tag in the corpus repo. Never use `--remote` to grab whatever is
   at HEAD.
2. Bump one submodule at a time:
   ```
   git -C content/<repo> fetch --tags
   git -C content/<repo> checkout <tag>
   git add content/<repo>
   ```
3. Rebuild and re-verify:
   ```
   pnpm sync:content
   pnpm build:catalog
   pnpm verify:frontmatter
   pnpm verify:links
   pnpm verify:catalog
   pnpm verify:code-blocks
   ```
4. Review the catalog diff. Report explicitly:
   - articles added, removed, or renamed
   - any `article_id` change (each one needs a `lesson_aliases` row and a Next redirect)
   - any article whose `content_hash` changed
5. For each changed `content_hash`, state whether the change is **cosmetic** (typo, prose
   polish) or **substantive** (a claim changed). Substantive changes may warrant
   invalidating reader completion; cosmetic ones must not. **The decision is the user's.**
   Present the list; do not decide.
6. Branch `content/<repo>-<tag>`, commit via `/commit`, open a PR.

## Never

- Never auto-merge the PR.
- Never edit a file inside `content/` to make a gate pass. Fix it in the corpus repo and
  cut a new tag.
- Never bump multiple submodules in one PR — a failing gate becomes ambiguous.
