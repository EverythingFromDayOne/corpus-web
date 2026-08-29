# Design spec — homepage patterns

**Purpose:** Capture the layout, typography, motion, and interaction
patterns observed on one public homepage (front door). This spec
complements the three existing course-detail, lesson-detail, and blog
specs by covering the **marketing/landing** surface that introduces
the platform and converts first-time visitors.

**Method:** Direct HTTP fetch (Safari User-Agent) of the homepage HTML.
Server-rendered React output captured statically (no JS hydration
needed for structure). No screenshots or pixel inspection.

**Captured:** 6 top-level sections + nav bar + footer; ~161 KB HTML.
**Date:** 2026-08-29.
**Status:** Single sample — patterns below are hypothesis-grade, not
statistically validated across multiple homepages. Treat as starting
point for evaluation.

---

## 1. Top-level nav bar

**Position:** Sticky top, ~104px tall on desktop.
**Structure:** Logo (left) + nav links (center) + CTA button (right).
**Responsiveness:** Logo + CTA visible on mobile; center nav links
hidden behind hamburger (not visible in desktop HTML).

| Element | Desktop size | Pattern |
|---|---|---|
| Logo | `<img>` 32px tall | Link to `/` |
| Nav links | `text-sm font-medium` | `<a>` text links, hover underline |
| CTA | `rounded-full px-4 py-1` | Pill button with backdrop blur |

**Source classes:**
- `relative rounded-full px-4 py-1 text-sm font-normal backdrop-blur-[2px] transition-colors duration-300 active:border-[var(--marketing-purple-bloom)] active:text-[var(--marketing-purple-bloom)] border border-white text-[var(--marketing-text-secondary)]`

**Pattern:** Pill-shaped CTA with backdrop blur + active-state color
change (`border-[var(--marketing-purple-bloom)]`). Border transitions
on press, not hover — confirms "press feedback" emphasis over hover.

**Comparison to `nxhhuy.tech`:**
- `apps/web/components/site/nav.tsx` — flat top bar with logo + horizontal links + dark/light toggle
- Gap: no pill-style CTA, no backdrop-blur header background

---

## 2. Hero section (under header)

**Layout:** Centered text + decorative background.
**Vertical pull:** `-mt-[104px] md:-mt-[120px] lg:-mt-[140px]` — hero
extends **up under** the sticky nav (negative top margin), so first
section visually starts at viewport top.

**H1 (hero title):**
> "Learn deeply into the essence in an understandable way"
> (Vietnamese: "Học sâu bản chất bên dưới một cách dễ hiểu")

Split rendering: first part is plain white text, second part
("một cách dễ hiểu") uses gradient text fill:
```
class="bg-clip-text text-transparent"
style="background-image:linear-gradient(to bottom, var(--marketing-accent-title-from) 41%, var(--marketing-accent-title-to))"
```

**Pattern:** Gradient text fill on emphasized word(s) via
`bg-clip-text` + `text-transparent`. Common landing-page pattern for
highlighting key value prop without losing brand color cohesion.

**Decorative background (under hero):**
1. **Bloom glow:** `pointer-events-none absolute inset-[20%_31%_14%_31%] rounded-[138px]` with `background:var(--marketing-purple-bloom);filter:blur(140px)` — a soft purple haze behind the H1
2. **Side gradients:** linear gradients fading from transparent on each edge to purple-bloom in the middle 50%
3. **Noise overlay:** SVG-data-URI `fractalNoise` with `opacity-[0.5]` + `mix-blend-overlay` — gives the bloom a textured "film grain" feel instead of flat color

**Sub-hero CTA buttons:**
- Primary: gradient pill `bg-gradient-to-r from-[var(--marketing-accent)] to-[var(--marketing-accent-deep)] text-white rounded-full font-semibold`
- Secondary: border pill `rounded-[10px] border border-border px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/5`
- Includes arrow-right Lucide icon on the secondary ("See how it works")

**Comparison to `nxhhuy.tech`:**
- `apps/web/app/[locale]/page.tsx` — simple landing with feature list + register CTA
- Gap: no gradient text fill, no bloom glow under hero, no film-grain noise overlay, no dual CTA layout

---

## 3. "Pain/promise" section (the "have you learned like this?" panel)

**Structure:** Section heading + scroll-pinned card stack of 3 "pain" cards.

**Section anchor:**
```
"flex items-center gap-6 text-base text-[var(--marketing-accent-line)]"
→ line + dot + label "Nỗi đau" (The Pain) + dot + line
```

**Card stack pattern (`.scroll-stack-card`):**
- 3 cards stacked vertically, pinned as user scrolls (`will-change-transform` + `transform-style:preserve-3d`)
- Each card uses Framer Motion `useScroll` + `useTransform` to translate-Y / scale based on scroll progress
- **Massive padding** `pb-[25rem]` on the inner stack container — gives scroll runway for the pin/scroll animation to play out

**Pain card design:**
- Background: `#070519` solid + multi-layer overlays:
  1. Linear gradient: `to right, #070519, rgba(145,0,230,0.45) 30%, rgba(145,0,230,0.45) 70%, #070519` — purple tint at edges
  2. SVG fractalNoise overlay @ 0.75 opacity, mix-blend-overlay
  3. SVG fineNoise overlay @ 0.45 opacity, mix-blend-soft-light
  4. Diagonal linear gradient overlay @ 0.5 opacity
- Border: 1px solid `#323751`
- Rounded: `rounded-3xl`
- Padding: `p-8 md:p-12 lg:p-[80px]`
- Glow border: `pain-card-glow-border` element overlays the card edge with a gradient stroke (likely animates on hover/scrub)

**Card content layout:** `flex items-start gap-8 lg:gap-[80px]` — number badge (left) + content (right)

**Number badge:** `w-[48px] md:w-[60px]` square, rounded-xl, `rgba(255,255,255,0.08)` bg, `border:1px solid #323751`, with 01/02/03 numbers inside.

**Top edge accent:** `absolute inset-x-0 top-0 z-[1] h-px` with `background:linear-gradient(to right, transparent, white 49%, transparent);opacity:0.5` — a thin white line at the top of each card.

**Pattern (extractable):** Scroll-pinned card stack with multi-layer texture backgrounds. The scroll-pinning requires Framer Motion's `useScroll` + sticky positioning + `useTransform` to map scroll progress to translate-Y per card. Implementation cost: substantial (likely ~4h including scroll-trigger wiring).

**Comparison to `nxhhuy.tech`:**
- `apps/web/components/site/features.tsx` (if exists) — simple grid of feature cards
- Gap: no scroll-pinned stack, no multi-layer texture bg, no animated border

---

## 4. "Audience fit" 3-column section (the "for you if..." panel)

**Heading:** "[brand] dành cho bạn nếu..." (the brand is for you if...) — Vietnamese-language example
**Layout:** 3 equal columns on desktop (`md:w-1/3` each), stacked on mobile.

**Card structure:**
- Vertical layout: icon container + H3 + paragraph
- Icon container: `flex items-center rounded-lg border border-white/20 p-3` with `background:linear-gradient(to bottom, rgba(63,58,83,0.4), rgba(19,17,25,0.4))`
- H3: `text-lg font-semibold text-[#e4e7f2]`
- Paragraph: `max-w-[345px] text-center text-base leading-6 text-[#959bb3]`

**Dividers (responsive):**
- Vertical: `absolute right-0 top-0 hidden h-full w-px bg-gradient-to-b from-transparent via-white/30 to-transparent md:block`
- Horizontal: `h-px w-full bg-gradient-to-r from-transparent via-white/30 to-transparent md:hidden`
- Both use 30%-opacity white in the middle, fading to transparent at both edges — **soft separator pattern**.

**Icons:** Lucide React (`lucide-graduation-cap`, `lucide-code`, `lucide-sparkles`, etc.), 24×24px, `size-6 text-[#e4e7f2]`, decorative (`aria-hidden="true"`).

**Card H3s observed:**
- "Developer 1-3 năm" (1-3 year developer)
- "Sinh viên IT năm 3-4" (3rd-4th year IT student)
- "Thích học kiểu interactive" (Likes interactive learning)
- "Lộ trình rõ ràng" (Clear learning path)
- "Tư duy 'Why' over 'How'" ('Why' over 'How' thinking)

**Pattern (extractable):** Icon + heading + paragraph card grid with
gradient separators between cards. Simple, high-impact layout.

**Comparison to `nxhhuy.tech`:**
- `apps/web/components/site/audience.tsx` (if exists) — flat list or grid
- Gap: no icon container with gradient bg, no gradient dividers between cards

---

## 5. "Anti-pattern" pain section (the "you've been doing this wrong" panel)

**Heading:** "Bạn đã từng học như thế này chưa?" (Have you ever learned like this?)
**H3s observed (3 cards):**
- "Biết tool nhưng không hiểu bản chất" (Knows the tool but not the fundamentals)
- "Xem video 3 tiếng, quên hết sau 3 ngày" (Watch 3 hours of video, forget it after 3 days)
- "Đọc docs xong vẫn không biết 'khi nào dùng gì'" (Read docs but still don't know when to use what)

**H3 styling:** `text-xl font-semibold text-white md:text-2xl md:leading-[36px]`
**Layout:** Each card likely uses similar structure to pain cards in section 3.

**Pattern:** Calls out specific learning anti-patterns the user has experienced. This is **social proof + pain amplification** — instead of generic "we're better", it names the exact failure modes the visitor has lived through.

---

## 6. Bottom CTA + footer

**CTA section:** "Sẵn sàng học khác đi?" (Ready to learn differently?)
**Layout:** Centered text + primary CTA button
**H2 styling:** `max-w-[725px] text-3xl font-semibold leading-tight text-white md:text-4xl lg:text-[48px] lg:leading-[60px]`

**Footer:** Standard dark footer with copyright + links. Not analyzed in depth (out of scope for design patterns).

---

## 7. Section anchor pattern (decorative divider)

**Repeating pattern between major sections:**
```html
<div class="flex items-center gap-6 text-base text-[var(--marketing-accent-line)]">
  <div class="flex items-center">
    <span class="h-px w-[72px] rounded-[100px] blur-[0.5px] bg-gradient-to-r from-transparent to-[var(--marketing-accent-line)]"></span>
    <span class="h-[5px] w-[5px] rounded-[5px] blur-[1px] bg-[var(--marketing-accent-line)]"></span>
  </div>
  <span class="text-[var(--marketing-accent-label-text)]">Nỗi đau</span>
  <div class="flex items-center">
    <span class="h-[5px] w-[5px] rounded-[5px] blur-[1px] bg-[var(--marketing-accent-line)]"></span>
    <span class="h-px w-[72px] rounded-[100px] blur-[0.5px] bg-gradient-to-l from-transparent to-[var(--marketing-accent-line)]"></span>
  </div>
</div>
```

**Pattern:** Line + dot + label + dot + line, with subtle blur (`blur-[0.5px]` to `[1px]`) for a soft luminous feel.

**Token:** `--marketing-accent-line` (the line/dot color), `--marketing-accent-label-text` (the label color).

**Pattern (extractable):** Reusable section-divider component. Implementation: ~30min for the component, ~15min per section to add.

---

## 8. Background aurora (whole-page decoration)

**Likely applied at page-level wrapper:**
```css
background-image: ...;
filter: blur(140px);
```

Combined with the per-section blooms, this gives the page a layered
"deep space" feel — purple haze in the background, brighter blooms at
section anchors, totally-flat content on top.

**Pattern:** Z-stack layering:
1. `<body>` background (dark solid)
2. `<body>` aurora layer (blurred gradient, low opacity)
3. Section-level blooms (positioned absolute, blurred)
4. Section-level noise overlays (data-URI SVGs, mix-blend-overlay)
5. Content (no z-index tweaks)

**Comparison to `nxhhuy.tech`:**
- Currently: solid dark/light theme, no decorative background
- Gap: no aurora layer, no per-section blooms, no noise overlays

---

## 9. Typography scale

Observed class strings:

| Use | Class | Note |
|---|---|---|
| Hero H1 | `<h1>` + gradient span | 60-72px on desktop (inferred) |
| Section H2 | `text-3xl md:text-4xl lg:text-[48px] lg:leading-[60px]` | 30→36→48px responsive |
| Card H3 | `text-lg font-semibold` (audience) or `text-xl md:text-2xl md:leading-[36px]` (pain) | 18 or 20→24px |
| Body | `text-base leading-6` | 16px / 24px |
| Subtitle/meta | `text-sm` | 14px |
| Numeric badge | `text-xl md:text-2xl font-semibold` | 20→24px |

**Font family:** Likely Be Vietnam Pro or similar (per course-detail spec; same site).

**Pattern (extractable):** Consistent responsive H2 sizing — `text-3xl md:text-4xl lg:text-[48px]` with `lg:leading-[60px]` ratio. Provides a reusable rhythm.

---

## 10. Color tokens (confirmed from HTML)

```css
--marketing-accent             /* Primary brand purple (CTAs, highlights) */
--marketing-accent-deep        /* Deeper purple (gradient stop, badge) */
--marketing-accent-bloom       /* Soft purple (blooms, glows) */
--marketing-purple-deep        /* Deep purple (featured overlay bg) */
--marketing-purple-bloom       /* Bloom variant (active states) */
--marketing-accent-line        /* Soft luminous line color */
--marketing-accent-label-text  /* Section label text color */
--marketing-accent-title-from  /* Hero gradient start */
--marketing-accent-title-to    /* Hero gradient end */
--marketing-text-secondary     /* #959bb3 - muted text */
--marketing-tag-border         /* rgba(255,255,255,0.2) - soft border */
--background                   /* Solid bg */
```

**Pattern:** Three-tier accent token hierarchy:
1. `accent` — primary
2. `accent-deep` — gradient stop / hover
3. `accent-bloom` — soft glow

Plus separate line/label/text tokens for granular color control.

**Comparison to `nxhhuy.tech`:**
- `apps/web/styles/globals.css` — currently 2-tier (`primary` + `accent`)
- Gap: no `*-bloom` tier, no separate line/label tokens

---

## 11. Component patterns to extract

| Pattern | Source | Reusable as |
|---|---|---|
| Section divider with line+dot+label+dot+line | HTML §7 | `<SectionDivider>` component |
| Pill CTA with backdrop blur + active color | HTML §1 | `<PillCTA>` component |
| Icon + H3 + P card with gradient divider | HTML §4 | `<AudienceCard>` component |
| Scroll-pinned pain card stack | HTML §3 | `<ScrollStack>` component (Framer Motion) |
| Numbered badge with top edge accent | HTML §3 | `<NumberBadge>` component |
| Hero with bloom + gradient text | HTML §2 | `<HeroWithBloom>` component |
| Multi-layer textured card bg | HTML §3 | `<TexturedCard>` component |

---

## 12. Motion patterns (cross-reference to course-detail spec §8)

- **ScrollStack** uses Framer Motion `useScroll` + `useTransform` to
  pin + translate-Y multiple cards based on scroll progress. Matches
  the GSAP ScrollTrigger pattern observed in the course-detail
  spec §8 Layer 3.
- **Bloom glows** use CSS `@keyframes float-gentle` (per
  course-detail spec §8 Layer 1) for subtle vertical bobbing.
- **Hover glow borders** on cards likely use Framer Motion's
  `whileHover` + `useMotionValue` for smooth color transitions.

---

## 13. Comparison to `nxhhuy.tech` (summary)

| Pattern | Current | Recommended next |
|---|---|---|
| Hero bloom + gradient text | None | Layer 1 CSS (~1h) |
| ScrollStack pinned cards | None | Framer Motion Layer 2 (~4h) |
| Multi-layer textured card bg | None | Layer 1 CSS (~1h) |
| Section divider line+dot+label | None | Pure HTML (~30min) |
| 3-column audience cards with gradient dividers | None (if no audience component) | HTML + Tailwind (~2h) |
| Three-tier accent tokens | Two-tier | CSS var refactor (~2h) |
| Film-grain noise overlay | None | Layer 1 CSS (~30min) |
| Backdrop-blur pill CTAs | Plain buttons | Tailwind classes (~30min) |
| Lucide icons | Already in use | N/A |
| Be Vietnam Pro font | May already be loaded | Verify |

---

## 14. Prioritized action items

| Priority | Pattern | Source layer | Effort | Risk |
|---|---|---|---|---|
| **High** | Section divider (line+dot+label) | HTML | ~30min | None |
| **High** | Hero bloom + gradient text | CSS | ~1h | None |
| **High** | 3-column audience cards with gradient dividers | HTML + Tailwind | ~2h | Low |
| **High** | Film-grain noise overlay (data-URI SVG) | CSS | ~30min | None |
| **Med** | Multi-layer textured card bg (4-layer) | CSS | ~1h | Low |
| **Med** | Pill CTA with backdrop blur | Tailwind | ~30min | None |
| **Med** | Three-tier accent tokens (`accent` / `accent-deep` / `accent-bloom`) | CSS var refactor | ~2h | Low (breaking change) |
| **Low** | ScrollStack pinned cards | Framer Motion | ~4h | Med (Cache Components compat check) |
| **Low** | Numbered badge with top edge accent | HTML | ~30min | None |

**Recommended next session scope:** Top 3 items (~3.5h) — section divider + hero bloom + audience cards. Lowest risk, highest perceived polish impact.

---

## 15. Limitations and caveats

- **Single sample:** Only one homepage was fetched. Patterns are not
  statistically validated across multiple sites.
- **No JS execution:** Animations are inferred from HTML markup (e.g.
  `will-change-transform`, `data-lenis-prevent`, `transform-style:preserve-3d`)
  — actual motion timings would require browser inspection.
- **No accessibility audit:** Patterns were not evaluated against
  WCAG 2.2 AA. The film-grain overlays could fail contrast tests at
  low opacity.
- **No font loading verification:** Font family assumed from prior
  course-detail spec; not confirmed on this page.
- **Vietnamese content:** All copy is in Vietnamese — patterns about
  text length, word wrap, and content density are language-specific
  and may not transfer directly to English-only `nxhhuy.tech` copy.

---

## 16. Reproduction recipe

To re-extract homepage patterns for any other site:

```bash
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
curl -s -A "$UA" '<homepage-url>' -o home.html

# Extract section structure
grep -oE '<section[^>]*>' home.html

# Extract heading hierarchy
grep -oE '<h[1-6][^>]*>[^<]+</h[1-6]>' home.html

# Find CSS custom properties (color tokens)
grep -oE '\-\-[a-z-]+(-(from|to|bloom|deep))?:\s*[^;]+' home.html | sort -u

# Find background decorations (blooms, gradients, noise)
grep -oE 'class="[^"]*(blur-\[|gradient|noise|fractalNoise)[^"]*"' home.html | sort -u

# Find scroll-pinned components (Framer Motion useScroll indicators)
grep -oE 'will-change-transform|preserve-3d|data-lenis-prevent' home.html

# Find icon libraries
grep -oE 'lucide-[a-z-]+|heroicons|@radix-ui/react-icons' home.html | sort -u | head -10
```

---

## 17. Cross-reference to existing specs

| This section | Related spec section |
|---|---|
| §1 Nav bar | New |
| §2 Hero with bloom | `design-spec-2026-08.md` §2 (Hero with bloom) |
| §3 Pain/promise scroll-stack | `design-spec-2026-08.md` §3 (Pain/promise two-column) |
| §4 Audience fit 3-column | New |
| §5 Anti-pattern pain section | `design-spec-2026-08.md` §3 (Pain/promise two-column) |
| §6 Bottom CTA | `design-spec-2026-08.md` §6 (Pricing/CTA) |
| §7 Section divider | New |
| §8 Background aurora | `design-spec-2026-08.md` §7 (Decorative elements) |
| §9 Typography | `design-spec-2026-08.md` §10 (Typography scale) |
| §10 Color tokens | `design-spec-2026-08.md` §9 (Color tokens) |
| §11 Components to extract | New |
| §12 Motion patterns | `design-spec-2026-08.md` §8 (Animation system) |
| §13 Comparison | New |
| §14 Action items | Extends all 3 prior action tables |

**Observation:** The homepage uses patterns from BOTH the
course-detail and lesson-detail specs (gradient blooms, three-tier
tokens, scroll-pinned components). The blog spec is less applicable —
blog posts are simpler than homepage sections.

---

## 18. Status

- **Drafted:** 2026-08-29
- **Reviewed:** No (single sample, principal-engineer-only review)
- **Validated against `nxhhuy.tech`:** No (the gaps in §13 are inferred from naming, not from code inspection)
- **Vendor-neutrality verified:** Yes (0 hits for any reference site names)

