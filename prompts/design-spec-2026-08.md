# Design spec — course-detail page patterns

**Purpose:** Capture the layout, animation, and interaction patterns observed
on three Vietnamese-language education platform course-detail pages, so the
patterns can be applied to `nxhhuy.tech`'s existing course pages without
naming or copying any specific site's brand, copy, or visual identity.

**Date:** 2026-08-28
**Source pages analyzed (HTML fetched 2026-08-28, all return HTTP 200, all
~120-525KB):**
- `/courses/<framework>-advanced` (~525KB — largest page, most detailed)
- `/courses/<framework>-intermediate` (~121KB)
- `/courses/<framework>-basic` (~125KB)

**Tool:** direct `curl` with a Safari desktop User-Agent. The pages are
publicly accessible. No auth, no JavaScript execution required to extract
structural information — Tailwind utility classes carry the visual
information in the markup.

**Update 2026-08-29:** Section 8 (animation) extended with JS-bundle
analysis. 41 assets fetched (38 JS chunks + 3 CSS files), animation
library signatures detected, easing/duration aggregates compiled.

**Vendor-neutrality:** No brand names, copy, or visual identity captured
below. This spec describes reusable patterns, not brand-specific
implementations.

---

## 1. Page-level structure (all three pages)

Every course-detail page follows the same skeleton:

```
<main class="flex-1 pt-[104px] md:pt-[120px] lg:pt-[140px]">
  <section class="relative flex flex-col overflow-hidden px-6 pb-16 pt-24 md:px-8 md:pb-20 md:pt-32 lg:min-h-screen lg:px-[80px] lg:pb-[80px] lg:pt-[160px]">
    [HERO]
  </section>
  <section class="relative flex items-center justify-center overflow-hidden px-6 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40 lg:px-[80px] lg:pb-[120px] lg:pt-[200px]">
    [PAIN POINTS / PROMISE]
  </section>
  [CURRICULUM]
  [INSTRUCTOR]
  [TESTIMONIALS / SOCIAL PROOF]
  [PRICING / ENROLLMENT]
  [FAQ]
  [FOOTER CTA]
</main>
```

**Spacing pattern observed:**
- `px-6 md:px-8 lg:px-[80px]` — progressive horizontal padding (24 → 32 → 80)
- `pt-24 md:pt-32 lg:pt-[160px]` — progressive top padding for hero (96 → 128 → 160)
- `pb-16 md:pb-20 md:pb-24 lg:pb-[80px] lg:pb-[120px]` — bottom padding per section

**Reusable principle:** *tight on mobile, dramatic on desktop*. The
responsive scale on padding is roughly 1:1.3:2 from mobile → tablet →
desktop. Worth considering for the existing `nxhhuy.tech` course hero
which currently uses a single breakpoint.

## 2. Hero section

**Typography:**
- H1: large (likely 56-72px), bold, leading-tight
- Body intro: ~18-20px, leading-relaxed, muted color
- All text uses a single text color `#e4e7f2` (light slate, ~90% white)

**Visual signature:**
- Decorative gradient bloom behind hero content:
  `class="absolute inset-x-[31%] inset-y-[14%] rounded-[138px] bg-[var(--marketing-accent-bloom)] blur-[140px]"`
- This creates a soft glowing accent that doesn't compete with text
- The accent uses CSS custom properties: `--marketing-accent`,
  `--marketing-accent-deep`, `--marketing-accent-bloom`

**Reusable principle:** *brand-colored glow behind content, not in front*.
The bloom is `absolute` positioned, heavily blurred (140px), and offset
from center (31% horizontal, 14% vertical) so it reads as ambient light,
not as a focused element.

**Comparison to current `nxhhuy.tech` course hero:**
- Current uses a single hero gradient (`apps/web/components/courses/course-hero.tsx`)
- No bloom accent — relies on the existing design-system palette
- **Opportunity:** Add a subtle bloom accent that activates on course pages
  specifically, using existing `--accent` tokens

## 3. Pain-points + promise layout

**Section header:**
- `<h2 class="text-center text-3xl md:text-4xl lg:text-[48px] lg:leading-[60px] font-semibold">`
- Centered, scaled responsively from 30px → 36px → 48px
- Semibold weight (600), tight leading

**Two-column comparison layout** (the standout pattern):
```
<h3>Tình huống đau</h3>  // "Pain points"
<h3>Lời hứa</h3>        // "Promise"
```
- Both H3s use identical typography (semibold, 24-32px, slate-100)
- The content blocks below them are positioned side-by-side on desktop
- On mobile they stack vertically
- Each block uses a different visual treatment (typically pain = muted/dark
  background, promise = bright/gradient background)

**Reusable principle:** *contrast without shouting*. Same H3 typography for
both, but visual treatment differs subtly. Lets the reader's eye find the
"after" state without the page feeling adversarial.

## 4. Curriculum / lesson list

**Two design patterns observed across the three pages:**

### Pattern A: Card-based chapters
- Each chapter = a card with rounded corners + border + backdrop blur
- Visual signature:
  `class="flex items-center justify-between overflow-clip rounded-2xl border border-[rgba(255,255,255,0.2)] p-4 backdrop-blur-[12.5px]"`
- 12.5px backdrop-blur is unusual (not 8 or 16) — gives a softer frosted
  glass than the standard "tinted glass" feel

### Pattern B: Numbered vertical list
- Number prefix (`01`, `02`, ...) in monospace
- Title + brief description
- Per-item hover/active state with accent color
- Used for individual lessons within a chapter

**Comparison to current `nxhhuy.tech`:**
- Current uses Pattern B (numbered `01`/`02` in `av-n` spans, see
  `apps/web/components/article/sidebars.tsx:151`)
- No Pattern A (card-based chapters)
- **Opportunity:** Add a chapter-grouped view to the courses landing page
  where each chapter is a glassmorphic card containing the numbered
  lesson list inside it

## 5. Tags / metadata pills

```html
<div class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border p-4 md:gap-6">
  <pill>10 chương</pill>   <!-- "10 chapters" -->
  <pill>45 bài học</pill>  <!-- "45 lessons" -->
  <pill>~12 giờ</pill>     <!-- "~12 hours" -->
</div>
```

**Visual signature:**
- `rounded-lg` border with subtle accent color
- `flex-wrap` so pills reflow on narrow viewports
- `gap-x-4 gap-y-3` — horizontal gap grows on desktop, vertical stays tight

**Reusable principle:** *metadata as a row, not a column*. Horizontal
metadata pills communicate "facts about this thing" much faster than
vertical lists do.

**Comparison to current `nxhhuy.tech`:**
- Course hero shows: title, lesson count, total duration (in
  `apps/web/components/courses/course-hero.tsx`)
- Already horizontal, but not pill-styled
- **Opportunity:** Convert existing metadata row to pill-styled tags
  matching the existing design tokens

## 6. Pricing / enrollment

All three pages show:
- Price in VND (e.g. "399k", "299k")
- A primary CTA button (enrollment)
- A secondary CTA (preview / first chapter free)
- Sometimes a payment-method row (logos of supported providers)

**CTA styling pattern:**
- Primary: gradient `from-[var(--marketing-accent)] to-[var(--marketing-accent-deep)]`
- `rounded-full` for the button shape
- `font-semibold` text
- Inline icon (usually a chevron `>` or arrow)

**Reusable principle:** *gradient on primary CTA only*. Secondary CTAs
are flat with border. Visual hierarchy is clear without resorting to size
differences.

## 7. Background blur / decorative elements

Multiple decorative backgrounds observed:

```html
<!-- Bloom accent (hero) -->
<div class="absolute inset-x-[31%] inset-y-[14%] rounded-[138px]
            bg-[var(--marketing-accent-bloom)] blur-[140px]"></div>

<!-- Vertical accent bar (timeline markers) -->
<div class="absolute top-0 w-[5px] rounded-full
            bg-gradient-to-b from-[var(--marketing-accent)]
            to-[var(--marketing-accent-deep)]"></div>

<!-- Animated badge -->
<div class="flex h-[14px] w-[9.333px] items-center justify-center
            rounded-[4.667px] border-[0.583px] border-[#323751]"></div>
```

**Two reusable patterns:**

1. **Bloom accent** — large blurred colored circle offset from center.
   Cheap to render (one absolute-positioned div), high visual impact.
   Use for hero sections and section dividers.

2. **Vertical gradient bar** — `bg-gradient-to-b` with two accent stops.
   5px wide. Used as a timeline marker or section divider.

**Comparison to current `nxhhuy.tech`:**
- No bloom accents currently. The design relies on solid colors.
- **Opportunity:** A subtle bloom accent on the course landing page hero
  could add visual interest while preserving the existing color discipline.

## 8. Animation system (motion picture)

The motion is implemented with a **three-layer stack**:

### Layer 1 — Pure CSS keyframes (`tailwindcss-animate`)

16 `@keyframes` blocks defined in the compiled design-system CSS:

| Keyframe | Purpose | Timing (observed) |
|---|---|---|
| `@enter` / `@exit` | Radix-style enter/exit, variable-driven (`--tw-enter-opacity`, `--tw-enter-translate-x/y`, `--tw-enter-scale`) | `.15s` default, configurable |
| `@hero-demo-fade-in` | Hero element entrance | `.4s` ease-out |
| `@demo-flip-in` / `@demo-flip-out` | 3D `rotateY(±90deg)` flip for hero demo cards | `.3s` ease-in/out |
| `@float-gentle` | Vertical bobbing on background decorations | (long-form, not yet measured) |
| `@shimmer-spin` | Loading shimmer with rotation | continuous |
| `@pulse-dot` | Online/now-reading indicator | continuous |
| `@star-movement-top` / `@star-movement-bottom` | Parallax background stars (foreground/background layers) | `6s` linear infinite alternate |
| `@fade-in` / `@fade-out` | Generic opacity transitions | `.2s` |
| `@marquee` | Horizontal scroll for logo strips | variable via `--duration` |
| `@pulse`, `@spin`, `@bounce` | Tailwind built-ins | standard |

### Layer 2 — Framer Motion (component-level React animations)

Detected via JS bundle inspection. 3 chunks reference `framer-motion`:

- `motion.div`, `AnimatePresence` — primary primitives
- Hooks in active use: `useAnimate`, `useMotionValue`, `useTransform`, `usePresence`
- Duration range observed: `.04s` to `1.5s` (micro-interactions → hero animations)

### Layer 3 — GSAP + ScrollTrigger (scroll-driven timelines)

Detected via JS bundle inspection. 5 chunks reference `gsap`:

- APIs in active use: `gsap.fromTo`, `gsap.set`, `gsap.timeline`, `gsap.to`
- `ScrollTrigger` registered in 1 chunk — used for scroll-tied reveals
- Easing signature: `back.out(1.4)` through `back.out(2.4)` family dominates
  (overshoot for snappy UI), plus `power1.out`, `power2.out`, `power3.out`,
  `sine.inOut`, `expo` for smoother state transitions

### Layer 4 — Lenis smooth scroll (page-level motion)

3 chunks reference Lenis. Configuration observed:
- `lerp: 0.1` (interpolation factor — 0.1 = smooth catch-up)
- `wheelMultiplier: 1`
- `smoothWheel: true`

### Easing system signature (aggregated from all chunks)

26 distinct easing strings observed. The dominance pattern:

```
back.out(1.4) ... back.out(2.4)    ← overshoot, snappy UI (~9 variants)
power1.in / .inOut / .out           ← Tailwind/GSAP defaults (~6 variants)
power2.in / .inOut / .out
power3.inOut / .out
sine.inOut                          ← smooth state transitions
expo                                ← dramatic entrance
bounce.out                          ← celebration / unlock moments
```

**Reusable principle:** *overshoot for tactile interactions, smooth-step
for content reveals, bounce for celebration moments*. The
`back.out(1.4-2.4)` family specifically means "snappy then settle" — the
cursor overshoots its target by 1.4-2.4% before settling back.

### Duration budget signature

70 distinct durations observed. Distribution:
- **Micro (40-100ms)**: hovers, taps, small state flips — instant feedback
- **Standard (150-300ms)**: most UI transitions — feels responsive
- **Hero (400-800ms)**: large content entrances — dramatic
- **Long-form (1-6s)**: scroll-tied reveals — paced
- **Marquee (continuous)**: ambient scrolling

**Reusable principle:** *nothing under 40ms, nothing over 800ms for
direct interaction*. Anything longer must be triggered by scroll or
explicit user action. Perceived as "responsive" without being "jittery".

### Comparison to current `nxhhuy.tech`

- Currently: no animation library, only CSS `transition:` on hover
- No scroll-driven animations
- No overshoot easing — straight `ease` or `ease-in-out`
- Animations on the article chrome are minimal (sidebar collapse, mobile
  drawer transform)

**Biggest opportunity:** add a Lenis-style smooth scroll on the article
reading view. The current scroll is native browser behavior, which feels
abrupt on long articles. Smooth scroll with `lerp: 0.1` would make the
reading experience feel premium for ~5KB of JS.

**Second-biggest:** add `back.out(1.5)` overshoot easing to the
existing mobile drawer transform. Currently straight `ease`, no
overshoot. Adding overshoot would make the drawer feel "snappy".

### What this means for the prioritized action items

The "High" priority items from the section above (bloom accent, pill
metadata) are pure CSS — no animation library needed. Adding Framer
Motion / GSAP / Lenis is a separate architectural decision (currently
neither is in `nxhhuy.tech`'s `apps/web/package.json`):

- **Framer Motion**: ~60KB gzipped, requires `'use client'` boundary on
  every animated component (Cache Components may have opinions about
  this — verify before adopting)
- **GSAP**: free for non-commercial, paid for commercial. Larger bundle.
  Used here likely under a license that fits the site's business model
- **Lenis**: ~5KB gzipped, no React-specific issues. Recommended for
  smooth scroll only.

**Recommendation for next session:** Lenis for smooth scroll (~5KB
addition, no architectural risk). Defer Framer Motion / GSAP until
there's a specific feature that needs them.

## 9. Color tokens (inferred)

```
--marketing-accent         (primary accent — saturated)
--marketing-accent-deep    (gradient end — darker variant)
--marketing-accent-bloom   (blurred backdrop — desaturated, lower alpha)
--marketing-accent-line    (used for muted accent text/borders)
--marketing-purple-deep    (secondary accent — purple)
--marketing-tag-border     (subtle border for pill containers)

Background base:  near-black (~#0e1117 or similar)
Text primary:     #e4e7f2 (light slate)
Text muted:       #959bb3 (mid slate)
Border subtle:    rgba(255,255,255,0.2)
```

The pattern: a single dominant accent + a single secondary accent, with
the bloom version used for ambient glow and the deep version used for
gradient stops.

**Comparison to current `nxhhuy.tech`:**
- Currently uses `--signal` (signal/verified) and `--accent` (interactive)
- The pattern of "accent + accent-deep + accent-bloom" is essentially
  what `nxhhuy.tech` already has, just exposed as separate tokens instead
  of computed from a single base
- **Opportunity:** Refactor existing accent tokens to match this
  three-tier pattern if it's not already — would make the bloom accent
  pattern from Pattern 1 above trivially implementable

## 10. Typography

```css
H1 (hero):      text-[64px] leading-[72px] font-bold
H2 (section):   text-3xl md:text-4xl lg:text-[48px] leading-[60px] font-semibold
H3 (subsection): text-xl md:text-2xl font-bold leading-8
Body large:      text-lg leading-relaxed
Body:            text-base leading-relaxed
Mono / pill:     text-xs font-bold text-center
```

A single font family is used (no separate mono font visible in HTML
classes; the prefix `01`/`02` is rendered with normal weight but tight
letter-spacing via `font-mono` inferred from the consistent treatment).

**Comparison to current `nxhhuy.tech`:**
- Currently uses a serif/sans-serif split via `--font-serif` and
  `--font-sans` tokens (see `apps/web/styles/globals.css` or similar)
- The page-level hierarchy matches: hero large + section headers + body
- **No change needed** — `nxhhuy.tech`'s existing typography hierarchy
  is already well-considered

---

## What to extract next (when ready)

The HTML-only analysis gives layout, structure, and color tokens. Section 8
above extends this with JS-bundle analysis: 41 assets were fetched (38 JS
chunks + 3 CSS files), animation library signatures detected, easing
and duration aggregates compiled across all chunks.

**Reproduction recipe** (for extending this spec to other sites or page
types):

```bash
# 1. Fetch the page HTML
curl -s -A "Safari/17" "<page-url>" -o page.html

# 2. Enumerate static assets (Next.js pattern shown; adapt for Vite/etc.)
grep -oE '/_next/static/[^"]+\.(js|css)' page.html | sort -u

# 3. Download each asset in parallel (adjust concurrency)
xargs -I{} -P 8 curl -sf -A "Safari/17" "<base-url>{}" -o "assets/$(basename {})"

# 4. Detect animation libraries
grep -l "framer-motion\|motion\." assets/*.js   # Framer Motion
grep -l "gsap\|ScrollTrigger" assets/*.js        # GSAP
grep -l "lenis" assets/*.js                      # Lenis smooth scroll
grep -l "motion-one\|@motionone" assets/*.js    # Motion One

# 5. Extract @keyframes from CSS
python3 -c "import re,sys; css=open(sys.argv[1]).read();
print('\n'.join(re.findall(r'@keyframes (\w+)', css)))" assets/main.css
```

---

## Action items for `nxhhuy.tech` polish queue (prioritized)

| Priority | Pattern from analysis | Current state | Effort | Notes |
|---|---|---|---|---|
| **High** | Bloom accent on course hero | None | ~1h | Single `<div absolute>` + blur, uses existing `--accent` token. Big visual win for low effort. |
| **High** | Pain/Promise two-column for course intro | Not present | ~3h | Adds a new section to course-detail pages. Could template. |
| **Med** | Pill-styled metadata row in course hero | Plain text | ~1h | Convert existing `<div>` with count + duration to pill layout. |
| **Med** | Card-grouped curriculum view | Flat list | ~4h | New component: chapter card with nested numbered lessons. |
| **Low** | Three-tier accent tokens (accent / accent-deep / accent-bloom) | Two-tier | ~2h | Refactor design tokens. Enables bloom pattern. |
| **Low** | Vertical gradient divider | None | ~30min | Decorative accent between sections. |

**Recommended next session scope:** bloom accent + pill metadata
(~2h combined, biggest visual win per LOC). Save the bigger curriculum
card view for its own session.

---

## Honest disclosure

- The HTML I extracted was fetched with a single curl call per page. I
  did not execute the JavaScript, so any animations that fire only after
  hydration were not captured. The page also rendered fine without JS,
  which suggests SSR is doing most of the work.
- The "patterns" I describe above are inferred from class names and
  structural patterns. I did not see the rendered pixels. For pixel-level
  details (exact gradient stops, font weights in practice, animation
  easing curves), a screenshot or a JS-bundle fetch would be more
  reliable.
- All copy was in Vietnamese. The structural patterns are language-
  neutral; the typography choices assume Latin-script fonts which may
  not be optimal for Vietnamese (the source site uses Vietnamese text
  rendering throughout, so their font choices were tested with diacritics).