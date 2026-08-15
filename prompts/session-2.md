# Session 2 — Content schema against reality

**Run only if Session 1 task 5 (the fumadocs spike) PASSED.** It did. Session 1
rendered `cache-components-model` at
`/en/concepts/nextjs/concepts/caching/cache-components-model` with Cache Components
on, `next build` clean, article body in
`.next/server/app/en/concepts/nextjs/concepts/caching/cache-components-model.html`,
and TOC headings matching the article.

**Prerequisite:** FIRST ACTION in `.cursor/rules/00-session-protocol.mdc`, then read
`.cursor/rules/30-content-pipeline.mdc` in full.

## Session 1 findings — read before touching adapters

These are observations from cloning the seven mounts. They are the input this
session needs most. Do not re-guess them.

**Visibility:** all seven GitHub remotes are PUBLIC.

**Default branches** (`git submodule foreach` + `origin/HEAD`):

| Mount | GitHub repo | Branch | Tag |
|---|---|---|---|
| `content/nextjs` | `nextjs-concepts` | `main` | v0.2.0 |
| `content/reactjs` | **`react-concepts`** (not `reactjs-concepts`) | `master` | v0.4.0 |
| `content/angular` | `angular-concepts` | `master` | v0.2.0 |
| `content/nestjs` | `nestjs-concepts` | `main` | v0.2.0 |
| `content/auth` | `demo-auth-concepts` | `master` | v0.1.0 |
| `content/authz` | `demo-authz-concepts` | `master` | v0.1.0 |
| `content/websec` | `demo-attacked-web` | `master` | v0.1.0 |

**`auth` — not a markdown corpus.** No `docs/`. 24 `.md` files. Top-level is
per-concept folders (`jwt-bearer`, `oauth2-oidc`, `session`, …) plus `prompts/`
and a README. Sample `prompts/07-oauth2-oidc.md` has **no frontmatter**; it is a
Cursor prompt to build three Express servers.

**`authz` — not a markdown corpus.** Same shape. 21 `.md` files. Prompts cite
`demo-attacked/idor/` as the structural pattern. README: "`demo-attacked/` is used
here only as a structural reference."

**`websec` — demo-lab tree, not a corpus.** No `docs/`, no root `package.json`,
no `src/`, no root `index.html`. 34 `.md` files, almost all under `prompts/`.
Top-level folders are attacks: `xss`, `csrf`, `sql-injection`, `idor`,
`jwt-attacks`, … Auth/authz articles reference paths like `demo-attacked/idor/`
and `demo-attacked/jwt-attacks/` as sibling demo source. It stays submoduled
because those references exist; it should produce **no articles**.

If any of the three turns out not to be a markdown corpus, **stop and report
before writing adapter code for it.** Session 1 already observed that they are
not. The remaining decision is: delete the three adapters and register `websec`
as a code-extraction source.

This session's job is to find out where `packages/content-schema` is **wrong**. It was
authored from each corpus repo's `roadmap.md` and `progress.md` conventions, not from the
article files. Expect mismatches. Finding them is the deliverable.

**Audit `websec`, `auth`, and `authz` FIRST**, in that order, before the four framework
corpora — confirm the session 1 observation against the adapters, then act.

---

## 1. Reality check the adapters — THE point of this session

Write `scripts/audit-frontmatter.mjs`. It walks every `.md` under each submodule, parses
frontmatter with `gray-matter`, runs the matching adapter, and produces a report. It must
**not** stop at the first failure — collect everything.

Report per repo:

- total files found, files parsed, files failed
- **every distinct frontmatter key present**, with a count, and whether the adapter uses it
- every adapter-required key that is **absent** from any file, with example paths
- every distinct value seen for `status`, `difficulty`, and each `*_baseline`
- every `related` entry the parser could not resolve, with its source path

Write it to `docs/audit/frontmatter-2026-XX-XX.md` and commit it. This report is the
evidence for the corrections in task 2.

**Do not fix anything in this task.** Observe first.

## 2. Correct the adapters — the adapters, never the corpus

Using the task 1 report, correct `packages/content-schema/src/adapters/index.ts`:
field names, include globs, per-repo extensions.

Constraints:

- **Never edit a file under `content/`.** If an article is genuinely malformed, list it
  under "corpus fixes needed" in the session output. Fixing it is a separate PR in that
  corpus repo.
- **Never widen a schema to make a failure disappear.** If `difficulty` has a fourth value,
  report it — do not add it to the enum. That vocabulary was confirmed deliberately.
- **Never add a default to paper over a missing required field.** A default here hides the
  gap forever.
- Delete the "⚠ UNVERIFIED" notices in `README.md` and `adapters/index.ts` **only** for
  the specific claims task 1 actually verified. Leave the rest.

Expected outcome: most articles fail on missing `description`. That is correct and
expected — it is the Q1 pass, and it runs separately via
`prompts/corpus-description-pass.md`. Count them, do not fix them here.

## 3. Section extraction

Add `extractSections()` to the schema package: walk the MDX AST, take `##` and `###`
headings, emit `{ anchor, heading, depth, ordinal }`.

Anchors must match **GitHub's slugification exactly**, because ~90 existing internal links
in the corpus were authored against it and were repaired against it in a prior session.
Getting this subtly wrong silently breaks every anchored cross-reference.

Test it against a known case from `reactjs-concepts`: `error-boundaries.md` has headings
that were promoted from bold-lead blocks specifically to make anchors resolve. If your
slugifier disagrees with the anchors those articles link to, your slugifier is wrong.

## 4. Catalog builder

`scripts/build-catalog.mjs` → `catalog.json`, matching `Catalog` in `catalog.ts`.

Steps: walk submodules → adapt → extract sections → resolve every `related` ref against the
full article set → load `curation/paths/*.yaml` → emit.

Resolution rules:
- resolves to a complete article → edge
- resolves to a **draft** → fatal in production builds, warning when `SHOW_DRAFTS=1`
- does not resolve → **fatal, always**. Cross-repo links warn in the corpus repos because
  they cannot resolve standalone. Here they can, so here they are errors.

Record each submodule's tag and commit in `sources`. A catalog that cannot be traced to
exact content is not a catalog.

## 5. The gates

- `verify-frontmatter.mjs` — every article adapts cleanly
- `verify-links.mjs` — zero unresolved refs; zero draft targets in production
- `verify-catalog.mjs` — no duplicate uid; no path item pointing at a missing or draft
  article; every `folder` present in the tree
- `verify-sidecars.mjs` — quiz and deck YAML against the schemas; exactly one correct
  option per question

Wire all four into `package.json` and confirm `.github/workflows/ci.yml` runs them.

**A gate that exits 0 because it found nothing to check is a broken gate.** Each one must
fail if its input set is empty, and each must be proven to fail: break something
deliberately, capture the output in the session log, restore it.

## 6. Close

Four mandatory doc steps, then `/commit`. Author `prompts/session-3.md`.

---

## Out of scope

- Any UI, styling, or component work
- Any `apps/api` code
- Editing anything under `content/`
- The `description` frontmatter pass — that is a separate cross-repo prompt
- Writing quiz or deck sidecar content
