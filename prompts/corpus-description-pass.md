# Cross-repo prompt — add `description` frontmatter

**This prompt runs in a CORPUS repo, not in `corpus-web`.** Run it once per repo, on a
branch, one PR each. Do not batch repos.

Applies to: `nextjs-concepts`, `react-concepts`, `angular-concepts`, `nestjs-concepts`.

`dsa-concepts` also needs this pass, but it has no GitHub remote yet — run it locally
whenever the repo is published, before its first tag.

Does **not** apply to `demo-auth-concepts`, `demo-authz-concepts`, or `demo-attacked-web`.
They are runnable demo apps with no articles.

---

## Why

The site renders a one-line dek under every H1 and uses the same string as the page's meta
description. No corpus currently carries that field. Deriving it from the first paragraph
was considered and rejected: roughly a third of articles open with a callout, and the
derived text reads badly as a search result.

The field is required. An article without one is a build failure on the site, not a
fallback.

## Scope — read this twice

**Add exactly one frontmatter key per article. Change nothing else.**

- Do NOT reword, restructure, retitle, or reformat any prose.
- Do NOT touch code blocks, `related` blocks, or any other frontmatter key.
- Do NOT reorder frontmatter keys. Insert `description` immediately after `title`.
- Do NOT add the field to `README.md`, `roadmap.md`, `progress.md`, or any non-article file.

A diff on this branch should show, per file, exactly one added line.

## Writing the dek

One sentence. 90–160 characters. Sentence case. No trailing period unless it is genuinely
two clauses.

It must say **what the article establishes**, not what topic it covers. The test: could
this sentence sit under a search result and tell a reader whether to click?

Draw it from the article's own opening — the lead callout or first paragraph usually states
the thesis already. **Do not invent a claim the article does not make.** If you cannot write
one without asserting something the article does not support, leave the field out, add the
path to the "needs author" list in your output, and move on. A wrong dek is worse than a
missing one; the build failure is loud and a false claim is silent.

Good:

```yaml
title: How React renders
description: Render and commit are two phases, and most performance advice conflates them
```

```yaml
title: Cache Components
description: Next 16 inverted the caching defaults, which makes most existing guidance wrong
```

Bad, and why:

- `description: Learn about how React renders` — restates the title, says nothing
- `description: A comprehensive deep dive into the React rendering pipeline` — marketing
- `description: Everything you need to know about caching` — a claim about the article, not
  about the subject
- `description: React renders in a single pass for performance` — invented, and false

## Procedure

1. Branch `chore/add-description-frontmatter`.
2. Walk every article. For each, read the title and the first ~15 lines.
3. Write the dek. Insert it after `title`.
4. Emit a table in your session output: path, title, dek, character count.
5. Emit a separate "needs author" list for any article you skipped, with the reason.
6. Run the repo's existing gates. They must all still pass — nothing in this pass should
   affect code blocks or links, and if a gate breaks, the change went beyond scope.
7. Follow that repo's own session-close protocol. Open a PR. **Do not merge.**

## Verification before opening the PR

```
git diff --stat          # every file: 1 insertion, 0 deletions
git diff | grep '^-'     # should show only the diff header lines, no removed content
```

If any file shows a deletion, the pass went out of scope. Reset it and redo that file.

## Afterwards

Tag the corpus repo. Then, in `corpus-web`, run `/promote-content` to bump that
submodule. The two are separate PRs in separate repos and stay that way.
