---
name: corpus-content-boundary
description: "Rules for anything touching content/, the seven submoduled corpus repos. Use when a gate fails on a corpus file, when adding quiz or flashcard sidecars, when injecting an interactive component into an article, when bumping a submodule to a new tag, or whenever a task would be solved by editing a file under content/. Explains why editing the corpus from this repo is never the fix."
---

# The content boundary

`content/` holds seven git submodules. Those repos are the single source of truth and are
standalone artifacts in their own right. **This repo never writes to them.**

`.gitignore` does not and cannot protect them — a parent repo tracks a submodule as a
gitlink, a commit SHA, not as files. The guard is `verify-submodules.mjs` in CI and as a
pre-commit hook, plus `submodule.<name>.ignore = none` in `.gitmodules`.

## When a gate fails on a corpus file

The fix is **never** to edit the file. Pick one:

1. The adapter is wrong → correct `packages/content-schema/src/adapters/index.ts`
2. The corpus is genuinely wrong → report it, fix it in that repo, cut a new tag, then
   `/promote-content` here
3. The article is a draft → confirm `status` and let draft gating exclude it

If you find yourself opening a file under `content/` in write mode, stop.

## Claim vs rendering — the whole rule

> If it is a claim, it lives in the corpus. If it is a rendering, it lives here.

A quiz question asserts how a framework behaves. That is a claim, and it belongs beside the
article under the corpus's verified-claims discipline:

```
content/nextjs/docs/concepts/caching/cache-components.md
content/nextjs/docs/concepts/caching/cache-components.quiz.yaml
content/nextjs/docs/concepts/caching/cache-components.deck.yaml
```

Where an event-loop simulator gets injected is presentation, and belongs here:

```yaml
# curation/overrides/reactjs-how-react-renders.yaml
schema: 1
article: reactjs/how-react-renders
inject:
  - afterSection: render-phase
    component: FiberWalkthrough
    props: { preset: mount }
```

**Never add an MDX component tag into a corpus article.** The moment an article contains
`<FiberWalkthrough />` it stops rendering on GitHub, which is currently its only reader.

## Promotion

Corpus repo tags a release → `repository_dispatch` → PR here bumping the pointer → gates →
**human merge**. One submodule per PR, so a failing gate is unambiguous.

## Avoid

- Never edit, format, or lint any file under `content/`
- Never `git add` inside a submodule
- Never pin a submodule to a branch — tags only
- Never auto-merge a promotion PR
- Never widen a schema to make a corpus file pass
- Never bump two submodules in one PR
- Never assume `auth`, `authz`, or `websec` follow the sibling frontmatter schema
- Never submodule `dsa-concepts` — it has no remote; it is a planned corpus and refs to it
  warn rather than fail
