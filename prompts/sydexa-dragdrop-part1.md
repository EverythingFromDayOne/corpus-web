# Sydexa-clone: Drag-and-Drop Widget Primitive — Part 1 (infrastructure)

**Base branch:** `origin/main` at `514d157` (PRs #36 + #37 merged).
**New branch:** `cursor/feat-sydexa-drag-drop-widget-<random suffix>`
**PR title:** `feat(mdx): drag-and-drop interactive widget primitive (Part 1: infrastructure)`
**Date authored:** 2026-08-27

---

## Goal

Ship the interactive drag-and-drop widget primitive — the fill-in-the-blank
pattern sydexa.com uses in its SQL lessons (`kéo từng mảnh vào chỗ trống` —
drag SQL keywords into the right slots to compose a query). One PR.

This is **Part 1 of 2**. Part 1 is **pure infrastructure**: schema, primitive,
registration, actions, tests. Part 2 (separate file,
`sydexa-dragdrop-part2-sample.md`) appends the sample sidecar to
`curation/overrides/react-jsx-and-rendering.yaml` and runs the full
integration check. **Do NOT include a sample sidecar in this PR.**

---

## Run / model configuration

Slack does **not** pass `model=`, `reasoning=`, `context=`, or `fast=` to the
Cursor picker. After the agent opens on `cursor.com/agents`:

1. Open the model picker.
2. Set **Effort = Extra High**.
3. Set **Fast = OFF**.
4. Do this **before** sending the first follow-up. If Fast flips on after the
   first reply (known Grok 4.6 cloud-agent bug), follow-ups bill 2x.
5. The user's dashboard Default Model is already set to Fast off, so the
   agent should start correctly — just verify on the picker.

---

## Anchor primitives (don't reimplement — extend alongside)

- **QuizPrimitive, FlashcardPrimitive, CalloutPrimitive** from PR #37
  (`packages/mdx-components/src/{quiz,flashcard,callout}.tsx`,
  registered via `packages/mdx-components/src/index.ts`, injected via
  `packages/mdx-components/src/inject-after-sections.tsx`).
- **Sidecar schema registration** in
  `packages/content-schema/src/sidecars.ts` (Quiz, Flashcard, Callout are
  siblings there — add DragDrop as a fourth).
- **Lesson design tokens** in
  `apps/web/components/article/lesson-tokens.css`. The D&D widget should
  consume `--lesson-text-highlight`, `--lesson-purple-accent`,
  `--lesson-bg-disabled`, `--lesson-icon-success`, `--lesson-icon-error`.
- **PR #36's heading-id matching** (afterSection on real headings works
  since `514d157`).

---

## Scope

### 1. Drag-and-drop primitive

Create:
- `packages/mdx-components/src/dragdrop.tsx`
- `packages/mdx-components/src/dragdrop-model.ts`
- `packages/mdx-components/test/dragdrop.test.ts`

Behavior:

- **'use client' React component.** Server renders a static preview (slot
  list + chip pool side by side). Client hydrates the full D&D interactivity.
- **Slots**: drop zones arranged in target order (e.g. `SELECT ___ FROM ___`).
  Each slot has a fixed width so layout doesn't shift when chips drop in.
- **Chips**: pool rendered below (or beside on wide screens). User drags a
  chip onto a slot; it snaps in. Dragging a chip already in a slot to a
  different slot empties the first. Dragging a chip from a slot back to the
  pool empties the slot.
- **Two validation modes** (must support both):
  - `exact` — each slot has a single correct chip id; passes only when
    every slot is filled AND each chip is in its correct slot. Pool shuffles
    on mount.
  - `ordered` — slot accepts an ordered list of correct chip ids; looser
    matching. Opt-in via sidecar `mode: "ordered"`. Default is `exact`.
- **Two interaction modes** (must support both):
  - **Mouse/touch**: HTML5 native `dragstart` / `dragover` / `drop`. Verify
    no SSR hydration mismatch.
  - **Keyboard**: Tab focuses the chip pool, Arrow keys move between chips,
    Enter "picks up" a chip, Arrow keys move between slots, Enter drops.
    ARIA: `role="listbox"` on the pool, `role="option"` on each chip with
    `aria-selected`, `role="button"` on each slot with `aria-label`
    describing expected chip.
- **Visual** (lesson tokens only — **no hardcoded colors**):
  - Slot empty: `background: var(--lesson-bg-disabled)`.
  - Slot with chip: `background: var(--lesson-purple-accent) / 20%`.
  - Chips: `background: var(--lesson-bg-card)`,
    `border: var(--lesson-purple-border) / 30%`.
  - Correct match: slot border switches to `var(--lesson-icon-success)`
    for ~600ms then back to neutral.
  - Wrong match: slot border switches to `var(--lesson-icon-error)` for
    ~600ms then resets empty (chip returns to pool).
- **Submit button** (use i18n key, add to `apps/web/messages/en.json`).
  Disabled until every slot is filled. Shows success/failure indicator and
  reveals the single `explanation` line below (if sidecar provides one).
- **Reset button** (X / ↻ icon, top-right of the widget). Returns all chips
  to the pool and clears success/failure state.
- **Accessibility**: full keyboard parity (no mouse-only paths),
  `aria-live="polite"` region announces success/failure,
  `prefers-reduced-motion` disables the success/failure flash.
- **No-JS / SSR fallback**: server renders all slots showing the correct
  chip text in a static read-only line — e.g.
  `Answer: SELECT * FROM users WHERE id = 1` — so the article still has
  pedagogical value without the widget.

### 2. Sidecar schema

Create `packages/content-schema/src/dragdrop-sidecar.ts` (separate file,
following PR #37's `flashcard-sidecar.ts` pattern).

Schema shape:

```ts
type DragDropSidecar = {
  id: string;
  title: string;
  afterSection: string;
  mode?: 'exact' | 'ordered'; // default 'exact'
  prompt?: string;            // shown above the widget, optional
  explanation?: string;       // shown after submit, optional
  slots: Array<{
    id: string;
    label?: string;           // shown above slot (e.g. "keyword", "column", "operator")
    accepts: string[];        // chip ids; must be non-empty
  }>;
  chips: Array<{
    id: string;
    text: string;             // the visible chip text correctSlots: string[];          // slot ids this chip is correct for
  }>;
};
```

Validation rules:

- Every chip's `correctSlots` must reference a real slot.
- Every slot's `accepts` must reference at least one real chip.
- In `exact` mode, each chip's `correctSlots` should be a single slot id.
  Warn if more than one (auto-correct to first + log a SESSION-LOG warning).
- Chip ids and slot ids must be globally unique within the sidecar.

Then:

- Register the new schema in `packages/content-schema/src/sidecars.ts`
  alongside `QuizSidecar` / `FlashcardSidecar` / `CalloutSidecar`.
- Update `packages/content-schema/src/index.ts` exports.

Add at least **3 unit tests** in
`packages/content-schema/test/dragdrop-sidecar.test.ts`:

- accept a well-formed sidecar
- reject slot referencing unknown chip
- reject chip with empty correctSlots
- warn on ambiguous chip in `exact` mode

### 3. Primitive registration + injection

- `packages/mdx-components/src/index.ts` exports `DragDrop` and
  `injectDragDrop` (parallel to `Quiz` + `injectQuiz`).
- `packages/mdx-components/src/inject-after-sections.tsx` (or new file
  `inject-dragdrop.tsx`, your call — disclose) extends
  `injectAfterSections` to handle dragdrop sidecars OR provides a separate
  `injectDragDrops(body, dragdrops[])` function for callers to compose.
- `apps/web/lib/article-widgets.ts` extends `ArticleWidget` union with a
  `DragDropItem` variant and adds a `toClientDragDropWidget()` function.
  **CRITICAL leak rule**: mirror PR #32's quiz leak fix. The client-side
  component must **NEVER** receive `accepts[]` or `correctSlots[]` arrays;
  it only gets chip text, slot ids, and slot labels. The actual check
  happens server-side via a 'use server' action (next item).
- `apps/web/lib/dragdrop-actions.ts` (NEW, `'use server'` file) exposes:
  ```ts
  gradeDragDrop(
    submission: { slotId: string; chipId: string | null }[],
    sidecarId: string,
    articleUid: string,
  ): Promise<{ correct: boolean; filledSlots: number; totalSlots: number }>
  ```
  This is the **only** path that knows the correct answers.
- `apps/web/lib/article-markdown.tsx` registers the D&D widget so it gets
  processed during render (parallel to how Quiz / Flashcard / Callout are
  processed). When a D&D sidecar is present, server-render the no-JS
  fallback line, then hydrate client D&D on top.

### 4. Client component

`packages/mdx-components/src/dragdrop.tsx`:

- `'use client'` directive, OR split into a server-render stub + a
  client-hydrated interactive component (your call — disclose which).
- Local React state: `{slotId → chipId | null}`, plus a derived
  `everySlotFilled` boolean.
- Submit handler calls `gradeDragDrop` via the 'use server' action, shows
  the result.
- Reset handler clears state.
- Pool chip rendering: shuffle on mount with a deterministic seed derived
  from the sidecar id so SSR + first client render match (no hydration
  mismatch).
- On no-JS: server-rendered fallback stays as-is.

### 5. Tests (real, not tautological)

Create `packages/mdx-components/test/dragdrop.test.ts` with:

- **(a)** all slots filled and correct → success state visible.
- **(b)** one slot wrong → failure state, that slot flashes error color
  then resets empty.
- **(c)** drag from slot back to pool empties that slot.
- **(d)** keyboard path: Enter on chip picks up, ArrowRight + Enter drops.
- **(e)** SSR fallback present when JS disabled (assert no-JS line in
  rendered HTML).

**Per the cursor-slack-relay skill test-tautology pitfall**: revert the
client component, run the tests, confirm at least one assertion fails,
then restore. Both directions (test fails on broken fix, test passes on
working fix) are mandatory evidence. If you can't show that, treat the
test as cosmetic and verify the production code change directly.

---

## Constraints (must hold)

- **Do NOT touch** Quiz / Flashcard / Callout sidecars or primitives
  except to register the new D&D alongside (in `sidecars.ts`, `index.ts`,
  `article-widgets.ts`, `article-markdown.tsx`).
- **Do NOT touch** the answer-key leak path for any other primitive.
  PR #32's quiz rule is the source of truth and extends to D&D
  (`accepts[]` and `correctSlots[]` arrays must **NEVER** reach client
  props).
- **Do NOT touch** `roadmap.md`, `docs/DEBT.md`, `.cursor/rules/`.
- **Do NOT touch** av-rail scroll-spy logic, `slug.ts`, `sections.ts`.
- **Do NOT include** any persistence (no `localStorage` for D&D state, no
  server-side scoring of attempts beyond `gradeDragDrop` returning a
  boolean). PR #37's pattern of "no user-state persistence" is the bar.
- **Do NOT include** a sample sidecar in this PR. **Do NOT modify**
  `curation/overrides/react-jsx-and-rendering.yaml`. That's Part 2.
- **DO update** `.agents/SESSION-LOG.md` and `CHANGELOG.md` per
  `AGENTS.md`'s mandatory post-session steps. Disclose every invented
  decision under "Invented decisions" — naming, schema shapes, interaction
  choices, accessibility patterns.

---

## Verification

Run all of these and report results:

- `pnpm typecheck` clean (5/5 tasks).
- `pnpm test` green across all packages — report apps/web count,
  mdx-components count, content-schema count.
- `pnpm build:catalog` succeeds.
- `pnpm --filter @corpus/web build` succeeds — report prerendered page
  count.
- **Background `pnpm dev`.** `curl http://localhost:3000/en/courses/react-render-cycle/lessons/jsx-and-rendering`.
  Confirm response HTML contains:
  - (a) NO 2 `.av-qz` regression (expect **0** — sample sidecar ships in Part 2)
  - (b) NO 1 `.av-flashcard` regression (expect **0**)
  - (c) NO 2 `.av-callout` regression (expect **0**)
  - (d) NO 1 `.av-dd` regression (expect **0** — sample sidecar in Part 2)
  - (e) NO `accepts:` or `correctSlots:` anywhere in HTML payload
    (regression check that this PR doesn't accidentally leak the
    primitive's own sample data; sample sidecar doesn't exist yet so
    this should be 0).
  - (f) `pnpm dev` still serves the lesson page with HTTP 200.
  Kill dev server before reporting.
- Confirm control lesson `rendering-lists-and-keys` still renders **0**
  widgets of any kind.

---

## Done = open the PR

When all the above is green, open the PR with:

- **Title**: `feat(mdx): drag-and-drop interactive widget primitive (Part 1: infrastructure)`
- **Branch**: `cursor/feat-sydexa-drag-drop-widget-<random suffix>`
- **Base**: `main`

Report back when the PR is open.