# Design spec — lesson-detail page patterns

**Purpose:** Capture the layout, typography, motion, and interaction
patterns observed on six public lesson-detail pages (advanced-SQL,
advanced-React, basic-SQL — two of each difficulty tier), so the patterns
can be applied to `nxhhuy.tech`'s existing lesson routes without naming
or copying any specific site's brand, copy, or visual identity.

**Date:** 2026-08-29
**Source pages analyzed (HTML fetched 2026-08-29, all return HTTP 200):**
- `/courses/<framework>-advanced/lessons/index-and-btree` (~728KB)
- `/courses/<framework>-advanced/lessons/index-in-practice` (~326KB)
- `/courses/<framework>-advanced/lessons/js-fundamentals` (~545KB)
- `/courses/<framework>-advanced/lessons/js-patterns-react` (~1497KB — heaviest page)
- `/courses/<framework>-basic/lessons/data-fundamentals` (~342KB)
- `/courses/<framework>-basic/lessons/select-basics` (~362KB)

**Tool:** direct `curl` with a Safari desktop User-Agent. The pages are
publicly accessible, no auth, no JS execution required for the
*structural* extraction (3-column layout, sidebar TOC structure, theme
toggle, playground collapse). The actual lesson content is loaded via
JS hydration after page load — that content is NOT captured in this
spec (would need Playwright or browser automation).

**Vendor-neutrality:** No brand names, copy, or visual identity captured
below. This spec describes reusable patterns, not brand-specific
implementations.

---

## 1. Top-level layout — 3-column flex

All six lesson pages share the same outer shell:

```html
<div class="flex h-dvh gap-2 p-2 text-lesson-text-primary md:gap-3 md:p-3">
  <aside class="h-full shrink-0 overflow-visible" style="width:330px">
    [LEFT SIDEBAR — TOC + search]
  </aside>
  <main class="custom-scrollbar relative flex-1 overflow-y-auto"
        style="view-transition-name:lesson-content">
    [LESSON CONTENT]
  </main>
  <div class="hidden w-9 shrink-0 md:block" aria-hidden="true"></div>
  <aside class="flex h-full shrink-0 flex-col overflow-hidden rounded-xl
                 border border-lesson-border-primary bg-lesson-bg-primary"
         role="region"
         aria-label="SQL Playground"
         style="width:40px">
    [RIGHT ASIDE — collapsed playground]
  </aside>
</div>
```

**Spacing rhythm:**
- Outer gap: `gap-2 md:gap-3` — tight on mobile, slightly wider on desktop
- Outer padding: `p-2 md:p-3` — minimal (lesson surface dominates viewport)
- Left sidebar: fixed `width:330px` (px, not rem — pixel-locked design)
- Right playground: collapsed `width:40px` (just the toggle rail) when
  closed; expands on toggle
- Spacer between main and right aside: `w-9` (2.25rem) — 9 grid units

**Reusable principle:** *3-pane with collapsible ends, content owns
viewport*. Both sidebar (TOC) and right aside (playground) are
opt-in side surfaces; the lesson content always owns the widest column.

**Comparison to current `nxhhuy.tech`:**
- Current lesson layout uses 2-column (sidebar + content), see
  `apps/web/components/article/article-shell.tsx` — sidebar is collapsible
- No right-side playground
- Outer padding is `px-4 md:px-8`, more generous than this reference's
  tight `p-2 md:p-3`
- **Opportunity:** Add a right-rail playground/code panel as opt-in for
  code-heavy lessons. Could be a third `<aside>` controlled by chrome
  context.

## 2. Left sidebar — TOC + search

**Structure:**
- Header: course title (h2) + collapse button (panel-left-close icon)
- Search input with magnifying glass icon prefix
- Lesson list grouped by chapter (collapsible buttons)
- Each lesson row: full lesson title, lock icon if not unlocked

**Visual:**
```html
<aside style="width:330px">
  <div class="rounded-[16px] border border-[var(--lesson-border-secondary)] h-full">
    <div class="flex items-center justify-between px-6 py-4">
      <a href="/"><img alt="logo" /></a>
      <button class="rounded-lg p-1.5 text-lesson-text-placeholder
                      hover:bg-lesson-bg-disabled hover:text-lesson-text-primary">
        <panel-left-close />
      </button>
    </div>
    <div class="px-6 mt-8">
      <h2 class="line-clamp-2 text-xl font-bold text-lesson-text-secondary">
        [Course Title]
      </h2>
    </div>
    <div class="px-6 mt-4">
      <input type="text"
             placeholder="Search Content"
             class="w-full rounded-lg border border-lesson-border-primary
                    bg-transparent py-2 pl-9 pr-3 text-sm
                    text-lesson-text-primary
                    placeholder:text-lesson-text-placeholder" />
    </div>
    <div data-lenis-prevent="true"
         class="custom-scrollbar relative flex-1 overflow-y-auto px-6 pt-8 pb-6">
      [Chapter groups]
    </div>
  </div>
</aside>
```

**Key observations:**

1. **`data-lenis-prevent="true"` on the scrollable area** — Lenis smooth
   scroll is disabled inside the TOC scroll. This is because the TOC's
   internal scroll should be native (instant), while the page-level
   scroll is smooth (Lenis-controlled). Without this attribute, scrolling
   inside the TOC would also be smooth, which feels sluggish for a
   sidebar list.

2. **`line-clamp-2` on course title** — ensures long course names wrap
   to 2 lines max without overflowing the 330px width.

3. **`text-lesson-text-placeholder` / `text-lesson-text-secondary` /
   `text-lesson-text-primary`** — three-tier text hierarchy using
   dedicated CSS variables (see section 6).

4. **Search input** — `pl-9` (left padding = 36px) for icon space.
   `bg-transparent` so it inherits the panel background. `focus:
   border-lesson-text-placeholder` for subtle focus ring (no bright
   blue — keeps with the muted aesthetic).

5. **Collapse button** — panel-left-close icon at top-right. Sits in a
   rounded hover background (`hover:bg-lesson-bg-disabled`).

**Chapter-grouped list pattern:**

```html
<div>
  <button class="flex w-full items-center justify-between py-2 text-left">
    <span class="text-base font-semibold text-lesson-text-secondary">
      [Chapter Name]
    </span>
    <chevron-up />
  </button>
  <div class="overflow-hidden" style="height:auto;opacity:1">
    <div class="flex flex-col gap-3 pt-2">
      <a class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm
                transition-colors
                [current state: text-lesson-text-primary]
                [other state: text-lesson-text-secondary hover:bg-lesson-bg-disabled/50]"
         href="...">
        <span class="block flex-1 truncate">[Lesson Title]</span>
      </a>
      [More lessons...]
    </div>
  </div>
</div>
```

**State colors:**
- Current lesson: `text-lesson-text-primary` (full-strength text)
- Unlocked, not current: `text-lesson-text-secondary` + hover background
- Locked, not unlocked: `text-lesson-text-disabled` + lock icon

**Reusable principle:** *chapter as accordion header, lesson as
indented row*. One button per chapter with its own expand/collapse
state. Lessons inside are flat text + (optional) lock icon — no
checkboxes or completion marks visible in the TOC, which keeps the list
scannable.

**Comparison to current `nxhhuy.tech`:**
- Current TOC (`apps/web/components/article/sidebars.tsx`) is a flat
  numbered list, no chapter grouping
- Has `done` state via `aria-current="page"` and color
- No search input on the article sidebar (we added a labeled-but-disabled
  search input in PR #74 per D18 defect 1)
- No collapse button — sidebar collapse is via the chrome toggle
- **Opportunity:** Add chapter-grouped TOC for `nxhhuy.tech` courses.
  Currently the corpus sidebar groups by folder; courses could group
  by chapter for a clearer curriculum navigation.

## 3. Main content area

**Container:**
```html
<main class="custom-scrollbar relative flex-1 overflow-y-auto"
      style="view-transition-name:lesson-content">
  <div class="mx-auto max-w-5xl px-4 pb-16 sm:px-6 md:px-8 md:pb-20">
    [Lesson content]
  </div>
</main>
```

**Observations:**

1. **`view-transition-name:lesson-content`** — The View Transitions
   API is enabled on the main element. When navigating between lessons,
   the browser animates the content area in a cross-fade (Chrome
   supports this natively). This is **free** motion — no JS animation
   library involved. Falls back gracefully in browsers without support.

2. **`max-w-5xl`** — content width capped at 1024px. The article is
   centered with `mx-auto`. This is wider than typical reading
   columns (~640-720px), suggesting the lessons are intended to embed
   code blocks side-by-side with prose.

3. **Padding rhythm:** `px-4 sm:px-6 md:px-8` — progressive horizontal
   padding. `pb-16 sm:pb-20` — generous bottom padding for the last
   section + footer chrome.

4. **`custom-scrollbar`** — likely a custom scrollbar style class
   (thinner, rounded) replacing the default browser scrollbar inside
   the main content. Same class is used on the sidebar TOC.

**Skeleton loading (visible on initial HTML before hydration):**

```html
<div class="space-y-4">
  <div class="h-4 w-32 max-w-full animate-pulse rounded bg-lesson-bg-secondary sm:w-40"></div>
  <div class="space-y-3">
    <div class="h-7 w-11/12 max-w-full animate-pulse rounded bg-lesson-bg-secondary md:h-9 md:w-3/4"></div>
    <div class="h-5 w-2/3 max-w-full animate-pulse rounded bg-lesson-bg-secondary md:w-1/2"></div>
  </div>
</div>
<div class="space-y-6 md:space-y-8">
  <div class="space-y-4">
    <div class="h-7 w-2/3 animate-pulse rounded bg-lesson-bg-secondary"></div>
    [paragraph skeletons...]
  </div>
  <div class="overflow-hidden rounded-lg border border-lesson-border-primary">
    [TABLE skeletons — header row + 3 data rows with 3 columns each]
  </div>
  [more sections...]
  <div class="overflow-hidden rounded-lg border border-lesson-border-primary">
    [CODE BLOCK skeleton with header + 5 lines]
  </div>
</div>
```

**Skeleton layout signature:**
- Lesson title: `h-7 md:h-9` with `w-3/4` (75% width to suggest title truncation)
- Subtitle: `h-5` with `w-1/2` (50% width)
- Paragraph text: `h-4` with varying widths (w-full, w-5/6, w-4/6)
- Tables: row × column grid with `h-4` cells
- Code blocks: header row (`h-3.5` icon + `h-3` label) + 5 body lines

**Reusable principle:** *skeleton mirrors layout*. Every section the
real lesson will have gets a proportionally-sized placeholder. This
visually primes the user for what's loading without making them wait
blindly.

**Comparison to current `nxhhuy.tech`:**
- Current article shell uses simpler skeletons (just heading + paragraphs)
- No specific table or code-block skeletons
- Content is statically rendered (no hydration delay), so skeletons
  aren't needed for cached pages — but they would help on slow loads

## 4. Theme toggle

**Structure:**
```html
<button class="relative flex cursor-pointer items-center gap-2
                rounded-full border p-2 backdrop-blur-[4px]
                transition-all duration-300
                border-[#21253a]
                bg-gradient-to-b from-[rgba(63,58,83,0.4)] to-[rgba(19,17,25,0.4)]">
  <div class="absolute top-2 left-2 size-8 rounded-full bg-[#a100ff]
              transition-transform duration-300 ease-in-out"
       style="transform:translateX(40px)"></div>
  <div class="relative flex size-8 items-center justify-center rounded-full">
    <sun-icon class="transition-colors duration-300 text-[#959bb3]" />
  </div>
  <div class="relative flex size-8 items-center justify-center rounded-full">
    <moon-icon class="transition-colors duration-300 text-white" />
  </div>
  <span class="sr-only">Toggle theme</span>
</button>
```

**Visual:**
- Pill-shaped toggle, ~80px wide, dark gradient background
- Purple thumb (`#a100ff`) slides between sun/moon positions via `transform:translateX`
- Sun icon is muted gray (`#959bb3`), moon is full white — visual cue for current state
- `duration-300 ease-in-out` on both the thumb slide and icon color transition

**Initial theme detection:**
```javascript
// Inline script in <head>
try {
  var t = localStorage.getItem('lesson-theme');
  if (t === 'light') return;
  document.documentElement.classList.add('dark');
} catch (e) {
  document.documentElement.classList.add('dark');
}
```

**Behavior:**
- Defaults to **dark** if no localStorage value or if reading fails
- Only `'light'` value flips to light mode
- `'dark'` value (or anything else) keeps dark
- This means users who *want* dark must do nothing; users who want
  light must explicitly set it. The "do nothing = dark" default biases
  the experience toward the more dramatic dark mode.

**Reusable principle:** *the thumb animates, not the icons*. The
slide is on the purple thumb element; the icons themselves only change
*color* (muted vs full), they don't move. This is a tiny detail that
makes the toggle feel "expensive" — like a real switch.

**Comparison to current `nxhhuy.tech`:**
- `nxhhuy.tech` has a theme toggle but it uses an icon-only pattern
  (sun/moon swap, no sliding thumb)
- Currently dark-mode-only on most pages
- **Opportunity:** Upgrade the existing toggle to this pill-style with
  sliding thumb for ~50 lines of code in the chrome layer

## 5. Right aside — playground toggle

**Collapsed state:**
```html
<aside class="flex h-full shrink-0 flex-col overflow-hidden rounded-xl
               border border-lesson-border-primary bg-lesson-bg-primary"
       role="region"
       aria-label="SQL Playground"
       style="width:40px">
  <button type="button"
          aria-label="Open SQL Playground"
          aria-expanded="false"
          class="group flex h-full w-full shrink-0 cursor-pointer flex-col
                 items-center gap-2 py-2 text-lesson-text-placeholder
                 transition-colors hover:bg-lesson-bg-disabled
                 hover:text-lesson-text-primary
                 focus-visible:outline-none focus-visible:ring-2
                 focus-visible:ring-[var(--lesson-purple-accent)]
                 focus-visible:ring-inset">
    <chevron-left-icon class="transition-transform group-hover:-translate-x-0.5" />
    <database-icon class="text-[var(--lesson-purple-accent)]" />
    <span class="mt-1 select-none text-xs font-semibold uppercase tracking-[0.2em]"
          style="writing-mode:vertical-rl">
      SQL Playground
    </span>
  </button>
</aside>
```

**Visual when collapsed (40px wide):**
- Vertical text reading "SQL Playground" via `writing-mode:vertical-rl`
- Database icon at the top in purple (`--lesson-purple-accent`)
- Chevron icon that slides left on hover (`group-hover:-translate-x-0.5`)
- Hover background: `hover:bg-lesson-bg-disabled`
- Focus ring: purple, inset (focused-within outline)

**Expanded state** (not in the HTML, inferred):
- Width expands to fill viewport
- Real playground UI replaces the collapsed tab

**Reusable principle:** *collapsed rail IS the toggle*. The collapsed
state is a real button, not just a strip. Hover and focus interactions
make it discoverable; the `aria-expanded` + `aria-label` make it
accessible.

**Comparison to current `nxhhuy.tech`:**
- No right-rail playground
- Could add for code-heavy lessons (a Monaco or CodeMirror embed)
- The "collapsed rail = toggle" pattern is cleaner than a separate
  toggle button + drawer

## 6. CSS variable system (lesson theme)

~25 lesson-prefixed CSS variables observed:

```
Backgrounds:
--lesson-bg-primary       // main lesson surface
--lesson-bg-secondary     // cards, skeleton placeholders
--lesson-bg-disabled      // hover backgrounds, button backgrounds

Borders:
--lesson-border-primary   // default border color
--lesson-border-secondary // subtle dividers

Text:
--lesson-text-primary     // full-strength text
--lesson-text-secondary   // muted text (h2 headers, lesson row labels)
--lesson-text-placeholder // placeholder text, icons, dividers
--lesson-text-disabled    // locked lesson rows

Accents:
--lesson-purple-accent    // interactive accent (focus rings, database icon)
--lesson-purple-bg        // accent backgrounds
--lesson-purple-border    // accent borders
--lesson-purple-gradient-from / --lesson-purple-gradient-to // gradients

Callouts:
--lesson-callout-info-bg / -border / -shadow
--lesson-callout-ok-bg / -border / -shadow
--lesson-callout-gradient

Icons:
--lesson-icon-info / --lesson-icon-info-bg
--lesson-icon-success / --lesson-icon-error

Effects:
--lesson-grain-overlay-opacity // subtle noise overlay
```

**Pattern: three-tier text + three-tier background + three-tier border.**

```
primary: full-strength (foreground)
secondary: muted (background headers)
disabled/placeholder: barely visible (decorative)
```

This three-tier hierarchy lets every component express "what state am
I in?" without inventing new colors per component. Background, text,
and border all use the same 3-tier system.

**Reusable principle:** *scale your variables by semantic role, not by
hex value*. `bg-primary`, `bg-secondary`, `bg-disabled` is far easier
to reason about than `bg-slate-100`, `bg-slate-200`, `bg-slate-700`.

**Comparison to current `nxhhuy.tech`:**
- Current uses a smaller token set (mostly `--signal`, `--accent`,
  `--bg`, `--fg`)
- Adding the three-tier pattern would simplify the article chrome
- The lesson-purple-accent is essentially the existing `--accent`
  token, just renamed to be lesson-specific

## 7. Header bar (top of main content)

```html
<div class="sticky top-0 z-40 flex items-center justify-between px-4 pt-3
            md:justify-end">
  <button class="md:hidden">[Mobile menu hamburger]</button>
  <button class="relative flex cursor-pointer items-center gap-2
                  rounded-full border p-2 backdrop-blur-[4px] transition-all
                  duration-300
                  border-[#21253a]
                  bg-gradient-to-b from-[rgba(63,58,83,0.4)] to-[rgba(19,17,25,0.4)]">
    [Theme toggle — see section 4]
  </button>
</div>
```

**Behavior:**
- **Sticky** to top of main content area (z-40, so above other content)
- **Mobile**: hamburger menu on left, theme toggle on right
- **Desktop**: theme toggle only, right-aligned (`md:justify-end`)
- The mobile menu opens the same sidebar TOC as desktop collapse

**Backdrop blur on the toggle:**
- `backdrop-blur-[4px]` — very subtle blur (the design system uses
  12.5px elsewhere; this is intentionally milder for the sticky
  header so the blur doesn't compete with content)
- The blur only matters when content scrolls underneath

**Reusable principle:** *sticky chrome is just enough*. A mobile menu
button + theme toggle is all that's needed in the sticky bar. No search,
no breadcrumb, no user menu — those live elsewhere.

## 8. View Transitions API integration

All six pages declare:
```html
<main style="view-transition-name:lesson-content">
```

This enables the browser's built-in cross-fade animation when
navigating from one lesson to another. **No JS animation library
required** — Chrome handles it natively.

**Important detail:** this is a CSS-only feature using the View
Transitions API. It's part of the `css-view-transitions-1` spec, not
the older `document.startViewTransition` JS API.

**Browser support caveat:** Safari does not yet support View
Transitions. The CSS `view-transition-name` declaration is silently
ignored in Safari; navigation becomes a normal page swap. No
fallback needed — the spec is designed for progressive enhancement.

**Reusable principle:** *use browser primitives where they exist*. View
Transitions are free, instant, and don't require a JS animation
library. If the lesson navigation UX is good, it's probably worth
adding to `nxhhuy.tech` — Chrome users get the animation, Safari users
get a normal navigation.

## 9. Skeleton hierarchy observed

The skeleton placeholder pattern is detailed enough to extract as a
template:

```css
/* Heading primary (h1 / h2) */
.h-7.md:h-9 w-3/4 rounded bg-lesson-bg-secondary animate-pulse

/* Heading secondary */
.h-5 w-1/2 rounded bg-lesson-bg-secondary animate-pulse

/* Body text (varied widths) */
.h-4 [w-full|w-5/6|w-4/6] rounded bg-lesson-bg-secondary animate-pulse

/* Code block header */
.h-3.5.w-3.5 rounded bg-lesson-bg-secondary animate-pulse  /* icon */
.h-3.w-20 rounded bg-lesson-bg-secondary animate-pulse      /* label */

/* Code block body lines */
.h-4 [w-4/5|w-3/5|w-2/3|...] rounded bg-lesson-bg-secondary animate-pulse

/* Table cells */
.h-4 [w-16|w-24|w-20] rounded bg-lesson-bg-secondary animate-pulse

/* Section gap */
.space-y-4 md:space-y-8
```

**Reusable principle:** *rounded skeletons, not squares*. Every
placeholder uses `rounded` (small border-radius) to match the design
language's preference for soft edges. Square skeletons would feel
visually inconsistent.

## 10. Inter and JetBrains Mono fonts

```html
<body class="be_vietnam_pro_4265f852-module__50ncua__variable antialiased">
  <div class="jetbrains_mono_91b6ae0a-module__bgtlpG__variable
              lesson-theme h-screen overflow-hidden bg-lesson-bg-primary">
```

**Observations:**
- Body class uses **Be Vietnam Pro** — a Vietnamese-designed sans-serif
  font (appropriate for Vietnamese content). `antialiased` for smoother
  text rendering.
- The lesson theme uses **JetBrains Mono** — likely for code blocks
  and tabular data.
- Two font systems layered: Be Vietnam Pro for prose, JetBrains Mono for
  monospace.

**Reusable principle:** *font pairings carry design intent*. A
Vietnamese-tuned sans-serif for body + a developer-tuned mono for code
is a clear, intentioned pair. Generic "Inter" or "system-ui" would lose
that signal.

**Comparison to current `nxhhuy.tech`:**
- Current uses a sans + serif split (probably `Inter` + a system serif)
- No monospace font specifically for code (uses browser default)
- **Opportunity:** Add JetBrains Mono (or similar) for code blocks
  when D20 (Shiki) lands

## 11. Background gradients and decorative effects

Several inline gradient effects observed:

```css
/* Conic mask gradient (sidebar border highlight) */
mask-image: conic-gradient(from 45.000deg at center, black 25%, transparent 40%, transparent 60%, black 75%);

/* Multi-radial layered gradient */
background: radial-gradient(at 80% 55%, #a855f7 0px, transparent 50%),
            radial-gradient(at 69% 34%, #06b6d4 0px, transparent 50%),
            radial-gradient(at 8% 6%, #ec4899 0px, transparent 50%),
            [...4 more gradients];

/* Box-shadow glow (the sidebar accent border) */
box-shadow: inset 0px 0px 0px 1px hsl(270deg 70% 60% / 60%),
            inset 0px 0px 50px 2px hsl(270deg 70% 60% / 6%),
            0px 0px 50px 2px hsl(270deg 70% 60% / 6%);
```

**Observations:**

1. **Conic gradient mask** — used to create a "shimmer" border around
   the sidebar that fades in on hover (via the `transition: opacity
   0.75s ease-in-out`)
2. **Multi-radial gradient layers** — 7+ radial gradients composited to
   create a complex purple/cyan/pink glow. Each gradient is 50% radius
   from a different position. This is the source of the "aurora" effect
   around the sidebar
3. **HSL box-shadow** — multiple inset + outset shadows in HSL space
   (`hsl(270deg 70% 60%)` = purple) create the glow effect. Layered at
   different blur radii for depth

**These are expensive to render** — 7 radial gradients + conic mask +
multiple box-shadows would tank performance on low-end devices. The
opacity transition (`0.75s`) is likely a hint that this is *opt-in*
visual flair that gets enabled only on capable devices.

**Reusable principle:** *layered radial gradients are the new
drop-shadow*. The aurora/glow effect replaces the older "card with
drop-shadow" pattern. Cheaper in some respects (no extra DOM), more
expensive in others (compositing).

**Comparison to current `nxhhuy.tech`:**
- Currently uses solid colors + simple drop-shadows
- No aurora/glow effects
- **Opportunity:** Add a subtle purple/cyan glow on the article hero
  or course hero. Would need to be opt-in or behind a feature flag
  given the rendering cost.

## 12. Lock state pattern

Locked lessons in the sidebar show:

```html
<a class="text-lesson-text-disabled hover:bg-lesson-bg-disabled/50
          hover:text-lesson-text-secondary"
   href="...">
  <span class="block flex-1 truncate">[Lesson Title]</span>
  <lock-icon class="h-3.5 w-3.5 shrink-0 text-lesson-text-placeholder" />
</a>
```

**Visual:**
- Lock icon is `shrink-0` (never compresses, even with long titles)
- Title is `truncate` (ellipsis on overflow)
- Default color: `text-lesson-text-disabled` (barely visible)
- Hover: `text-lesson-text-secondary` (slight emphasis) + background

**Accessibility implication:** The lock icon is `aria-hidden="true"` (it's
present in the rendered HTML — note the `<svg ... aria-hidden="true">`
attribute pattern). So the lesson title is the only text announced;
screen readers don't announce "locked". For better UX, the `<a>` could
have `aria-disabled="true"` or a visually-hidden "(locked)" suffix.

**Reusable principle:** *lock = "you'll get here eventually"*. The
disabled state is gentle (low contrast, soft hover) rather than
aggressive (greyed out + no hover + strike-through). Users feel like
the next lesson is gated, not blocked.

**Comparison to current `nxhhuy.tech`:**
- Currently no lock state on lesson rows
- All 18 React lessons are visible in the curriculum sidebar
- **Opportunity:** When courses have paid chapters (none currently),
  this lock pattern can be added. Not urgent.

## 13. Comparison to current `nxhhuy.tech` lesson routes

| Dimension | This reference | Current `nxhhuy.tech` | Gap |
|---|---|---|---|
| Layout | 3-column (TOC + content + playground) | 2-column (TOC + content) | Add right-rail playground |
| Sidebar TOC | Chapter-grouped, search input, lock icons | Flat numbered list | Add chapter grouping + search |
| Theme | Pill toggle with sliding thumb | Icon swap | Upgrade to pill toggle |
| Animations | View Transitions API + Lenis smooth scroll + skeleton placeholders | Minimal — no scroll smoothing, no view transitions | Add Lenis + view-transitions |
| Tokens | 25+ lesson-prefixed CSS variables | Smaller set | Extend token system |
| Backgrounds | Aurora/glow effects via radial gradients | Solid colors | Add subtle glow on hero |
| Fonts | Be Vietnam Pro + JetBrains Mono | Sans + serif split | Add mono for code blocks |

## 14. Prioritized action items for `nxhhuy.tech`

| Priority | Pattern from this analysis | Effort | Risk |
|---|---|---|---|
| **High** | View Transitions API on lesson content (`view-transition-name`) | ~30min | None (progressive enhancement) |
| **High** | Skeleton placeholders for lesson chrome | ~2h | Low |
| **High** | Pill theme toggle with sliding thumb | ~2h | Low |
| **Med** | Chapter-grouped course TOC | ~3h | Medium (data model change) |
| **Med** | Right-rail playground aside (Monaco/CodeMirror) | ~6h | High (Cache Components compatibility) |
| **Med** | Aurora/glow effect on course hero | ~2h | Medium (performance) |
| **Low** | 25+ lesson-prefixed CSS variables refactor | ~3h | Low |
| **Low** | JetBrains Mono (or similar) for code blocks | ~1h | Low |

**Recommended next session scope** (if continuing this work):
- View Transitions API + Skeleton placeholders (~2.5h combined,
  biggest visible win for low risk)
- Pill theme toggle upgrade (~2h, visible everywhere, low risk)

## Honest disclosure

- All structural extraction was HTML-only (no JS execution). The actual
  lesson content (markdown rendered, code blocks, interactive elements)
  was not captured. Would need Playwright/headless browser for that.
- Animation patterns documented here are inferred from HTML attributes
  (`view-transition-name`, `data-lenis-prevent`, custom CSS classes).
  The JS-driven motion (what happens after hydration) is not captured
  and would need JS bundle analysis like the course-detail spec did.
- Some patterns (especially the aurora gradients) are very render-
  intensive. Implementations should profile before shipping.
- The "comparison to current nxhhuy.tech" rows are my best estimate
  from memory; verify against actual files before implementing.