# Lesson surface animations — Phase 1 (polish + UX, informed by reference video)

**Base branch:** `origin/main` at the latest commit at task time (should
include PR #39 + the draft PR #40 if merged).
**New branch:** `cursor/lesson-animations-phase1-<random suffix>`
**PR title:** `feat(lesson-animations): Phase 1 — callout reveal + quiz verdict + flashcard flip + dragdrop polish + copy toast`
**Date authored:** 2026-08-27

---

## Prerequisite

Read these files first — they are the analysis you will be implementing:

- `docs/lesson-animations-audit-2026-08-27.md` (this repo, on `main`) —
  full audit, ranking, scoring, and detailed per-pattern reasoning.
- `apps/web/components/article/lesson-tokens.css` — existing lesson
  styles. Do NOT duplicate or contradict these.
- `packages/mdx-components/src/{quiz,flashcard,callout,dragdrop}.tsx` —
  the primitives you will modify. Read all four before changing any.
- `packages/ui/src/tokens.css` — design tokens. Add motion tokens here,
  not in lesson-tokens.css.
- `apps/web/components/article/article.css` — chrome styles; do NOT
  touch.

## Goal

Add **six animation/UX polish patterns** (all CSS-only or 2-line component
additions, all gated behind `prefers-reduced-motion`) to the lesson
surface so it stops feeling static next to a modern lesson platform's
page. **No new primitives, no new sidecar types, no schema changes.**
This is pure polish on top of the existing Quiz / Flashcard / Callout /
DragDrop primitives shipped in PRs #37-39.

Reference: `docs/lesson-animations-audit-2026-08-27.md` ranks 22 patterns
extracted from a 48-second reference video. Phase 1 ships patterns #1,
#2, #3, #4, #5, #6, #19, #20 (the high-fit, high-payoff, low-effort
ones). Phase 2 will cover patterns #7, #8, #9, #12 in a separate
prompt.

## Strict constraints (must hold)

- Do NOT touch `apps/web/components/article/{article.css,toc-rail.tsx,article-shell.tsx,article-view.tsx,sidebars.tsx}`.
  These are app chrome and stay on app tokens.
- Do NOT touch any existing sidecar schema (Quiz, Flashcard, Callout,
  DragDrop) or the `article-widgets.ts` projection — the answer-key leak
  path from PR #32 + #38 must remain in.
- Do NOT touch `apps/web/messages/en.json` unless a new i18n key is
  genuinely needed for a new aria-label. Prefer reusing existing labels.
- Do NOT introduce new dependencies (no framer-motion, no animation
  library). CSS transitions and keyframes only.
- Do NOT touch `roadmap.md`, `docs/DEBT.md`, `.cursor/rules/`.
- Do NOT change the visual styling (colors, fonts, sizes, paddings)
  of any existing primitive. **Only add motion on top.**
- All new transitions must be gated by `@media (prefers-reduced-motion:
  no-preference)` for the experience AND have an explicit
  `prefers-reduced-motion: reduce` override that disables them. Users
  with vestibular disorders are non-negotiable.

## Scope (six patterns)

All file paths are relative to repo root.

### Pattern 1 + 2: Quiz option color transitions + verdict reveal

**Goal:** Quiz options gain a smooth color transition on `.ok`/`.no`
class application (currently they snap), and the verdict line +
explanation appear with a fade+translateY reveal.

**Files:**
- `apps/web/components/article/lesson-tokens.css` — add `transition`
  rule for `.av-qz-opt` (already has the classes; just missing the
  transition declaration).
- `apps/web/components/article/lesson-animations.css` (NEW) — define
  `lesson-rise-in` keyframes and the `[data-mounted='true']` selector
  that triggers the reveal.
- `packages/mdx-components/src/quiz.tsx` — on submit, set
  `data-mounted="false"` initially on `.av-qz-verdict` and `.av-qz-ex`;
  flip to `"true"` after the verdict state lands. Server-render keeps
  them as `data-mounted="false"` (so no flash on mount).

**Test:**
- `packages/mdx-components/test/quiz.test.ts` — add a test asserting
  that after submission, the verdict element has `data-mounted="true"`
  in its rendered output. Use Testing Library / `renderToString` so we
  don't need a real DOM.
- Test the tautology: replace the `data-mounted` setter with a no-op,
  run the test, confirm it fails; restore and confirm it passes.

### Pattern 3: Callout scroll-reveal

**Goal:** Callouts fade in from below 12px when they enter the viewport.
Static before the scroll, smooth on entry, no further motion.

**Files:**
- `packages/mdx-components/src/callout.tsx` — wrap the existing server
  render in a small `'use client'` component that uses
  `IntersectionObserver` to toggle `.is-revealed` once per element.
  Server-render the `<aside className="av-callout">` so SSR is
  preserved. On the client, attach the observer in a `useEffect`,
  disconnect after first reveal.
- `apps/web/components/article/lesson-animations.css` — add
  `.av-callout` rule with `opacity: 0; transform: translateY(12px);`
  base state and `.av-callout.is-revealed` rule with the settled state.
  Transition: `var(--duration-slow) var(--ease-out)`.
- `apps/web/components/article/lesson-tokens.css` — add the
  `.is-revealed` reset under the existing
  `prefers-reduced-motion: reduce` block so reduced-motion users see
  callouts immediately.

**Test:**
- `packages/mdx-components/test/callout.test.ts` — add a test that
  renders a callout and asserts the initial HTML has
  `class="av-callout"` (without `is-revealed`). Use a JSDOM
  IntersectionObserver mock that fires the entry callback and confirm
  the class is added. (If JSDOM mocking is too heavy, assert the
  `useEffect` registers the observer and the class addition is
  delegated — disclose the limitation and document it.)

### Pattern 4: Flashcard 3D flip

**Goal:** Replace the current `display:none/block` front/back toggle
with a 3D flip via `transform: rotateY(180deg)`. The current
implementation works but feels web-1.0; the flip is universally
recognized as "this is a flashcard."

**Files:**
- `apps/web/components/article/lesson-animations.css` — add
  `perspective: 1000px` to `.av-flashcard-card`, add
  `backface-visibility: hidden` to `.av-flashcard-front` and
  `.av-flashcard-back`. Position the back absolutely with
  `inset: 1.1rem 1.2rem` and `transform: rotateY(180deg)`. Add a
  transition on the card itself (`.av-flashcard-card`):
  `transform var(--duration-slow) cubic-bezier(0.4, 0, 0.2, 1)`. When
  `.is-flipped`, the card transforms `rotateY(180deg)`.
- `apps/web/components/article/lesson-tokens.css` — REMOVE the
  `display:none` rules on `.av-flashcard-front` / `.av-flashcard-back`
  and the visibility toggling (move it to lesson-animations.css). Keep
  the color rules.
- `packages/mdx-components/src/flashcard.tsx` — simplify the click
  handler: just toggle the `.is-flipped` class. The CSS handles the
  front/back visibility. For `prefers-reduced-motion: reduce` users,
  also toggle `aria-hidden` on the non-current face so screen readers
  don't read both. The CSS reduced-motion override handles the visual
  side.

**Test:**
- `packages/mdx-components/test/flashcard.test.ts` — add a test
  asserting that clicking a card flips the `.is-flipped` class on it
  and only one face is visible per face's
  `aria-hidden`/`visibility`/opacity state. Use Testing Library or
  `renderToString` + manual DOM inspection.
- Tautology check: remove the click handler logic, confirm test fails,
  restore, confirm passes.

### Pattern 5: Drag-drop hover, focus, drag-target polish

**Goal:** Drag-drop chips lift on hover; slots gain an `.is-target`
state when a chip is dragged over them; existing `.is-ok` / `.is-no`
classes gain transitions on their border-color changes.

**Files:**
- `apps/web/components/article/lesson-animations.css` — add
  `transition` rule to `.av-dd-chip` and `.av-dd-slot`. Add
  `.av-dd-chip:hover` rule with `transform: translateY(-1px)` and
  subtle `box-shadow`. Add `.av-dd-slot.is-target` rule with
  accent-color border + tinted background. Extend `.av-dd-slot.is-ok`
  and `.av-dd-slot.is-no` rules with `transition: border-color
  var(--duration-slow) var(--ease-out)`.
- `packages/mdx-components/src/dragdrop.tsx` — in the existing
  `onDragOver` / `onDragEnter` / `onDragLeave` handlers (or add them
  if missing), toggle the `.is-target` class on the slot being
  entered/left. Disclose: prefer `pointer-events`-aware detection over
  `dragover` since the latter fires constantly while over the target.

**Test:**
- `packages/mdx-components/test/dragdrop.test.ts` — extend with a
  test that asserts the `.is-target` class is added on dragover and
  removed on dragleave. Use a JSDOM `dragenter`/`dragleave` event
  dispatch; or if too noisy, assert the underlying handler logic
  via direct call (disclose which).
- Tautology check: remove the `.is-target` toggle from the handler,
  confirm test fails, restore, confirm passes.

### Pattern 6 (covered by 5): Drag-drop correct/error flash

Already covered by adding the `transition` to `.av-dd-slot.is-ok` /
`.is-no` (above). The existing `prefers-reduced-motion: reduce`
override at the bottom of `lesson-tokens.css` that sets
`transition: none` for `.is-ok`/`.is-no` stays in place — we just add
the positive-direction transition alongside.

### Pattern 19 + 20: Copy button toast + flashcard scroll-snap easing

**Goal:** The copy button (`.av-cbcopy.done`) gets a brief scale pulse
on toggle, signaling "Copied!" acknowledgeably. Flashcard
horizontal-scroll gets a tiny settle animation when scroll-snap
engages.

**Files:**
- `apps/web/components/article/lesson-animations.css` — define
  `lesson-toast-pulse` keyframes (0% scale 1, 40% scale 1.05, 100%
  scale 1, all 600ms). Apply to `.av-cbcopy.done`.
- For the scroll-snap easing: this is a browser-native feature;
  adding `scroll-behavior: smooth` on `.av-flashcard-track` is enough
  for the user's manual scroll. For programmatic scroll (e.g.
  clicking the prev/next arrow buttons), we already
  use `scrollIntoView({ behavior: 'smooth' })` if it exists — confirm
  in `packages/mdx-components/src/flashcard.tsx` and disclose.

**Test:**
- `apps/web/test/article-widgets.test.ts` (or a new
  `lesson-animations.test.ts`) — assert the `.av-cbcopy.done` class
  exists in the rendered HTML when the copy button is clicked. The
  existing copy-button styling is already covered; we just need a
  smoke test confirming the class toggling works after this change.

### Motion tokens (Pattern: underlying infra)

**Goal:** Add the missing `--duration-base`, `--duration-slow`,
`--ease-in-out`, `--ease-spring` tokens to the design system so we
don't sprinkle raw ms/cubic-bezier values across CSS files.

**File:** `packages/ui/src/tokens.css` — add four lines under the
existing `/* ---- Motion ---- */` block:

```css
  --duration-base: 200ms;
  --duration-slow: 400ms;
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

**No new tests** for tokens — they're consumed by the CSS rules above.

---

## Required deliverable: a new file

`apps/web/components/article/lesson-animations.css` — single new file,
imported by `apps/web/components/article/lesson-tokens.css` at the
bottom (so it can override the existing display:none rules on flashcard
front/back). ~150 lines. The audit doc has the proposed content. Adapt
freely; just keep:

- The four keyframes blocks (`lesson-rise-in`, `lesson-rise-in-loud`,
  `lesson-flip-to-back`, `lesson-toast-pulse`).
- The `[data-mounted='true']` selector pattern.
- The `.av-callout` + `.is-revealed` transition pair.
- The flashcard `perspective` + `backface-visibility` flip mechanism.
- The drag-drop `is-target` selector.
- The full `prefers-reduced-motion: reduce` override block at the
  bottom (must reset everything we added).

---

## Verification (run all, report results)

- `pnpm typecheck` clean (5/5 tasks).
- `pnpm test` green — report the apps/web count, mdx-components count,
  content-schema count. Expect mdx-components to grow by ~3-4 tests
  (one per pattern with a test), apps/web unchanged or +1.
- `pnpm build:catalog` succeeds.
- `pnpm --filter @corpus/web build` succeeds — report prerendered
  page count (should still be 213).
- **Reduced-motion check (manual):**
  Build the app, navigate to
  `/en/courses/react-render-cycle/lessons/jsx-and-rendering`. In
  Chrome DevTools, toggle "Emulate CSS prefers-reduced-motion:
  reduce". Verify:
  (a) Callouts appear immediately (no fade).
  (b) Flashcard click instantly toggles front/back (no flip).
  (c) Quiz options change color instantly on verdict.
  (d) Drag-drop slots change border instantly on submit.
  If you can't emulate in your sandbox, document the CSS override
  block and confirm by inspection that every new transition has a
  matching reduced-motion reset.
- **Live curl regression:** on the prerendered HTML for
  `jsx-and-rendering`, confirm the widget counts stay at 2/1/2/1 and
  there is zero `accepts:` / `correctSlots:` / `"correct":true` leakage
  (the answer-key leak rule from PR #32 + #38 still holds — this PR
  touches no leak-path code).
- Control lesson `rendering-lists-and-keys` still renders 0 widgets.
- **Visual smoke test:** open `jsx-and-rendering` in a real browser
  (or Chrome `--dump-dom` to confirm the new classes are present in
  rendered HTML): confirm the `is-revealed` toggle works on
  callouts, the flashcard flip works, the verdict reveal works after
  quiz submit. If browser automation isn't available, document the
  limitation and confirm by HTML inspection that the new data-* /
  class hooks are emitted correctly.

## Done = open the PR

When all of the above is green, open the PR with:

- **Title**: `feat(lesson-animations): Phase 1 — callout reveal + quiz verdict + flashcard flip + dragdrop polish + copy toast`
- **Branch**: `cursor/lesson-animations-phase1-<random suffix>`
- **Base**: `main`
- **Body**: Include the verification counts, list of new/modified
  files, the audit doc reference, and any invented decisions under
  "Invented decisions".

Report back when the PR is open.