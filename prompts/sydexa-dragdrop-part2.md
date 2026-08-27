# Sydexa-clone: Drag-and-Drop Widget Primitive — Part 2 (sample sidecar + integration)

**Base branch:** `origin/main` at the commit that includes **Part 1**
(`cursor/feat-sydexa-drag-drop-widget-*` merged first).
**New branch:** `cursor/feat-sydexa-drag-drop-sample-<random suffix>`
**PR title:** `feat(content): drag-drop sample sidecar on jsx-and-rendering`
**Date authored:** 2026-08-27

---

## Prerequisite

**Wait for Part 1 (`prompts/sydexa-dragdrop-part1.md`) to merge to `main`
first.** Your dragdrop primitive must exist in `@corpus/mdx-components` and
`@corpus/content-schema` before this PR can land. If Part 1 is unmerged
when you start, **stop and report** — do not write code against a primitive
that doesn't yet exist in the merged dependency tree.

---

## Goal

Append the drag-and-drop sample sidecar to the existing
`curation/overrides/react-jsx-and-rendering.yaml` (which already has the
PR #37 2 quizzes + 1 flashcard + 2 callouts) and verify the full lesson
page integration end-to-end. **One small PR.** No code changes — Part 1
already shipped those.

---

## Scope

### 1. Append one dragdrop block to `curation/overrides/react-jsx-and-rendering.yaml`

Anchor at the "How it works under the hood" heading (id from PR #36:
`how-it-works-under-the-hood`).

Block content:

- `id`: `"jsx-to-createelement"`
- `title`: `"Compose the JSX → React.createElement mapping"`
- `afterSection`: `"how-it-works-under-the-hood"`
- `prompt`: `"For <Card title=\"Hi\" />, drag the right tokens into the type slot and props slot."`
- `explanation`: `"<Card> is capitalized, so JSX compiles to jsx(Card, { title: \"Hi\" }) — Card is the component function itself, passed by reference. The second arg is the props object. jsx('card', ...) would only be correct if card were lowercase (a DOM tag)."`
- `slots`:
  - `{ id: "type-slot", label: "type", accepts: ["jsx-component-ref", "jsx-component-string"] }`
    (correct in `exact` = `jsx-component-ref`)
  - `{ id: "props-slot", label: "props", accepts: ["jsx-component-ref", "props-object", "props-string"] }`
    (correct = `props-object`)
- `chips`:
  - `{ id: "jsx-component-ref", text: "Card", correctSlots: ["type-slot"] }`
  - `{ id: "jsx-component-string", text: "'card'", correctSlots: [] }` *(distractor)*
  - `{ id: "props-object", text: "{ title: 'Hi' }", correctSlots: ["props-slot"] }`
  - `{ id: "props-string", text: "title: 'Hi'", correctSlots: [] }` *(distractor)*
  - Distractor chips: `["jsx-lowercase", "props-null", "props-array"]` per
    the original Part 1 spec (each with empty `correctSlots`).

### 2. Confirm the no-JS fallback line appears in the prerendered HTML

The server must render the static read-only answer line
(`Answer: Card { title: 'Hi' }` or equivalent) in the HTML payload, not
just on the client. Verify this exists in the prerendered output.

---

## Constraints (must hold)

- **Do NOT modify** the existing quiz / flashcard / callout blocks in that
  YAML. **Append only.**
- **Do NOT modify** any code (no `.ts` / `.tsx` changes in this PR —
  Part 1 ships those).
- **Do NOT touch** `roadmap.md`, `docs/DEBT.md`, `.cursor/rules/`.
- **Do update** `.agents/SESSION-LOG.md` and `CHANGELOG.md` per
  `AGENTS.md`'s mandatory post-session steps. Disclose any invented
  decisions under "Invented decisions".

---

## Verification (full integration check)

Run all of these and report results:

- `pnpm typecheck` clean.
- `pnpm test` green — report counts (must match Part 1's counts — this
  PR adds zero new tests).
- `pnpm build:catalog` succeeds.
- `pnpm --filter @corpus/web build` succeeds — report prerendered page
  count.
- **Background `pnpm dev`.**
  `curl http://localhost:3000/en/courses/react-render-cycle/lessons/jsx-and-rendering`.
  Confirm response HTML contains:
  - (a) **2** `.av-qz` elements (PR #37 regression).
  - (b) **1** `.av-flashcard` element (PR #37 regression).
  - (c) **2** `.av-callout` elements with correct variants
    (`av-callout--info` × 1, `av-callout--warn` × 1) (PR #37 regression).
  - (d) **1** `.av-dd` element (new from this PR).
  - (e) The no-JS fallback line `Answer: ...` is present in the raw HTML,
    not just JS-rendered.
  - (f) **NO** `accepts:` or `correctSlots:` in the HTML payload
    (leak check — answer key must not reach client props).
  - (g) Blog twin of `jsx-and-rendering` shows the same widget counts
    (sidecar must propagate to both routes).
- Control lesson `rendering-lists-and-keys` should render **0** widgets
  of any kind.
- Kill dev server before reporting.

---

## Done = open the PR

When all of the above is green, open the PR with:

- **Title**: `feat(content): drag-drop sample sidecar on jsx-and-rendering`
- **Branch**: `cursor/feat-sydexa-drag-drop-sample-<random suffix>`
- **Base**: `main` (must include the Part 1 merge commit)

Report back when the PR is open.