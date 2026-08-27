# Lesson surface animations — Phase 2 (gentler polish + chrome motion)

**Base branch:** `origin/main` at the latest commit at task time.
**New branch:** `cursor/lesson-animations-phase2-<random suffix>`
**PR title:** `feat(lesson-animations): Phase 2 — quiz glow pulse, button hover lift, progress bar fill, TOC tick easing`
**Verify and merge only after the human relays the PR link back through Hermes.**

---

## Goal

Add **four gentler polish patterns** (all CSS-only, all gated behind
`prefers-reduced-motion`) to the lesson surface and app chrome:

1. **Quiz glow spotlight pulse** — the existing `.av-qz::before`
   radial-gradient currently breathes opacity 0.82 → 1.0 on
   hover/focus-within. Add a slow opacity pulse (cycle 0.85 ↔ 1.0 over
   ~3s) only when the quiz has focus-within, so the quiz feels alive
   while the user is reading the question, but static when they're not.

2. **Button hover lift** — `.av-qz-go`, `.av-dd-go`, `.av-cbcopy`,
   `.av-pnav a` get `transform: translateY(-1px)` + a soft shadow
   (using existing `--shadow-*` or `--lesson-shadow-*` tokens) on
   hover. `.av-cbb` (the active sidebar pill) does **not** get the
   lift — it should stay flat as the "current" indicator.

3. **Progress bar fill animation** — the sidebar reading-progress bar
   (`.av-pbar i`) currently has `width: 0%` in CSS and is set
   inline-style to the actual % by JS. Animate from `0%` to the
   inline-style value on mount via a `@keyframes` that runs once.
   Falls back to the static width under reduced-motion.

4. **TOC tick width easing** — the sidebar TOC ticks (`.av-tk`)
   already transition width; extend to `--duration-base` +
   `var(--ease-out)` and add a slight opacity transition for the
   text label so the active-tick swap reads as one motion, not two.

Reference: `docs/lesson-animations-audit-2026-08-27.md` documents all
22 candidate patterns; Phase 1 (PR #41) shipped patterns #1, #2, #3,
#4, #5, #6, #19, #20. This prompt ships #7, #8, #9, #12 (the
gentler polish + chrome motion). Phases 3+ would cover the remaining
patterns from the audit.

## Strict constraints (must hold)

- **CSS-only. No new JS components, no new React components, no new
  props, no schema changes.** Phase 1 established that everything in
  this layer is achievable in pure CSS.
- **Reuse the motion tokens from `packages/ui/src/tokens.css`.** The
  tokens already shipped: `--duration-fast`, `--duration-base`,
  `--duration-slow`, `--duration-graph`, `--ease-out`,
  `--ease-in-out`, `--ease-spring`. Don't introduce new tokens unless
  absolutely necessary — if you do, add them to `tokens.css` with
  the existing convention.
- **All animation gates behind `@media (prefers-reduced-motion:
  no-preference)` or `@media (prefers-reduced-motion: reduce)`.**
  Users with reduced-motion preference get the static behavior. Phase
  1's `lesson-animations.css` already has the gate structure; copy it.
- **No new files unless required.** Add to existing
  `apps/web/components/article/lesson-animations.css` (Phase 1's
  file) for the lesson-surface motion. Add the chrome motion
  (progress bar, TOC tick) to either `lesson-animations.css` or
  `article.css` — pick whichever is cleaner and explain the choice in
  the PR body.
- **Tests required for any new behavior.** For each new pattern:
  - CSS rule asserted by reading the file (token used, gate present).
  - If any selector interaction is non-obvious, a JSDOM assertion on
    the markup is fine.
  - Phase 1's `lesson-animations.test.ts` has the right shape — copy
    it and extend.
- **No invented content / no invented widget IDs.** All primitives
  (`.av-qz`, `.av-dd`, `.av-cb`, `.av-pbar`, `.av-tk`, `.av-pnav`,
  `.av-cbcopy`, `.av-cbb`) already exist in the codebase; do not
  create new class names.

## Files you will touch

- `apps/web/components/article/lesson-animations.css` — append the
  four new patterns. Phase 1 already has `lesson-rise-in`,
  `lesson-rise-in-loud`, `lesson-flip-to-back`, `lesson-flip-to-front`,
  `lesson-toast-pulse` keyframes; add new ones here.
- `apps/web/components/article/article.css` — TOC tick easing (`.av-tk`).
  May also need a small read for `.av-pbar i` if the progress-bar
  animation requires tweaks to the static `width: 0%` rule.
- `apps/web/test/lesson-animations.test.ts` — extend the existing
  test (don't create a separate file). Add assertions for each new
  pattern: the rule exists in CSS, the token is referenced, the
  reduced-motion override exists.
- `packages/ui/src/tokens.css` — only if you need a new motion token.
  Probably not.
- `CHANGELOG.md` — one line per shipped pattern (Phase 1 already
  added one; add Phase 2's below it).
- `.agents/SESSION-LOG.md` — append a Phase 2 entry with PR number,
  files changed, test counts, any invented decisions.

## What to ship, in detail

### 1. Quiz glow spotlight pulse on focus-within

In `lesson-animations.css`, add a new keyframe and extend the existing
focus-within rule:

```css
@keyframes lesson-glow-breath {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}

@media (prefers-reduced-motion: no-preference) {
  .lesson-surface .av-qz:focus-within::before {
    animation: lesson-glow-breath 3s var(--ease-in-out) infinite;
  }
}
```

Considerations:
- The animation must **not** run when the quiz doesn't have
  focus-within (just sitting on the page). The `:focus-within` selector
  inside the `@media` gate handles that.
- 3s is slow enough to feel like a breath, not a strobe. If you
  think a different period reads better, document why in the PR.
- Reduced-motion users get the existing static focus-within bump
  (opacity 1, no animation).

### 2. Button hover lift

In `lesson-animations.css`, add:

```css
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .lesson-surface .av-qz-go,
  .lesson-surface .av-dd-go,
  .lesson-surface .av-cbcopy,
  .lesson-surface .av-pnav a {
    transition:
      transform var(--duration-fast) var(--ease-out),
      box-shadow var(--duration-fast) var(--ease-out);
  }

  .lesson-surface .av-qz-go:hover,
  .lesson-surface .av-dd-go:hover,
  .lesson-surface .av-cbcopy:hover,
  .lesson-surface .av-pnav a:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px var(--lesson-shadow-hover);
  }
}
```

Considerations:
- `@media (hover: hover)` excludes touch devices — they don't get
  hover effects because they don't have a hover state.
- `.av-cbb` (active sidebar pill) is intentionally excluded — keep
  it flat as the "you are here" indicator.
- Use existing tokens; if `--lesson-shadow-hover` doesn't exist,
  either reuse `--shadow-sm` or add a new token with a comment.

### 3. Progress bar fill animation

The progress bar (`.av-pbar i`) has `width: 0%` in CSS and JS sets
the actual width inline. To animate on mount without breaking
re-renders, use a CSS `@keyframes` that runs once:

```css
@keyframes lesson-progress-fill {
  from { width: 0; }
  /* the to-state comes from inline style set by JS */
}

@media (prefers-reduced-motion: no-preference) {
  .av-pbar i {
    animation: lesson-progress-fill var(--duration-graph) var(--ease-out) both;
  }
}
```

Considerations:
- The `to` state is implicit — the keyframe goes from 0 to whatever
  the inline `width: X%` says. `animation-fill-mode: both` is
  important so the bar doesn't snap back to 0% before the animation
  starts.
- This animation runs **once per mount**. If the progress bar gets
  re-mounted (page navigation, route change), it animates again.
  That reads as the user's progress "loading in" — desirable behavior.
- Reduced-motion users get the static width (no animation).

### 4. TOC tick width animation

In `article.css` (or `lesson-animations.css` if you prefer), find
the existing `.av-tk` rule and extend its transitions:

```css
.av-tk {
  /* existing width + background transitions */
  transition:
    width var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out),
    color var(--duration-base) var(--ease-out);
}
```

Considerations:
- The `.av-tk` rule may already have a transition; extend it, don't
  duplicate it.
- The `--duration-base` (200ms) is faster than the existing default,
  so the tick swap feels more responsive without feeling jumpy.
- If a separate text label inside `.av-tk` exists (often `.av-lsn a`),
  you may also need to transition its opacity for a coordinated fade.

## Verification (do these and report counts)

Before reporting back:

1. **Typecheck:** `pnpm typecheck` — must pass 5/5
2. **Tests:** `pnpm test` — apps/web must pass 30/30 (or higher if
   you add new tests). content-schema, mdx-components, mdx-components
   quiz/dragdrop unchanged.
3. **Build:catalog:** `pnpm build:catalog` — must produce the same
   181 articles.
4. **Production build:** `pnpm --filter @corpus/web build` — must
   produce 213 pages, no errors.
5. **Live HTML verification:** open the prerendered HTML for
   `apps/web/.next/server/app/en/courses/react-render-cycle/lessons/jsx-and-rendering.html`
   and confirm:
   - The CSS file `lesson-animations.css` contains the new keyframes
     and rules
   - The HTML widget counts are unchanged (2 quiz / 1 flashcard / 2
     callout / 1 dragdrop = 6 widgets)
   - Zero leak (`accepts:`, `correctSlots:`, `"correct":true` all 0)
6. **Test-tautology proof:** for each new test, demonstrate that the
   test catches the bug by reverting the production CSS rule,
   re-running the test, showing it fails, then restoring. Hermes
   will re-verify this independently before merge.

## What to do if you hit issues

- **CSS lint fails:** run `pnpm lint:css` (or whatever the repo's
  CSS lint is) — the project may use stylelint. Check
  `package.json` scripts.
- **Build fails on lesson path:** check that no new CSS rules have a
  syntax error. Browsers parse CSS loosely but stylelint doesn't.
- **Animation feels wrong:** adjust the period (3s → 4s if too fast,
  2s if too slow). Document the change in the PR body's "Invented
  decisions" section.
- **Need a new motion token:** add it to `packages/ui/src/tokens.css`
  following the existing naming convention. Don't define it inline
  in lesson-animations.css.

## What NOT to do

- Don't introduce new files unless Phase 1's pattern clearly demands
  one.
- Don't refactor Phase 1's code; only extend.
- Don't add new primitives; everything here is on existing classes.
- Don't change the schema.
- Don't touch the DragDrop or Quiz logic.
- Don't invent widget content; only CSS changes.

## Reporting back

When the PR is open, report:

- PR number and link
- `additions / deletions / changedFiles`
- typecheck count (e.g. `5/5`)
- apps/web test count (e.g. `30/30` or `32/32` if you added tests)
- mdx-components test count
- catalog article count
- production build page count
- Widget counts on `jsx-and-rendering` (must be 2/1/2/1 = 6)
- Zero-leak verification result
- List of new/modified files
- Any invented decisions under "Invented decisions"

Wait for the human to relay your report back through Hermes before
proceeding. Hermes will independently re-verify using the standard
protocol before recommending merge.
