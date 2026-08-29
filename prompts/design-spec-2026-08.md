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

## 8. Animation patterns observed

All three pages use Tailwind's `animate-pulse` for loading states:

```html
<div class="animate-pulse rounded-md bg-muted h-32 w-full"></div>
<div class="animate-pulse rounded-md bg-muted h-4 w-5/6"></div>
```

That's the **only** explicit animation class in the fetched HTML. The
other motion is almost certainly CSS-keyframe-based or JS-driven
(Framer Motion / GSAP, common in modern education sites). To extract the
real animation patterns I'd need to:

1. Fetch the JS bundles (`/_next/static/chunks/...`)
2. Search for `framer-motion` or `gsap` imports
3. Identify the specific entrance animations, hover transitions, scroll-
   triggered reveals

**This is the next thing to do** if we want the full motion picture.

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

The HTML-only analysis gives layout, structure, and color tokens. To get
the **motion** picture, fetch the JS bundles and grep for animation
libraries:

```bash
curl -s https://sydexa.com/courses/advanced-sql \
  | grep -oE '/_next/static/[^"]+\.js' | sort -u

# Then for each bundle:
curl -s https://sydexa.com/_next/static/<hash>.js | head -c 5000000 \
  | grep -oE 'framer-motion|gsap|motion\.|@motionone'
```

This will tell us whether they use Framer Motion, GSAP, or plain CSS
transitions, and roughly how much of each.

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