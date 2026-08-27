# Lesson surface animation/UX audit + ship plan

**Date:** 2026-08-27
**Scope:** Decide which Sydexa animation/UX patterns from the 48-second
reference video are worth shipping into `corpus-web`'s lesson surface, which
are not, and the order to ship them in.

The video is a scroll-through of
`sydexa.com/courses/basic-sql/lessons/select-basics`. Patterns were extracted
from five strategic frames (10s, 20s, 37s, 45s) and the dense-frame motion
analysis (191/193 frames unique = essentially continuous motion, mostly
scroll-driven).

---

## Existing animation surface in corpus-web (baseline)

- **Motion tokens defined** in `packages/ui/src/tokens.css`:
  - `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`
  - `--duration-fast: 120ms`
  - `--duration-graph: 900ms`
  - **Missing:** `--duration-base` (~200ms), `--duration-slow` (~400ms),
    `--ease-in-out`, `--ease-spring` for overshoots. Need to add as part
    of this work.
- **Currently animating (chrome only):**
  - `apps/web/components/article/article.css`: TOC ticks (width + opacity
    transitions), tooltip fade
  - `apps/web/components/home/home.css`: card border-color transitions
  - `apps/web/components/article/lesson-tokens.css`: ONLY the quiz glow
    spotlight opacity on hover (`prefers-reduced-motion: no-preference` block)
- **Existing primitive components (PRs #37, #38) that need animation hooks:**
  - `.av-qz` — quiz card (has glow, no reveal animation on verdict)
  - `.av-flashcard` — flashcard (front/back via `display:none/block` toggle —
    **zero animation**, just snap)
  - `.av-callout` — info/warn callouts (static, no reveal, no color shimmer)
  - `.av-dd` — drag-drop (static classes for ok/no states, no transitions on
    those classes)
- **Design constraints:** calm neutrals + one saturated accent (purple in
  Sydexa, `--color-signal` here). Lesson surface stays scoped to
  `.lesson-surface`. App chrome stays on app tokens (PR #37 lock).

---

## Ranked recommendation table

Patterns are scored on three axes:

- **Fit:** how well it matches corpus-web's existing visual language
  (calm, neutral-heavy, single accent, restrained).
- **Effort:** S = under 30 lines CSS, M = small component tweak, L = new
  component or framework.
- **Educational payoff:** does it help the learner retain / understand.

| # | Pattern from video | Fit | Effort | Payoff | Ship? |
|---|---|---|---|---|---|
| 1 | **Quiz option selected/answered color feedback** — option lifts/border-colors on hover, brief ok/error flash on verdict | High (we already have `.ok`/`.no` classes; just need transitions) | S | High | ✅ Phase 1 |
| 2 | **Quiz verdict reveal** — verdict line + explanation appear with fade+translateY after submit | High (already structurally there) | S | High | ✅ Phase 1 |
| 3 | **Callout subtle reveal on scroll into view** — opacity+translateY from below when IntersectionObserver fires | High | S | Med | ✅ Phase 1 |
| 4 | **Flashcard flip animation** — currently snaps front→back with `display:none/block`. Replace with 3D flip via `transform: rotateY(180deg)` on `.is-flipped` | High | M | High | ✅ Phase 1 |
| 5 | **Drag-drop slot/chip hover states** — chip subtle lift on hover, slot glow when targeted by drag | High | S | High | ✅ Phase 1 |
| 6 | **Drag-drop correct/error flash** — slot border-color transitions over 600ms (already designed but transition is `none` for reduced-motion; need explicit non-reduced transition) | High | S | High | ✅ Phase 1 |
| 7 | **Quiz glow spotlight pulse on focus-within** — extend the existing `.av-qz::before` radial-gradient to also gain a slow opacity breath when focused (not just hover) | Med (slightly animated always; could be distracting) | S | Low-Med | ⚠️ Phase 2 (defer; review after Phase 1 lands) |
| 8 | **Button hover lift** — submit/option buttons get `transform: translateY(-1px)` + shadow on hover | Med (fights our flat aesthetic; can feel button-y) | S | Low | ⚠️ Phase 2 |
| 9 | **Progress bar fill animation** — the sidebar progress bar (`.av-pbar i`) animates width from 0 to current % on mount | Med (we have `.av-pbar i` but no transition) | S | Med | ⚠️ Phase 2 |
| 10 | **Inline code chip background hover** — `:not(pre) > code` chips pulse background on hover | Low (we have `:not(pre) > code` styled but no hover effect) | S | Low | ⛔ Defer (could be visual noise) |
| 11 | **Active sidebar item slide-in accent** — left-edge purple bar slides between sections | Med (we already have `box-shadow: inset 2px 0 0 var(--color-signal)` static — adding slide would need layout-aware animation) | M | Low | ⛔ Defer (chrome, not lesson surface) |
| 12 | **TOC tick width animation** — extend current width+background transitions to ease-out with longer duration | High | S | Med | ⚠️ Phase 2 (chrome) |
| 13 | **Stagger reveal of lesson widget cards on scroll** — quiz/flashcard/callout/dragdrop all fade in one by one as they enter viewport | Med (can feel busy if too many on one page) | M | Med | ⛔ Defer (defer until we have >3 widgets per lesson; one lesson currently) |
| 14 | **Floating gradient/blob background decoration** — animated SVG gradient shapes drifting in background | Low (fights calm aesthetic; visually noisy) | L | Low | ⛔ Skip |
| 15 | **Particle/confetti effects** on quiz correct | Low (would need to import a particle lib, fights editorial tone) | L | Low | ⛔ Skip |
| 16 | **Animated dashed connector line on learning path** (the "Lộ trình bài học" widget) | Med (we don't have a learning-path widget) | L | Low (no widget to apply it to) | ⛔ Skip (no host) |
| 17 | **Pulsing "current step" indicator dot** | Low (we don't have this widget) | M | Low | ⛔ Skip (no host) |
| 18 | **Right-rail progress ring stroke-dashoffset animation** | Med (we have `.av-ring svg` for course progress; needs animation only on lesson complete) | S | Med | ⛔ Skip (chrome + low impact) |
| 19 | **Toast pop animation** (e.g. "Copied!" feedback after copy button click) | High (we have `.av-cbcopy.done` already styled; just need keyframes) | S | Med | ✅ Phase 1 |
| 20 | **Scroll-snap for flashcard carousel** — we already have `scroll-snap-type: x mandatory` on `.av-flashcard-track`. Add a smooth ease on scroll-end settling | High | S | Med | ✅ Phase 1 |
| 21 | **Reduced-motion preference handling** — all new animations must respect `prefers-reduced-motion` (we already gate a few; need to gate all new ones) | High (accessibility) | S | High (a11y) | ✅ Phase 1 (required) |
| 22 | **Prettier scrollbar in lesson surface** (lesson-tokens.css scoped thin scrollbar matching palette) | Med | S | Low | ⛔ Skip (chrome-y, fights focus on content) |

---

## Implementation order

### Phase 1 — "the obvious stuff" (1 PR via Cursor prompt below)

Six changes, all CSS-only or 2-line component additions, all respecting
`prefers-reduced-motion`:

1. **Quiz option color transitions** — add `transition: border-color,
   background-color var(--duration-base) var(--ease-out)` to
   `.av-qz-opt`. Existing `.ok`/`.no` classes now animate instead of snap.
2. **Quiz verdict reveal** — add fade+translateY keyframes (0.4s) for
   `.av-qz-ex` and `.av-qz-verdict` entering the DOM. `opacity 0→1` +
   `translateY(8px)→0`. Trigger via a new `[data-mounted]` attribute set
   by the client component on first render.
3. **Callout reveal on scroll** — `apps/web/components/article/callout.tsx`
   already exists (per PR #37). Add an IntersectionObserver in a small
   client wrapper that toggles `.is-revealed` on a `<aside>`. CSS:
   `opacity 0→1` + `translateY(12px)→0` over 500ms with
   `prefers-reduced-motion` override.
4. **Flashcard 3D flip** — replace the `display:none/block` toggle with a
   `transform: rotateY(180deg)` flip. Front sits in `backface-visibility:
   hidden`. Back is `rotateY(180deg)`. 600ms transition with custom
   `cubic-bezier(0.4, 0.0, 0.2, 1)` for a satisfying settle. All
   `prefers-reduced-motion` users get the existing instant toggle.
5. **Drag-drop hover/focus polish** — add `transition` to `.av-dd-chip`
   (border, transform) and `.av-dd-slot` (border, background). Chip hover:
   `translateY(-1px)` + accent. Slot drag-over state (new `.is-target`):
   `border-color: var(--lesson-purple-accent); background: color-mix(...,
   30%)`.
6. **Toast pop for copy-button feedback** — we already have
   `.av-cbcopy.done` styled. Add `transform: scale(1.05)` + opacity
   breath over 600ms on `.done`. Cheap, high impact, no component change
   needed if existing "Copied!" toggle already runs.

### Phase 2 (only after Phase 1 lands + we see real usage)

- 7 (focus pulse), 8 (button hover lift), 9 (progress bar fill animation),
  12 (TOC width easing) — all small additions, easy to ship in a follow-up.

### Skip / explicit non-goals

- 13 (stagger reveal): only useful when lessons have 3+ widgets.
  Currently only one lesson (`jsx-and-rendering`) has widgets, with 6 of
  them. Re-evaluate after we author sidecars for 3+ more lessons.
- 14, 15 (decorative gradient backgrounds, particles): fights our calm,
  editorial aesthetic.
- 16, 17, 18 (learning-path widgets): no host primitive in corpus-web.
- 19 (sidebar slide-in): chrome, scope creep beyond lesson surface.
- 22 (custom scrollbar): chrome-y noise.

---

## Why these patterns, concretely (per-item reasoning)

### 1 + 2. Quiz option + verdict feedback

**Why it matters:** The quiz is the highest-stakes interaction in a lesson.
The current implementation already has `.ok`/`.no` class application on
submit, but the colors snap instantly. A 200ms ease-out on
`border-color` and `background-color` makes the verdict feel intentional,
not a glitch. The verdict reveal (`.av-qz-ex` + `.av-qz-verdict`) should
fade in from below 8px to give the user a moment to read before the
explanation lands.

**Sydexa's treatment:** Option A has a faint tonal lift on hover, options
gain colored backgrounds (green/red) on submit with no explicit animation
in the static frames but a smooth feel. Our implementation: same goal,
CSS transitions on the existing classes.

### 3. Callout scroll-reveal

**Why it matters:** Callouts are interruptions in the reading flow. The
brain has to switch from "reading prose" to "reading emphasis". A subtle
fade-in from below 12px (500ms) signals "this is new content, different
register" without distracting. IntersectionObserver ensures it only fires
when actually entering the viewport (so readers who scroll past quickly
don't get a busy animation chain).

**Sydexa's treatment:** Callouts appear static in the screenshots; the
"wow" effect comes from the colored left border and tinted background,
not motion. We're adding motion *only* because the Sydexa effect comes
from typography — ours comes from motion-on-scroll.

### 4. Flashcard flip

**Why it matters:** The current implementation (`display:none/block`)
works but feels web-1.0. A 3D flip (600ms) is the universally-recognized
"this is a flashcard" interaction. The visual payoff is high relative to
effort: one new keyframes block, one CSS rule change. All users with
`prefers-reduced-motion: reduce` get the existing instant toggle.

**Sydexa's treatment:** Front card has soft purple gradient + shadow
layering. We don't need the visual layering (Sydexa's flashcard deck
shows 5-7 stacked cards behind the front — we have one card per track
slot). The flip alone is the high-impact part.

### 5. Drag-drop hover polish

**Why it matters:** D&D widgets have the most uncertainty for the user
("did I click the right thing?"). Visual feedback at every step is
critical. Three small additions: chip lift on hover, slot accent when
drag-target, smooth ok/no transitions on submit. Existing `.is-ok` /
`.is-no` classes already exist (PR #38); we just need transitions on
them.

**Sydexa's treatment:** Draggable chip with subtle drop shadow + the
"Bắt đầu" (Start) button hover state. Our implementation mirrors the
shadow via translateY and adds the slot-target state Sydexa does not have
explicitly (because their slots are positionally fixed).

### 19. Copy button toast

**Why it matters:** The copy button (`.av-cbcopy`) already toggles to a
`.done` class with green text. Adding a brief scale pulse makes the
"Copied!" feel acknowledged. Trivial CSS, high perceived polish.

**Sydexa's treatment:** "Sao chép mã" button (Copy code) is muted until
clicked, then flips to green text — exactly what we already do. Adding
motion to the transition is purely additive polish.

### 21. Reduced-motion handling (REQUIRED)

**Why it matters:** All the new transitions must be gated behind
`@media (prefers-reduced-motion: no-preference)`. The codebase already
has this pattern (`.av-qz::before` opacity transitions, `.av-dd-slot.is-ok/.is-no`
transitions). All new animations follow the same convention. Vestibular
disorder accessibility isn't optional.

---

## Concrete CSS primitives to add

All additions go to a new file
`apps/web/components/article/lesson-animations.css`, imported by
`apps/web/components/article/article.css` (or by the existing
`lesson-tokens.css` if we want to keep them together — see PR description
for the call). The file is scoped to `.lesson-surface` so app chrome is
untouched.

### Motion tokens to add to `packages/ui/src/tokens.css`

```css
  --duration-base: 200ms;
  --duration-slow: 400ms;
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

(Existing `--duration-fast: 120ms` and `--duration-graph: 900ms` are
kept; new tokens slot between.)

### Lesson-animations.css

```css
/*
 * Lesson surface animations. All entries gated behind
 * `prefers-reduced-motion: no-preference` so the article reads as
 * static for users who opt out.
 *
 * Scope: `.lesson-surface` only. App chrome is not touched.
 */

/* ---- Reveal keyframes (quiz verdict, callout, etc.) ---- */

@keyframes lesson-rise-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes lesson-rise-in-loud {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- Flashcard 3D flip ---- */

@keyframes lesson-flip-to-back {
  from { transform: rotateY(0deg); }
  to   { transform: rotateY(180deg); }
}

@keyframes lesson-flip-to-front {
  from { transform: rotateY(180deg); }
  to   { transform: rotateY(0deg); }
}

/* ---- Toast pulse (copy button feedback) ---- */

@keyframes lesson-toast-pulse {
  0%   { transform: scale(1);    opacity: 1; }
  40%  { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
}

/* ---- Quiz option color transitions (existing classes) ---- */

.lesson-surface .av-qz-opt {
  transition:
    border-color var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);
}

/* ---- Quiz verdict reveal (mount animation via [data-mounted]) ---- */

.lesson-surface [data-mounted='false'] {
  opacity: 0;
}

.lesson-surface [data-mounted='true'] {
  animation: lesson-rise-in var(--duration-slow) var(--ease-out) both;
}

/* ---- Callout reveal on scroll ---- */

.lesson-surface .av-callout {
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
}

.lesson-surface .av-callout.is-revealed {
  opacity: 1;
  transform: translateY(0);
}

/* ---- Flashcard 3D flip (replaces display:none/block) ---- */

.lesson-surface .av-flashcard-card {
  perspective: 1000px;
  transform-style: preserve-3d;
  position: relative;
  transition: transform var(--duration-slow) cubic-bezier(0.4, 0, 0.2, 1);
}

.lesson-surface .av-flashcard-front,
.lesson-surface .av-flashcard-back {
  backface-visibility: hidden;
  display: block;
}

.lesson-surface .av-flashcard-back {
  position: absolute;
  inset: 1.1rem 1.2rem;
  transform: rotateY(180deg);
}

.lesson-surface .av-flashcard-card.is-flipped {
  transform: rotateY(180deg);
}

/* Override the original [data-state] toggle; rely purely on transform now. */
.lesson-surface .av-flashcard-card:not(.is-flipped) .av-flashcard-front {
  /* front visible */
}

.lesson-surface .av-flashcard-card.is-flipped .av-flashcard-front {
  visibility: hidden;
}

.lesson-surface .av-flashcard-card:not(.is-flipped) .av-flashcard-back {
  visibility: hidden;
}

/* ---- Drag-drop hover, focus, and submit transitions ---- */

.lesson-surface .av-dd-chip {
  transition:
    border-color var(--duration-base) var(--ease-out),
    transform var(--duration-base) var(--ease-out),
    box-shadow var(--duration-base) var(--ease-out);
}

.lesson-surface .av-dd-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px color-mix(in srgb, var(--lesson-purple-accent) 14%, transparent);
}

.lesson-surface .av-dd-slot {
  transition:
    border-color var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);
}

.lesson-surface .av-dd-slot.is-target {
  border-color: var(--lesson-purple-accent);
  background: color-mix(in srgb, var(--lesson-purple-accent) 30%, transparent);
}

.lesson-surface .av-dd-slot.is-ok {
  transition: border-color var(--duration-slow) var(--ease-out);
}

.lesson-surface .av-dd-slot.is-no {
  transition: border-color var(--duration-slow) var(--ease-out);
}

/* ---- Copy button toast ---- */

.lesson-surface .av-cbcopy {
  transition: color var(--duration-base) var(--ease-out);
}

.lesson-surface .av-cbcopy.done {
  animation: lesson-toast-pulse var(--duration-slow) var(--ease-out);
}

/* ---- Reduced-motion overrides ---- */

@media (prefers-reduced-motion: reduce) {
  .lesson-surface .av-callout,
  .lesson-surface .av-callout.is-revealed {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .lesson-surface .av-flashcard-card {
    transform: none !important;
    transition: none;
  }

  .lesson-surface .av-flashcard-card.is-flipped .av-flashcard-front,
  .lesson-surface .av-flashcard-card:not(.is-flipped) .av-flashcard-back {
    visibility: hidden;
  }

  .lesson-surface .av-dd-chip:hover {
    transform: none;
    box-shadow: none;
  }

  .lesson-surface .av-cbcopy.done {
    animation: none;
  }

  .lesson-surface [data-mounted='false'] {
    opacity: 1;
  }

  .lesson-surface [data-mounted='true'] {
    animation: none;
  }
}
```

### Component changes (small, surgical)

1. **`packages/mdx-components/src/callout.tsx`** — wrap the rendered
   `<aside>` in a tiny client component that adds the
   IntersectionObserver. Discloses:
   - Wrapper is `'use client'`, but the inner server-rendered
     `<aside className="av-callout">` keeps SSR.
   - Observer fires once per element (disconnects after first reveal).
   - `rootMargin: '0px 0px -10% 0px'` so the reveal triggers slightly
     before the element fully enters the viewport.

2. **`packages/mdx-components/src/flashcard.tsx`** — change the click
   handler to toggle the `.is-flipped` class only (no inner display
   swap; CSS handles it via `backface-visibility`). Discloses: if
   `prefers-reduced-motion: reduce`, also set `display:none` on the
   non-flipped face so no-JS / reduced-motion users still see one face
   at a time.

3. **`packages/mdx-components/src/quiz.tsx`** — on submit, set
   `data-mounted="true"` on `.av-qz-ex` and `.av-qz-verdict` after the
   reveal data arrives. Discloses: render them with `data-mounted="false"`
   initially; flip after verdict is computed client-side.

4. **`packages/mdx-components/src/dragdrop.tsx`** — add `is-target` to
   the slot when a chip is being dragged over it (dragenter/dragleave
   handlers). Existing `is-ok` / `is-no` classes already work; we just
   add transitions.

### Files added / modified

- **NEW** `apps/web/components/article/lesson-animations.css` (~140 lines)
- **MODIFIED** `packages/ui/src/tokens.css` (+4 lines: new motion tokens)
- **MODIFIED** `apps/web/components/article/article.css` or
  `lesson-tokens.css` (+1 line: `@import './lesson-animations.css';`)
- **MODIFIED** `packages/mdx-components/src/callout.tsx` (small client
  wrapper, ~30 lines)
- **MODIFIED** `packages/mdx-components/src/flashcard.tsx` (click handler
  simplification, ~10 lines changed)
- **MODIFIED** `packages/mdx-components/src/quiz.tsx` (mount attribute
  on verdict, ~15 lines)
- **MODIFIED** `packages/mdx-components/src/dragdrop.tsx` (`is-target`
  state + transition, ~20 lines)
- **NEW** test files (see PR prompt)

---

## Open questions for you before I draft the Cursor prompt

Plain numbered (not buttons):

1. **Single PR vs. multi-PR split?** I propose single PR — all CSS-only
   changes plus 4 small component tweaks; total ~6 files, ~250 lines
   delta. Easy to review as a unit. If you prefer splitting (CSS in
   one, components in another), say so.

2. **Animation file location:** `lesson-animations.css` as a sibling
   to `lesson-tokens.css`, or fold into `lesson-tokens.css` itself? I'd
   suggest separate file — `lesson-tokens.css` is 580 lines and growing;
   animations are a separable concern.

3. **Callout reveal trigger:** IntersectionObserver per element (more
   component code, works perfectly), or a single root-level observer
   that toggles classes on all `.av-callout` elements (less code, but
   requires a global client component). I'd suggest per-element for
   SSR purity.

4. **Phase 2 items in same PR or later?** I'd suggest later — review
   Phase 1 first, see if it lands well, then add the gentler polish.

5. **Should the CSS also handle drag-drop chip's "shake" on incorrect
   placement?** Sydexa doesn't do this, but it's a common UX pattern.
   Adds maybe 10 lines. Your call.

Just say which and I'll write the prompt to match.