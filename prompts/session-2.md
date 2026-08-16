# Session 2 — Adapters against reality, catalog, gates

**Prerequisite:** FIRST ACTION in `.cursor/rules/00-session-protocol.mdc`, then
`.cursor/rules/30-content-pipeline.mdc` and the `corpus-adapter` skill in full.

Session 1 passed the fumadocs spike on all four criteria and landed the scaffold. Its audit
changed three things this session depends on:

- The React repo is `react-concepts`, not `react-concepts`. Mount point is now `react`.
- `auth`, `authz`, `websec` are **runnable demo apps, not corpora** — no `docs/`, no
  frontmatter. They have no adapters and produce no articles.
- Default branches: `main` for `nextjs` and `nestjs`, `master` for `react` and `angular`.

`packages/content-schema` has been corrected for all three. **Four corpora, four adapters.**

This session's job is to find out where those four adapters are still **wrong**. They were
authored from each repo's `roadmap.md` and `progress.md` conventions, not from the article
files. Expect mismatches. Finding them is the deliverable.

---

## 1. Correct PR #1 before it merges

Three submodules should not be there. Per `docs/adr/0002-demo-labs.md`, the demo labs are
not corpora and are not submodules of this repo.

```
git submodule deinit -f content/auth content/authz content/websec
git rm -f content/auth content/authz content/websec
```

Confirm `content/` holds exactly four: `nextjs`, `react`, `angular`, `nestjs`.

Also verify `.gitmodules` points `content/react` at `EverythingFromDayOne/react-concepts`
and that every entry has `ignore = none`. Report the file contents.

## 2. Audit the four corpora — the point of this session

Write `scripts/audit-frontmatter.mjs`. It walks every `.md` under each submodule, parses
frontmatter with `gray-matter`, runs the matching adapter, and produces a report. It must
**not** stop at the first failure — collect everything.

Per repo, report:

- files found, parsed, failed
- **every distinct frontmatter key present**, with a count, and whether the adapter uses it
- every adapter-required key absent from any file, with example paths
- every distinct value seen for `status`, `difficulty`, and each `*_baseline`
- every `related` entry that could not be resolved, with its source path

Write it to `docs/audit/frontmatter-2026-XX-XX.md` and commit it. **Do not fix anything in
this task.** Observe first.

## 3. Correct the adapters — the adapters, never the corpus

Using the task 2 report, correct `packages/content-schema/src/adapters/index.ts`.

- **Never edit a file under `content/`.** A genuinely malformed article goes on a "corpus
  fixes needed" list; fixing it is a separate PR in that repo.
- **Never widen a schema to make a failure disappear.** A fourth `difficulty` value gets
  reported, not added to the enum.
- **Never add a default** to paper over a missing required field.
- Delete `⚠ UNVERIFIED` notices only for the specific claims this audit actually verified.

Expect most articles to fail on missing `description`. That is correct and expected — it is
the Q1 pass and it runs separately via `prompts/corpus-description-pass.md`. Count them, do
not fix them here.

## 4. Section extraction

Add `extractSections()` to the schema package: walk the MDX AST, take `##` and `###`,
emit `{ anchor, heading, depth, ordinal }`.

Anchors must match **GitHub's slugification exactly**. Roughly ninety internal links in
`react-concepts` were authored and repaired against it; a subtly different slugifier
silently breaks every anchored cross-reference.

Test against `error-boundaries.md`, which had headings promoted from bold-lead blocks
specifically so anchors resolve. If your slugifier disagrees with the anchors those
articles link to, your slugifier is wrong.

## 5. Catalog builder

`scripts/build-catalog.mjs` → `catalog.json`, matching `Catalog` in `catalog.ts`.

Walk submodules → adapt → extract sections → resolve every `related` ref → load
`curation/paths/*.yaml` → emit. Record each submodule's tag and commit in `sources`.

Resolution follows `ArticleRef.resolution`:

| resolution | Meaning | Behaviour |
|---|---|---|
| `article` | mounted corpus | must resolve to a real article, else **FATAL** |
| `planned` | `dsa`, no remote yet | `plannedTargets`, **warn** |
| `demo` | `auth` `authz` `websec` | `demoTargets`, **warn** |

A ref to a complete article that resolves is an edge. A ref to a **draft** is fatal in
production builds, a warning when `SHOW_DRAFTS=1`.

**Report every `demoTargets` entry.** If articles already link to the demo labs, that is
input for ADR-0002 — it would mean the corpus assumes a destination that does not exist yet.

## 6. The gates

- `verify-frontmatter.mjs` — every article adapts cleanly
- `verify-links.mjs` — zero fatal unresolved refs; zero draft targets in production
- `verify-catalog.mjs` — no duplicate uid; no path item pointing at a missing or draft
  article; every `folder` present in the tree
- `verify-submodules.mjs` — exactly four, each pinned to a tag, none dirty

**A gate that exits 0 because it found nothing to check is a broken gate.** Each must fail
on an empty input set, and each must be *proven* to fail: break something deliberately,
capture the output in the session log, restore it.

`verify-sidecars.mjs` is deferred — no sidecar files exist yet.

## 7. Close

Four mandatory doc steps, then `/commit`. Author `prompts/session-3.md`.

---

## Out of scope

- Any UI, styling, or component work
- Any `apps/api` code
- Editing anything under `content/`
- The `description` frontmatter pass
- Deploying or embedding the demo labs — that needs ADR-0002 accepted first
