# Lesson surface animations — Phase 3 (drag-drop feedback + chrome + stagger)

**Base branch:** `origin/main` at the latest commit at task time.
**New branch:** `cursor/lesson-animations-phase3-<random suffix>`
**PR title:** `feat(lesson-animations): Phase 3 — drag-drop slot shake, inline-code chip hover, widget stagger reveal`
**Verify and merge only after the human relays the PR link back through Hermes.**

---

## Goal

Add **three small polish patterns** (all CSS-only, all gated behind
`prefers-reduced-motion`) to the lesson surface and chrome:

1. **Drag-drop slot shake on incorrect placement** — when a slot
   flashes red after grading (the `.av-dd-slot.is-flash-no` state
   already exists per PR #41), the slot briefly shakes horizontally
   so the learner notices the mistake. The shake should run exactly
   once during the `FLASH_MS` window (currently 600ms per
   `packages/mdx-components/src/dragdrop-model.ts`) and settle into
   the static `is-no` red border.

2. **Inline code chip background hover** — when the learner hovers
   an inline `<code>` chip inside prose (the `:not(pre) > code`
   selectors already exist in the codebase), the chip background
   pulses to a slightly more saturated tone over ~150ms. This makes
   it feel interactive without making it feel button-y.

3. **Widget stagger reveal** — when a lesson first scrolls into view,
   its widgets (`.av-callout`, `.av-qz`, `.av-flashcard`, `.av-dd`)
   fade in one after another with a small `animation-delay` step.
   This is pattern #13 from the audit doc, which was originally
   deferred because only one lesson had widgets. We now have six
   (`jsx-and-rendering`, `components-and-props`, `component-composition`,
   `conditional-rendering-and-events`, `rules-of-react`,
   `thinking-in-react`) — multiple widgets per page is the norm, so
   a gentle stagger reads well.

Reference: `docs/lesson-animations-audit-2026-08-27.md` documents all
22 candidate patterns. Phase 1 (PR #41) shipped #1, #2, #3, #4, #5,
#6, #19, #20. Phase 2 (PR #43) shipped #7, #8, #9, #12. This prompt
ships pattern #5's deferred follow-up (chip shake on incorrect
placement — see Decisions section, audit decision #5), pattern #10
(inline code chip hover), and pattern #13 (stagger reveal).

## Strict constraints (must hold)

- **CSS-only. No new JS components, no new React components, no new
  props, no schema changes.** Phase 1 and Phase 2 established that
  everything in this layer is achievable in pure CSS.
- **Reuse the motion tokens from `packages/ui/src/tokens.css`.** The
  tokens already shipped: `--duration-fast`, `--duration-base`,
  `--duration-slow`, `--duration-graph`, `--ease-out`,
  `--ease-in-out`, `--ease-spring`. Don't introduce new tokens
  unless absolutely necessary — if you do, add them to `tokens.css`
  with the existing convention.
- **All animation gates behind `@media (prefers-reduced-motion:
  no-preference)` or `@media (prefers-reduced-motion: reduce)`.**
  Phase 1's `lesson-animations.css` already has the gate structure;
  copy it.
- **No new files unless required.** Add to existing
  `apps/web/components/article/lesson-animations.css` for the lesson
  surface (shake + stagger). For inline-code chip hover, add to
  `apps/web/components/article/article.css` or `lesson-tokens.css` —
  whichever already holds the `:not(pre) > code` rule. Explain the
  choice in the PR body.
- **Tests required for any new behavior.** For each new pattern:
  - CSS rule asserted by reading the file (token used, gate present).
  - One JSDOM/Node assertion that the keyframe is reachable from
    the production selector (the element starts the animation when
    the class is present, doesn't run on reduced-motion).
  - Phase 2's `lesson-animations.test.ts` has the right shape —
    extend it, don't create a separate file.
- **No invented content / no invented widget IDs.** All primitives
  (`.av-qz`, `.av-dd`, `.av-dd-slot`, `.av-dd-chip`,
  `.av-callout`, `.av-flashcard`) already exist. Do not create new
  class names.
- **The shake must respect `FLASH_MS` timing.** The shake animation
  duration must fit inside the 600ms flash window so the slot
  transitions cleanly into its static `is-no` state.

## Files you will touch

- `apps/web/components/article/lesson-animations.css` — append the
  shake keyframe + the stagger reveal CSS. Both gate behind
  `@media (prefers-reduced-motion: no-preference)`.
- `apps/web/components/article/article.css` or
  `lesson-tokens.css` — the inline-code chip hover rule (whichever
  already has the base `:not(pre) > code` styles).
- `apps/web/test/lesson-animations.test.ts` — extend the existing
  test (don't create a separate file). Add assertions for each new
  pattern: keyframe declared, selector reachable, reduced-motion
  override present.
- `CHANGELOG.md` — one line per shipped pattern under `## [Unreleased]`.
- `.agents/SESSION-LOG.md` — append a Phase 3 entry with PR number,
  files changed, test counts, invented decisions.

## What to ship, in detail

### 1. Drag-drop slot shake on incorrect placement

Per `packages/mdx-components/src/dragdrop-model.ts`, the `applyGrade`
function sets `flash: { [slotId]: 'ok' | 'no' }` on the board.
Currently the slot renders with `is-flash-no` (or `is-flash-ok`)
during the 600ms flash window, then `applyGrade` is settled into
`is-no` (or `is-ok`) for the static state. The shake should run
during the flash window so the learner sees the slot physically
shaking.

Look at the existing `slotClassName` helper in
`packages/mdx-components/src/dragdrop.tsx` to see how the flash
class is composed. Confirm before authoring that the flash class
is named `is-flash-no` (or note the actual name and use that).

In `lesson-animations.css`, add:

```css
@keyframes lesson-dd-shake {
  0%, 100% { transform: translateX(0); }
  15%      { transform: translateX(-6px); }
  30%      { transform: translateX(5px); }
  45%      { transform: translateX(-4px); }
  60%      { transform: translateX(3px); }
  75%      { transform: translateX(-2px); }
}

@media (prefers-reduced-motion: no-preference) {
  .lesson-surface .av-dd-slot.is-flash-no {
    animation: lesson-dd-shake 480ms var(--ease-out) both;
  }
}
```

Considerations:
- 480ms fits inside the 600ms flash window with 120ms of settle
  time before `settleGrade` runs.
- The shake decays (6 → 5 → 4 → 3 → 2 px) so it feels like a
  physical rejection, not a constant buzz.
- Don't reuse `lesson-dd-shake` on the slot's settled `is-no`
  state — that state should sit still so the learner can read the
  explanation. The shake is a one-time event.
- Consider the test assertion: the test must verify
  `is-flash-no` triggers the shake but `is-no` does NOT (no
  animation on settled state). The existing test pattern uses
  `assert.equal(css.includes('...'), false, '...')` for negative
  assertions — use the same shape.

### 2. Inline code chip background hover

Find the existing rule for inline code (`:not(pre) > code`) in
either `article.css` or `lesson-tokens.css`. The base style likely
sets `background-color: var(--color-surface-2)` or similar. Add a
hover rule:

```css
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  :not(pre) > code {
    transition: background-color var(--duration-fast) var(--ease-out);
  }
  :not(pre) > code:hover {
    background-color: color-mix(in srgb, var(--lesson-purple-accent) 8%, var(--color-surface-2));
  }
}
```

Considerations:
- Use the existing `--lesson-purple-accent` token (already in
  use across the codebase). If it doesn't exist, use
  `--color-signal` or whatever accent token is closest.
- `color-mix(in srgb, ...)` is the same pattern Phase 1 + Phase 2
  used for the hover-lift shadows. Reuse it.
- The hover rule must NOT trigger inside `<pre>` blocks. The
  `:not(pre) > code` selector is the right guard.
- `@media (hover: hover)` excludes touch devices — touch users
  don't get the hover effect because they don't have a hover state.

### 3. Widget stagger reveal on scroll

When a lesson first enters the viewport, fade its widgets in one
after another with a small delay step. The cleanest approach: use
CSS `animation-delay` with `nth-child` selectors so the four
widget classes (`.av-callout`, `.av-qz`, `.av-flashcard`, `.av-dd`)
all play the same fade-in keyframe with staggered delays.

First, check whether the existing `.lesson-surface` container is
the right scoping point. The four widget classes should already be
descendants of `.lesson-surface` (per Phase 1). Add:

```css
@keyframes lesson-widget-rise {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: no-preference) {
  /* Reveal only the widgets within a lesson surface container —
     do not animate widgets that are already in the viewport on
     first paint (they should appear normally). Use a `:not(.is-revealed)`
     or attribute gate so a server-side first render is unaffected. */
  .lesson-surface .av-callout:not(.is-revealed),
  .lesson-surface .av-qz:not(.is-revealed),
  .lesson-surface .av-flashcard:not(.is-revealed),
  .lesson-surface .av-dd:not(.is-revealed) {
    animation: lesson-widget-rise var(--duration-base) var(--ease-out) both;
  }
  .lesson-surface .av-callout:nth-of-type(2),
  .lesson-surface .av-qz:nth-of-type(2),
  .lesson-surface .av-flashcard:nth-of-type(2),
  .lesson-surface .av-dd:nth-of-type(2) {
    animation-delay: 80ms;
  }
  .lesson-surface .av-callout:nth-of-type(3),
  .lesson-surface .av-qz:nth-of-type(3),
  .lesson-surface .av-flashcard:nth-of-type(3),
  .lesson-surface .av-dd:nth-of-type(3) {
    animation-delay: 160ms;
  }
  .lesson-surface .av-callout:nth-of-type(n+4),
  .lesson-surface .av-qz:nth-of-type(n+4),
  .lesson-surface .av-flashcard:nth-of-type(n+4),
  .lesson-surface .av-dd:nth-of-type(n+4) {
    animation-delay: 240ms;
  }
}
```

Considerations:
- **Do NOT reveal widgets on first paint.** Lessons render at the
  top of the page where the widgets are already in view; the
  animation should only run when widgets enter the viewport on
  scroll. The `:not(.is-revealed)` guard is a starting point —
  you may need a different gate (e.g., a `[data-rise-pending]`
  attribute set by an IntersectionObserver in a small client
  wrapper). Choose the simplest approach that does NOT animate
  server-rendered first-paint widgets.

  **Invented decision required here:** if you choose to add a
  small IntersectionObserver wrapper (similar to the callout
  reveal from PR #41), that's a small React component change —
  not strictly CSS-only. Disclose this in the PR body's
  "Invented decisions" section. Alternatively, gate the
  animation purely with a CSS `@supports` rule that won't apply
  to widgets the user hasn't scrolled to (this is harder; the
  IO wrapper is cleaner).

  Either way: the widgets at the top of the page on first render
  must NOT animate in. They should appear normally.

- The four `nth-of-type` selectors are independent (one per
  widget class), so a lesson with 3 quizzes gets each quiz
  staggered but a lesson with 1 quiz and 2 callouts gets the
  callouts staggered independently of the quiz. This means
  animations don't all hit at once.

- 80ms delay step is a good middle ground — fast enough to feel
  like one motion, slow enough to read as intentional.

- If you add the IO wrapper, model it on the existing
  `packages/mdx-components/src/callout-reveal.tsx` (per PR #41).
  Put the wrapper in the same place.

## Verification (do these and report counts)

Before reporting back:

1. **Typecheck:** `pnpm typecheck` — must pass 5/5
2. **Tests:** `pnpm test` — apps/web must pass 35/35 (or higher if
   you add tests). mdx-components, content-schema unchanged.
3. **Build:catalog:** `pnpm build:catalog` — must produce the same
   181 articles.
4. **Production build:** `pnpm --filter @corpus/web build` — must
   produce 213 pages, no errors.
5. **Live HTML verification:** open the prerendered HTML for
   `apps/web/.next/server/app/en/blog/react/jsx-and-rendering.html`
   and confirm:
   - The CSS file `lesson-animations.css` contains the new keyframes
     and rules
   - The HTML widget counts are unchanged (2 quiz / 1 flashcard / 3
     callouts / 1 dragdrop = 7 widgets — note the count is 7 not 6
     because the audit's grep counts both `av-callout-title` and
     `av-callout-body` as `av-callout` matches)
   - Zero leak (`accepts:`, `correctSlots:`, `"correct":true` all 0)
   - The slot that should shake (`.av-dd-slot.is-flash-no`) is in
     the CSS but NOT in the SSR HTML — it's a client-only state
     added by `applyGrade`. Verify this by grepping the HTML for
     `is-flash-no` and confirming 0 matches (it's not in SSR).
6. **Test-tautology proof:** for each new test, demonstrate that
   the test catches the bug by reverting the production CSS rule,
   re-running the test, showing it fails, then restoring. Hermes
   will re-verify this independently before merge.

## What to do if you hit issues

- **CSS lint fails:** run `pnpm lint:css` (or whatever the repo's
  CSS lint is) — the project may use stylelint. Check
  `package.json` scripts.
- **Build fails on lesson path:** check that no new CSS rules have a
  syntax error. Browsers parse CSS loosely but stylelint doesn't.
- **Animation feels wrong:** adjust the period or decay. Document
  the change in the PR body's "Invented decisions" section.
- **The flash class name isn't `is-flash-no`:** check the actual
  name in `packages/mdx-components/src/dragdrop.tsx`. Use the
  literal name; don't guess.
- **Widgets animate in on first paint when they shouldn't:** the
  gate (`.is-revealed` or `[data-rise-pending]`) isn't working.
  Either fix the gate, add the IO wrapper, or skip the stagger
  reveal for first-paint widgets (start the animation only when
  scrolled past a threshold).
- **Need a new motion token:** add it to `packages/ui/src/tokens.css`
  following the existing naming convention. Don't define it inline
  in lesson-animations.css.

## What NOT to do

- Don't introduce new files unless the IO wrapper or a keyframe
  demands one.
- Don't refactor Phase 1 or Phase 2's code; only extend.
- Don't add new primitives; everything here is on existing classes.
- Don't change the schema.
- Don't touch the DragDrop logic beyond what's necessary to add
  the gate class for the stagger (if you go that route).
- Don't invent widget content; only CSS changes (and at most one
  small IO wrapper).

## Reporting back

When the PR is open, report:

- PR number and link
- `additions / deletions / changedFiles`
- typecheck count (e.g. `5/5`)
- apps/web test count (e.g. `35/35` or `38/38` if you added tests)
- mdx-components test count
- catalog article count
- production build page count
- Widget counts on `jsx-and-rendering` (must be 2/1/3/1 = 7)
- Zero-leak verification result
- `is-flash-no` count in SSR HTML (must be 0 — client-only state)
- List of new/modified files
- Any invented decisions under "Invented decisions" — including
  whether you went with the `:not(.is-revealed)` gate, the IO
  wrapper, or another approach for the stagger reveal

Wait for the human to relay your report back through Hermes before
proceeding. Hermes will independently re-verify using the standard
protocol before recommending merge.