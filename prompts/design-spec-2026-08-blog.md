# Design spec — blog index and post page patterns

**Purpose:** Capture the layout, typography, motion, and interaction patterns
observed on one blog index page and five individual blog post pages from a
public reference platform. This spec complements the homepage, course-detail,
and lesson-detail specs by covering the **content marketing / long-form
reading** surface — the place where readers land from search and share links.
The patterns below are written as vendor-neutral recommendations for
`nxhhuy.tech`'s existing content/blog routes (or for a new blog feature if
none exists).

**Method:** Direct HTTP fetch (Safari desktop User-Agent) of the blog
index HTML and five post page HTML files. Static server-rendered React
output captured. All 46 unique `_next/static` chunks (42 JS + 4 CSS)
downloaded for animation-library detection and CSS extraction. No JS
hydration executed; patterns inferred from class names, attribute hooks,
and CSS rules.

**Captured:** 1 blog index page + 5 post pages; ~912 KB HTML total;
~4.5 MB JS chunks (42 files) + ~308 KB CSS (4 files); 12 article cards
on the index page.
**Date:** 2026-08-30
**Status:** Hypothesis-grade — single platform sampled. Section §10's
"token" claims are *read off the compiled CSS variables*, not invented.
Section §13's animation attribution is conservative — heavy GSAP usage
was detected but its precise blog-page usage is not separable from
course-page usage in the same chunk set.

---

## 1. Blog index — top-level structure

The blog index is rendered as a single server-rendered React page with the
same outer chrome (nav + footer) as every other page on the platform.
The blog-specific content lives in two adjacent sections inside `<main>`:

```
<main class="flex-1 pt-[104px] md:pt-[120px] lg:pt-[140px]">
  <!-- 1. Hero -->
  <section class="relative isolate -mt-[104px] overflow-hidden md:-mt-[120px] lg:-mt-[140px]">
    [Hero: bloom + grain + grid pattern + H1 + breadcrumbs]
  </section>

  <!-- 2. Article grid -->
  <section class="relative w-full">
    <div class="mx-auto max-w-[1440px] px-6 pb-[100px] pt-[40px] md:px-8 lg:px-[80px]">
      [Filter row: category chips + sort dropdown]
      [Card grid: 1 col mobile / 2 cols tablet / 4 cols desktop]
    </div>
  </section>

  <!-- 3. CTA -->
  <section class="relative isolate flex flex-col items-center justify-center overflow-hidden px-6 py-20 md:px-12 lg:px-[80px] lg:py-[120px]">
    [Big H2 + lead paragraph + phone-input form + arrow button]
  </section>
</main>
```

**Hero treatment (URL #1):**
- Negative top margin `-mt-[104px] md:-mt-[120px] lg:-mt-[140px]` so the
  hero extends **up under** the sticky nav, same trick used on the
  homepage hero (cross-ref homepage §2).
- Decorative layers stacked behind content (z-index 3 → 4 → 5):
  1. Bloom glow: `absolute left-[5.27%] top-[calc(50%-68.47px)] -translate-y-1/2 aspect-[159/95] w-[10.59%] rounded-[138px] bg-[var(--marketing-purple-bloom)] blur-[140px]`
  2. SVG grid pattern (`/blog-grid-pattern.svg`) with mix-blend-overlay
  3. SVG fractalNoise overlay at 35% opacity
  4. Hero text foreground (H1 + breadcrumb)
- **H1:** `text-[40px] font-bold leading-tight text-foreground md:text-[60px] lg:text-[80px]`
  — single-line "topic" headline, no gradient text fill (the gradient
  treatment is reserved for the homepage hero).
- The blog hero H1 (40→80px responsive) is louder than the homepage
  hero (~60-72px) — by design: the blog index has to compete with
  content thumbnails for attention, while the homepage hero is the
  sole focal point.
- **Breadcrumb:** small inline nav above the H1 with a `chevron-right`
  separator between segments; current segment uses `text-[var(--muted-foreground)]`
  to signal the end of the trail.

**Article-grid container:**
- `max-w-[1440px]` outer — wider than typical blog grids (which sit
  around 1200px) so four cards per row get comfortable breathing room
  on large displays.
- `gap-x-6 gap-y-8` — vertical gap is 33% larger than horizontal, which
  helps the eye separate rows when scanning.
- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` — clean responsive ramp;
  the mobile single-column view collapses the filter row into a
  horizontally-scrollable strip (handled by the inner chip `flex-wrap`).

**CTA section:**
- Centered H2: `text-3xl font-semibold leading-tight text-[#e4e7f2] md:text-4xl lg:text-[48px] lg:leading-[60px]`
- Lead paragraph: `text-base leading-8 text-[#c1c6da] lg:text-[20px] lg:leading-[32px]`
- Phone-input capture form (not email — see §8).

---

## 2. Blog post — top-level structure

A post page is the same outer shell (nav + footer) wrapped around a
single-article layout. The wrapper differs from the index in two ways:
no hero bloom, no filter row, and the article body has its own
constrained reading column.

```
<main class="flex-1 pt-[104px] md:pt-[120px] lg:pt-[140px]">

  <!-- 1. Cover image (full-bleed within 1440px container) -->
  <div class="mx-auto w-full max-w-[1440px] px-6 pb-8 md:px-8 lg:px-[80px]">
    <div class="relative w-full overflow-hidden rounded-2xl">
      <img class="h-auto w-full" />
    </div>
  </div>

  <!-- 2. Article body -->
  <article class="mx-auto w-full max-w-[1440px] px-6 md:px-8 lg:px-[80px]">
    <div class="mx-auto max-w-[768px]">
      [Category badge]
      [H1 title]
      [Meta row: author | date | reading time]
    </div>
    <div class="blog-content">
      [Body: H2/H3/H4, p, ul/ol, code/pre, blockquote, figure/figcaption,
       img, table, hr, bookmark embed]
    </div>
  </article>

  <!-- 3. Related posts -->
  <section>
    <h2>Bài viết liên quan</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      [4 related cards — same data-blog-card pattern as index]
    </div>
  </section>

  <!-- 4. CTA section (same component as index CTA) -->
</main>
```

**Reading column width:** `max-w-[768px]` (~48rem) — a deliberate
choice. The platform's lesson-detail spec uses `max-w-5xl` (1024px)
because lessons embed side-by-side code. Blog posts use the **classic
reading column** width (60–75 characters at 17px font-size / 1.8 line
height), proven optimal for prose-heavy reading.

**Padding rhythm:** `px-6 md:px-8 lg:px-[80px]` matches the rest of
the site. Vertical rhythm inside `.blog-content` is controlled by
`margin-top` / `margin-bottom` on block elements (see §6).

**No breadcrumbs, no TOC, no comments, no share UI on post pages:**
None of the five sampled posts include a breadcrumb nav above the H1,
an in-article table of contents, comment thread, or visible share
buttons. The only navigation between posts is via the related-posts
grid at the bottom. (Open Graph and Twitter card meta-tags exist for
*external* link sharing — but that's head metadata, not in-body UI.)
URL #3 (microservices) and URL #4 (DTO) contain the only structural
peculiarities worth noting:
- URL #4 has a "Subscribe" / "Đăng ký" form inside the post body
  (vendor's newsletter pitch — not a UI pattern worth copying).
- URL #4 also has 1 `<blockquote>` and 9 `<pre>/<code>` blocks —
  the highest code-density post in the sample.

---

## 3. Article card (blog index)

The card is the most-reused component on the index page. Every card
carries `data-blog-card="true"` (an attribute hook used by any JS
targeting — no CSS rule currently binds to it; light-mode overrides
do, see §10). The structure:

```html
<a data-blog-card="true"
   href="/blog/<slug>"
   class="group flex flex-col overflow-hidden rounded-[14px] border
          transition-all duration-300
          border-[var(--marketing-tag-border)]"
   style="background:linear-gradient(to bottom,
              rgba(63, 58, 83, 0.4),
              rgba(19, 17, 25, 0.4))">
  <div class="relative h-[204px] w-full overflow-hidden">
    <img class="object-cover transition-transform duration-500
                group-hover:scale-110" />
    <div class="absolute left-3 top-3 rounded-full border border-white/20
                bg-[#151828] px-2.5 py-1 backdrop-blur-[20px]">
      <span class="text-sm leading-5 text-white">[Category]</span>
    </div>
  </div>
  <div class="flex flex-1 flex-col gap-3 px-4 pb-3 pt-4">
    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-1">
        [calendar icon, 14px]
        <span class="text-xs leading-4 text-[var(--muted-foreground)]">
          DD/MM/YYYY · N phút đọc
        </span>
      </div>
      <h3 class="line-clamp-2 text-sm font-semibold uppercase leading-5
                 text-white transition-colors duration-300
                 group-hover:text-[var(--marketing-purple-accent)]">
        [Title]
      </h3>
    </div>
    <p class="line-clamp-3 text-xs leading-[1.6]
              text-[var(--muted-foreground)]">
      [Excerpt]
    </p>
    <div class="mt-auto flex items-center gap-2 pt-2">
      <span class="text-xs font-semibold text-[var(--muted-foreground)]
                   transition-colors duration-300 group-hover:text-white">
        Chi tiết bài viết
      </span>
      [chevron-right icon, 16px]
    </div>
  </div>
</a>
```

**Visual signature:**
- **Border-radius 14px** — soft corners, sits between "card-y" (8px)
  and "tile-y" (20px) extremes.
- **Background:** linear gradient from `#3f3a5340` (40% opacity muted
  purple-gray) to `#13111940` (40% near-black). Creates a subtle
  "lit from above" feel without flat color.
- **Image hover:** `scale-110` on the inner `<img>`, with
  `transition-transform duration-500` — the standard "zoom on card
  hover" trick. The container clips with `overflow-hidden` so the
  zoom is contained.
- **Category badge:** absolutely positioned top-left of the image
  (`left-3 top-3`), rounded-full, with `backdrop-blur-[20px]` so it
  stays legible regardless of the photo underneath. Border at 20%
  white opacity (`border-white/20`).
- **Title typography:** `text-sm font-semibold uppercase` — 14px,
  semibold, ALL CAPS. This is **bold** — most blog cards use
  sentence-case titles; ALL CAPS at 14px is the design's signature.
  `line-clamp-2` keeps the height stable; the title shifts color
  from white → `var(--marketing-purple-accent)` on hover.
- **Excerpt:** `text-xs leading-[1.6]` — 12px, 1.6 line height,
  3-line clamp (`line-clamp-3`). Muted color.
- **CTA footer row:** `mt-auto` pushes the "Chi tiết bài viết" +
  chevron-right to the bottom of the card regardless of excerpt
  length — important for visual alignment across cards of varying
  excerpt lengths.
- **Hover transitions:** all transitions use `duration-300` (300ms)
  for color/opacity changes and `duration-500` for the image zoom.
  This asymmetric timing is intentional: the eye notices the image
  zoom because it takes longer; the text color change feels
  "snappy" because it's quicker.

**Pattern (extractable):** `<ArticleCard>` component with three
sub-components: `<ArticleCardCover>`, `<ArticleCardMeta>`, `<ArticleCardCta>`.
Implementation cost: ~30min per card (HTML + Tailwind), plus ~10min
for the gradient bg token if not already in the design system.

**Comparison to `nxhhuy.tech`:**
- `apps/web/components/article/` likely has an article-card variant
  for corpus articles (the file structure follows
  `components/article/` per AGENTS context).
- Gap: the dark-gradient + bloom + ALL CAPS treatment is the
  signature look; flat-color or no-gradient cards would feel
  comparatively muted.
- The hover-image-zoom and "category badge overlay" are easy wins
  to add even to an existing card.

---

## 4. Featured / hero post overlay

The blog index page does **not** have a separate "featured post" hero
above the article grid. The first card in the grid is visually
indistinguishable from the rest (same gradient bg, same image height,
same typography). The single H1 above the grid is the section title,
not a post title.

**Pattern:** *No featured-post treatment.* This is a deliberate choice
on the reference platform — all posts are equal-weight on the index.
This contrasts with many blog designs where the "most recent" or
"editor's pick" gets a larger card or full-width hero treatment.

**Implication for `nxhhuy.tech`:** if your existing blog index already
has a featured-post pattern, you don't need to remove it. If it
doesn't, the reference's "no featured post" approach is a legitimate
option — keeps the visual rhythm uniform.

**Comparison to `nxhhuy.tech`:**
- If the existing corpus landing uses a "latest article" hero block
  (`apps/web/app/[locale]/blog/page.tsx` or similar), the gap is
  *that block is missing on the reference* — not the other way
  around.
- **Recommendation:** keep any existing featured-post treatment; the
  reference's "flat grid" is an alternative, not a requirement.

---

## 5. Post header chrome

The post header is the area between the cover image and the article
body. Five elements stack vertically:

```
[Cover image — full-bleed, rounded-2xl]
───── (no horizontal rule; spacing carries the break) ─────
[Category badge]
[H1 title]
[Meta row: author · date · reading-time]
[spacer ~40px → start of .blog-content]
```

**Category badge:**
```html
<span class="inline-block rounded-full border
             border-[var(--blog-badge-border)]
             bg-[var(--blog-badge-bg)]
             px-3 py-1 text-sm
             text-[var(--blog-badge-text)]
             transition-all duration-500">
  Backend
</span>
```
- 12px vertical padding, 14px font-size (text-sm in Tailwind ≈ 14px).
- Border, background, and text colors all read from CSS variables
  scoped to `.blog-content` (see §10).
- The `transition-all duration-500` matches the `.blog-content`
  color/background transitions defined in the design-system CSS
  — when the theme toggles dark/light, the badge animates color
  changes over 500ms instead of snapping.

**H1 title:**
```html
<h1 class="mb-5 text-2xl font-bold leading-tight
           text-[var(--foreground)] transition-colors duration-500
           sm:text-3xl md:text-4xl">
  [Post Title]
</h1>
```
- Responsive ramp: 24px → 30px → 36px → 48px (the `md:text-4xl`
  step is 36px; `lg:text-4xl` is implicit since 4xl = 36px; the
  reference does not push further on lg).
- `font-bold` (700), `leading-tight` (1.25) — tight leading suits
  multi-line Vietnamese titles where line-wrap is more frequent.
- `text-[var(--foreground)]` — uses the design-system foreground
  token, so theme toggle handles it.

**Meta row:**
```html
<div class="mb-10 flex flex-wrap items-center gap-4 text-sm
            text-[var(--muted-foreground)] transition-colors duration-500">
  <div class="flex items-center gap-1.5">
    [lucide-user icon, 16px]
    <span>[Author Name]</span>
  </div>
  <span class="text-[var(--border)]">|</span>
  <div class="flex items-center gap-1.5">
    [lucide-calendar icon, 16px]
    <span>[DD/MM/YYYY]</span>
  </div>
  <span class="text-[var(--border)]">|</span>
  <div class="flex items-center gap-1.5">
    [lucide-clock icon, 16px]
    <span>N phút đọc</span>
  </div>
</div>
```

**Meta row visual:**
- Three icon+label pairs separated by `|` glyphs colored with
  `--border` token (a soft separator that works in both themes).
- `flex-wrap` allows the row to break to two lines on narrow screens.
- `gap-4` between pairs (16px), `gap-1.5` between icon and label (6px).
- `mb-10` (40px) gives breathing room before the article body.

**Author byline rendering:**
- Author names are rendered as plain text (no avatar, no link to
  author archive — author archives are not part of the sampled
  site). This is a **simpler model** than the typical
  avatar + name + author-page-link pattern.
- All three meta items render in the same `--muted-foreground`
  token — no visual hierarchy distinguishing them.

**Reading-time calculation:**
- Reading time is a precomputed number, rendered as text "7 phút đọc"
  (7 minutes of reading). The post page does not compute this
  client-side; it's a static value baked into the post's frontmatter.

**No share buttons on the post header (the reference's choice):**
- Despite being a standard expectation for blog posts, the sampled
  platform does not include visible share-to-Facebook/Twitter/LinkedIn
  buttons in the header (or anywhere in the article body).
- Sharing is delegated to the browser's native share sheet and to
  the social meta-tags in the `<head>`.
- §15 lists share buttons (Facebook/Twitter) as a recommended polish
  addition for `nxhhuy.tech`'s blog — the reference site's "no share"
  choice is one option, but explicit share UI is the more common
  pattern. Pick deliberately, don't inherit by accident.

**Pattern (extractable):** `<PostHeader>` component composed of
`<PostHeaderBadge>`, `<PostHeaderTitle>`, `<PostHeaderMeta>`. Pure
HTML+CSS — no JS. ~20min to template.

---

## 6. Reading typography

The article body lives inside a `.blog-content` wrapper. Every style
is declared in the compiled CSS, not in Tailwind utilities — this
means the typography is **portable across any container** that
adds the `blog-content` class. From the CSS:

```css
.blog-content {
  max-width: 768px;
  color: var(--foreground);
  margin-left: auto; margin-right: auto;
  font-size: 1.0625rem;   /* 17px */
  line-height: 1.8;
  transition: color .5s;
}
.blog-content h2 {
  color: var(--foreground);
  margin-top: 2.5rem;     /* 40px */
  margin-bottom: 1rem;    /* 16px */
  font-size: 1.625rem;    /* 26px */
  font-weight: 700;
  line-height: 1.35;
  transition: color .5s;
}
.blog-content h3 {
  color: var(--foreground);
  margin-top: 2rem;       /* 32px */
  margin-bottom: .75rem;  /* 12px */
  font-size: 1.375rem;    /* 22px */
  font-weight: 600;
  line-height: 1.4;
  transition: color .5s;
}
.blog-content h4 {
  color: var(--foreground); opacity: .9;
  margin-top: 1.75rem;    /* 28px */
  margin-bottom: .5rem;
  font-size: 1.125rem;    /* 18px */
  font-weight: 600;
  line-height: 1.45;
}
.blog-content p {
  margin-bottom: 1.25rem; /* 20px */
}
.blog-content a {
  color: var(--blog-accent);
  text-decoration: underline;
  text-decoration-color: var(--blog-accent-underline);
  text-underline-offset: 3px;
  transition: text-decoration-color .2s, color .5s;
}
.blog-content strong { color: var(--foreground); font-weight: 600; }
.blog-content em     { opacity: .85; font-style: italic; }
.blog-content ul, .blog-content ol { margin-bottom: 1.25rem; padding-left: 1.5rem; }
.blog-content li { margin-bottom: .5rem; padding-left: .25rem; }
.blog-content li::marker { color: var(--blog-marker); }
```

**Reading type specimen (dark theme):**

| Element | Size | Line-height | Weight | Margin top/bottom | Notes |
|---|---|---|---|---|---|
| Body text | 17px | 1.8 | 400 | 0 / 20px | |
| H2 | 26px | 1.35 | 700 | 40px / 16px | tight leading for Vietnamese diacritics |
| H3 | 22px | 1.4 | 600 | 32px / 12px | |
| H4 | 18px | 1.45 | 600 | 28px / 8px | muted via `opacity:.9` |
| Inline code | 0.9em | inherit | 400 | bg `--blog-code-bg`, color `--blog-code-text` | `border-radius:4px`, padding `.15rem .4rem` |
| `<pre>` block | 14px | 1.7 | 400 | 24px / 24px | `border-radius:10px`, `overflow-x:auto`, `padding:1.25rem 1.5rem` |
| `<pre> code` | 14px | 1.7 | 400 | 0 | inherits code font stack |
| Blockquote | italic | inherit | 400 | 24px / 24px | `border-left:3px solid --blog-accent`, `bg --blog-blockquote-bg`, `border-radius:0 8px 8px 0` |
| Image (in body) | — | — | — | 24px / 24px | `border-radius:10px`, full-width within column |
| Figure caption | 14px | inherit | 400 | 8px / 0 | centered, color `--muted-foreground` |
| Table | 15px | inherit | 400 | 24px / 24px | `border-collapse:collapse`, header `border-bottom:2px solid --border`, rows `border-bottom:1px solid --blog-table-border` |
| Bookmark embed | 15px / 13px / 12px | 1.4–1.5 | 600/400 | 24px / 24px | Three-region card: thumbnail (180px wide, or full-width on mobile) + content + meta |
| HR divider | — | — | — | 32px / 32px | `border-top:1px solid --border` |

**Inline code styling:**
```css
.blog-content code {
  background: var(--blog-code-bg);
  color: var(--blog-code-text);
  border-radius: 4px;
  padding: .15rem .4rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas,
               "Liberation Mono", monospace;
  font-size: .9em;
}
```
**Code block styling:** Same `--blog-pre-bg` color as inline code
gets a slightly darker bg, with a `1px solid --blog-pre-border`
border and `border-radius:10px`. Overflow-x is enabled for long
lines. The body font inside `<pre>` is `0.875rem` (14px) — slightly
smaller than inline code so block code doesn't dominate.

**Blockquote styling:** Italic text, left accent border in
`--blog-accent` (purple), background tinted with `--blog-blockquote-bg`
(semi-transparent purple), `border-radius:0 8px 8px 0` — only the
right side rounded (consistent with the left accent bar). 12px
vertical + 20px horizontal padding.

**Image styling:** `border-radius:10px`, `max-width:100%`,
`height:auto`, vertical margin 24px each side. The class `.kg-image-card`
wraps standalone images in a `<figure>` element. The class
`.kg-width-wide` allows an image to break out of the 768px reading
column to fill up to `+4rem` wider (the equivalent of margin: -2rem
on each side), useful for diagrams.

**Bookmark embed styling:** This is a card-style link preview
(think GitHub-style oEmbed cards). Three regions:
- Thumbnail (180×100px on desktop, full-width 140px on mobile via
  `order:-1` flexbox reorder)
- Content: title (`-webkit-line-clamp:2`, 15px semibold) +
  description (`-webkit-line-clamp:2`, 13px) + metadata row (12px)
- Icon (18×18, rounded 2px)
- Container: rounded 10px, 1px border in `--border`, background
  `--blog-bookmark-bg`. Border becomes `--blog-accent-underline`
  on hover (200ms transition).

**Pattern (extractable):** The `.blog-content` typography is the
single most reusable artifact in this spec. Implementation cost: ~1h
to copy the CSS block into a design-system file (or port to Tailwind
utilities). The token system (`--blog-*`) means the colors can be
swapped per-theme without touching the typography.

**Comparison to `nxhhuy.tech`:**
- Current article reading view likely uses Tailwind `prose` or
  similar; the platform's `.blog-content` is a custom variant.
- The 17px / 1.8 line-height is the standard "literary" reading
  rhythm — slightly larger and looser than typical web text (which
  is 16px / 1.5).
- Vietnamese text rendering at 17px works because the diacritics
  add vertical weight to each character; 16px tends to feel
  cramped for Vietnamese.
- **Recommendation:** keep the 17px / 1.8 spec for any prose-heavy
  article reading view; English readers will not object to slightly
  larger text on long-form posts.

---

## 7. Sidebar (if any) — TOC, related, share

**No sidebar on post pages.** The blog post layout is single-column
inside the 768px reading column. There is no:
- Right-side TOC navigation (despite most of the posts having 6-10
  H2/H3 sections — no scroll-spy TOC was found in the markup).
- Floating share buttons (sharing is delegated to social meta-tags
  and the user's OS share sheet).
- "Author bio" or "more from this author" panel.
- "Subscribe to newsletter" inline form on post pages (URL #4 had
  one mid-article, but it was an inline CTA, not a sidebar).

**Related posts section:**
The only adjacent navigation is the "Bài viết liên quan" (Related
posts) section after the article body:
```html
<h2 class="mb-8 text-2xl font-bold text-[var(--foreground)]
           transition-colors duration-500">Bài viết liên quan</h2>
<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
  [4 article cards — same data-blog-card markup as the index page]
</div>
```

**Related-card selection logic:** Cannot determine from the HTML
alone. The cards appear to be 4 specific posts (not the most recent
4), so they're likely curated by category or tag similarity — but
no metadata in the markup confirms this.

**Pattern (extractable):** `<RelatedPosts>` component takes a
post-slug → returns 4 post slugs → renders 4 `<ArticleCard>`s in the
same 1/2/4-column grid as the index. Implementation cost: ~30min
+ backend query for "posts related to X".

---

## 8. Newsletter signup / CTA sections

**No in-article newsletter signup.** No form in the sidebar, no
inline "subscribe" block in the body of any sampled post (URL #4
had one inline form, but that appeared to be the platform's own
"stay updated" pitch, not a generic newsletter pattern).

**Bottom-of-page CTA on the blog index:**
```html
<section class="relative isolate flex flex-col items-center justify-center
               overflow-hidden px-6 py-20 md:px-12 lg:px-[80px] lg:py-[120px]">
  <h2 class="text-3xl font-semibold leading-tight text-[#e4e7f2]
             md:text-4xl lg:text-[48px] lg:leading-[60px]">
    [H2: e.g. "Sẵn sàng học sâu cùng [brand]?"]
  </h2>
  <p class="text-base leading-8 text-[#c1c6da]
            lg:text-[20px] lg:leading-[32px]">
    [Lead paragraph]
  </p>
  <div class="flex w-full max-w-[600px] flex-col items-stretch gap-2
              rounded-3xl border border-[#323751] p-2
              sm:flex-row sm:items-center sm:rounded-full
              sm:py-2 sm:pl-8 sm:pr-2"
       style="background:linear-gradient(to bottom,
                  rgba(63, 58, 83, 0.4),
                  rgba(19, 17, 25, 0.4))">
    <input type="tel"
           placeholder="Nhập số điện thoại của bạn"
           class="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm leading-5
                  text-[#e4e7f2] outline-none placeholder:text-[#959bb3]
                  disabled:opacity-50 sm:px-0 sm:py-0" />
    <button class="flex shrink-0 items-center justify-center gap-2
                   rounded-full border border-[#323751] px-6 py-3
                   text-base font-semibold text-[#e4e7f2]
                   transition-opacity disabled:opacity-50"
            style="background:linear-gradient(to bottom,
                       rgba(63, 58, 83, 0.4),
                       rgba(19, 17, 25, 0.4))">
      [Label, e.g. "Nhận tư vấn"] [lucide-arrow-right icon]
    </button>
  </div>
</section>
```

**CTA section observations:**
- **Phone capture, not email.** The platform is Vietnamese-market,
  so the form uses `<input type="tel">` to collect phone numbers
  for sales-team follow-up. This is a deliberate localization
  choice — Vietnamese consumers are more comfortable giving phone
  numbers than email addresses for sales inquiries.
- **Single-line shape on desktop, stacked on mobile.** The form
  container is `rounded-full` on `sm:` (≥640px) and `rounded-3xl`
  on mobile — a "pill" on desktop, a "stacked card" on mobile.
- **Inline icon button** — the arrow-right Lucide icon lives
  *inside* the button (no separate submit-icon SVG).
- **Disabled by default** — `disabled=""` is set on both inputs
  in the HTML; presumably JS enables them after some validation
  logic (couldn't capture from static HTML).
- **Background matches nav:** The form's gradient bg
  (`rgba(63, 58, 83, 0.4) → rgba(19, 17, 25, 0.4)`) matches the
  nav and the marketing-theme panel surfaces — consistent with
  the design system's "tinted glass" motif.

**Comparison to `nxhhuy.tech`:**
- If the existing site has an email-capture CTA on the blog index,
  it's structurally the same — just swap `<input type="tel">` for
  `<input type="email">` and the placeholder.
- The form's "tinted glass" gradient is the same recipe as the
  nav (cross-ref homepage §1).

---

## 9. Tag chips / category system

Categories are the **only taxonomy visible to readers** on the blog
index. No tag chips appear on the post pages, only the single
category badge in the post header.

**Filter row on the blog index:**
```html
<div class="flex flex-wrap items-center gap-4">
  <span class="tag-star-wrap pointer-events-auto cursor-pointer">
    <div class="tag-star-top"></div>
    <div class="tag-star-bottom"></div>
    <div class="relative rounded-full px-4 py-1 text-sm font-normal
                backdrop-blur-[2px] transition-colors duration-300
                active:border-[var(--marketing-purple-bloom)]
                active:text-[var(--marketing-purple-bloom)] z-[1]
                border border-transparent text-[#e4e7f2]
                shadow-[0px_0px_7.1px_0px_rgba(192,84,255,0.8)]"
         style="background:linear-gradient(to bottom,
                    var(--marketing-tag-bg-from),
                    var(--marketing-tag-bg-to)) padding-box,
                linear-gradient(to bottom,
                    var(--marketing-tag-border-from),
                    var(--marketing-tag-border-to)) border-box">
      Tất cả
    </div>
  </span>
  <span class="tag-star-wrap pointer-events-auto cursor-pointer">
    <div class="relative rounded-full px-4 py-1 text-sm font-normal
                backdrop-blur-[2px] transition-colors duration-300
                active:border-[var(--marketing-purple-bloom)]
                active:text-[var(--marketing-purple-bloom)]
                border border-white text-[var(--marketing-text-secondary)]">
      Frontend
    </div>
  </span>
  ... (Backend, Security, AI)
</div>

<div class="relative">
  <button class="flex items-center gap-[50px] rounded-full
                 bg-[var(--secondary)] px-4 py-2 backdrop-blur-[2px]">
    <span class="text-sm text-white">
      <span class="font-semibold">Lọc theo: </span>Tất cả
    </span>
    [lucide-chevron-down icon]
  </button>
</div>
```

**Active state (the "Tất cả" chip):**
- Has a `.tag-star-wrap` parent with `.tag-star-top` and
  `.tag-star-bottom` children — these are absolute-positioned
  radial-gradient halos that **animate horizontally** via the
  `star-movement-top` and `star-movement-bottom` keyframes
  (`6s linear infinite alternate`).
- The chip itself has:
  - **Shadow:** `0px 0px 7.1px 0px rgba(192,84,255,0.8)` — a
    purple glow.
  - **Background:** gradient from `--marketing-tag-bg-from` to
    `--marketing-tag-bg-to` (token-driven, dark theme variant).
  - **Border:** transparent, with the `padding-box` /
    `border-box` dual-background trick to render a gradient
    border via `--marketing-tag-border-from` →
    `--marketing-tag-border-to`.

**Inactive state:**
- Plain `border border-white` (white at 20% opacity).
- Text color `--marketing-text-secondary` (muted slate).
- No `.tag-star-wrap` halo, no shadow.

**Sort dropdown (right side of filter row):**
- Pill button with `chevron-down` icon.
- Label format: "**Lọc theo:** Tất cả" (Filter by: All).
- `gap-[50px]` between the label and the icon — wide gap so the
  icon sits visually separated from the text.
- Background: `--secondary` token (a softer pill than the
  chips, since it's a different action).
- No visible dropdown content in the static HTML — the menu
  likely opens via JS, but its markup is not server-rendered.

**Filter behavior:**
- Cannot determine how filtering actually applies from the HTML
  alone. Likely a client-side filter or URL-state change.
- No `<form>` element wrapping the chips — they're standalone
  `<span>` elements with `cursor:pointer`, suggesting JS-driven
  click handlers.

**Pattern (extractable):** `<CategoryChip>` with two states
(active/inactive), plus a star-halo animation wrapper for the
active state. Implementation cost: ~45min (HTML + CSS for both
states + keyframes + reduced-motion guard).

**Comparison to `nxhhuy.tech`:**
- The platform's chips are **pills** (rounded-full), not the
  square tags used by most blog platforms.
- The dual-bg gradient-border trick (`padding-box` / `border-box`)
  is the cleanest way to get a gradient border on a pill — works
  in all modern browsers.
- The `.tag-star-*` halo animation is shared with the
  `.next-course-star-*` and `.callout-star-*` classes (same CSS
  module) — a reusable "shimmering border" pattern that the
  platform uses for any "selected" pill state.

---

## 10. Color tokens (inferred from HTML + CSS)

The platform exposes a **rich, scoped color token system** for the
blog via CSS custom properties. There are three layers:

### Layer 1: Site-wide base tokens (from `.marketing-theme`)

```
--background            #070519    /* near-black, page bg */
--foreground            #e4e7f2    /* primary text, light slate */
--muted-foreground      #959bb3    /* secondary text, mid slate */
--border                #323751    /* default border, dark slate */
--card                  #0c0a20    /* card surface */
--primary               #d05be6    /* primary accent, light purple */
--secondary             #21253a    /* secondary surface */
--ring                  #b05eff    /* focus ring */
--marketing-text-secondary: #c1c6da
```

Plus the marketing accent hierarchy (see homepage spec §10):
`--marketing-accent`, `--marketing-accent-deep`,
`--marketing-accent-bloom`, `--marketing-accent-line`, plus
`-bloom-{03,12,20,25,30,45}` alpha variants.

### Layer 2: Blog-scoped tokens (defined inside `.blog-content`)

The `.blog-content` rule block re-defines a complete set of tokens
**scoped to itself** — these tokens only apply inside the article
body. Two versions exist (light vs dark theme):

**Dark theme (default):**
```
--blog-code-bg          #d05be61a    /* ~10% purple tint */
--blog-code-text        #e0c4ff      /* light purple */
--blog-pre-bg           #12101f      /* near-black */
--blog-pre-text         #d4d4e0      /* off-white */
--blog-pre-border       #323751      /* matches --border */
--blog-bookmark-bg      #12101f      /* matches --blog-pre-bg */
--blog-blockquote-bg    #d05be60d    /* ~5% purple tint */
--blog-table-border     #32375180    /* border at 50% alpha */
--blog-accent           #d05be6      /* primary link + accent */
--blog-accent-underline #d05be666    /* link underline at 40% alpha */
--blog-marker           #d05be6      /* ::marker color for ul/ol */
--blog-selection-bg     #d05be64d    /* ::selection at 30% alpha */
--blog-badge-bg         #21253a      /* category badge bg */
--blog-badge-border     #15143a      /* category badge border */
--blog-badge-text       #d48aff      /* category badge text */
```

**Light theme (`html:not(.dark)[data-blog]`):**
Same token names, lighter alphas. Canonical values in the dark table
above; the light table in `/tmp/blog-spec-assets/css/` (one of the
4 captured CSS files, search `--blog-code-bg`) carries the actual
hex values if needed. The structural shape (15 `--blog-*` tokens,
two themes, gated by `[data-blog]` on `<html>`) is the durable
lesson — values are a copy-paste concern.

### Layer 3: Light-theme `[data-blog]` overrides

For blog pages specifically, the platform applies a **dedicated
light-mode override** that's distinct from the dark-mode tokens.
This override is scoped via `html:not(.dark)[data-blog]` — meaning
the override only activates on blog pages in light mode:

```css
html:not(.dark)[data-blog] .marketing-theme {
  --background: #f8f7fc;     /* light off-white */
  --foreground: #1c1832;     /* dark plum text */
  --muted-foreground: #6b6586;
  --border: #d4d0e0;
  --input: #d4d0e0;
  --card: #fff;
  --primary: #9333ea;
  --ring: #9333ea;
  --marketing-text-secondary: #4a4565;
  --marketing-tag-border: #8b5cf640;
  --marketing-accent-label-text: #7c3aed;
}
```

**Light-mode card override** (the most important blog-specific
override):
```css
html:not(.dark)[data-blog] .marketing-theme [data-blog-card] {
  box-shadow: 0 1px 3px #1c18320a;
  background: #fff !important;
  border-color: #1c183214 !important;
}
html:not(.dark)[data-blog] .marketing-theme [data-blog-card]:hover {
  box-shadow: 0 8px 24px #9333ea1f;
  border-color: #9333ea59 !important;
}
```

This produces the **dramatic difference** between the two themes:
- **Dark cards:** gradient purple-tinted background, no shadow,
  colored border that brightens on hover.
- **Light cards:** solid white background with a soft drop shadow,
  subtle border that becomes accent-purple on hover.

**Transition:** The whole theme switch animates over 500ms via
`transition: background-color .5s, color .5s` declared on the
marketing-theme container.

**Pattern (extractable):** A scoped token override per page-type
(`[data-blog]`, `[data-course]`, etc.) is a clean way to theme
different sections independently. The `data-*` attribute on `<html>`
or `<body>` acts as the gating selector.

---

## 11. Typography scale

**Font families (declared in CSS `:root`):**
```
--default-font-family:    var(--font-be-vietnam-pro)
--default-mono-font-family: var(--font-jetbrains-mono, ui-monospace),
                            SFMono-Regular, "SF Mono", Menlo, Consolas,
                            "Liberation Mono", monospace
```

**Be Vietnam Pro** is the platform's primary font. It's a Latin-script
sans-serif designed by the same team behind Be typeface; it has
excellent Vietnamese diacritic coverage and is widely used by
Vietnamese tech products.

**JetBrains Mono** is the fallback for code blocks and inline code.
The cascade includes OS-native mono fonts (SF Mono, Menlo, Consolas)
as graceful fallbacks.

**Type ramp for blog index (Tailwind classes):**

The `.blog-content` reading-type ramp (body / H2 / H3 / H4 / inline
code / pre block / caption) is fully specified in §6 above. This
section adds only what §6 does not cover — the blog **index and
chrome** ramp that's distinct from the reading column:

|| Element | Class | Approximate size |
|---|---|---|---|
|| Hero H1 | `text-[40px] md:text-[60px] lg:text-[80px]` | 40/60/80px |
|| Section H2 (CTA) | `text-3xl md:text-4xl lg:text-[48px]` | 30/36/48px |
|| Card category badge | `text-sm leading-5` | 14px |
|| Card meta row | `text-xs leading-4` | 12px |
|| Card title | `text-sm font-semibold uppercase leading-5` | 14px ALL CAPS |
|| Card excerpt | `text-xs leading-[1.6]` | 12px |
|| Card CTA | `text-xs font-semibold` | 12px |
|| Filter chip | `text-sm font-normal` | 14px |
|| Sort button | `text-sm` | 14px |

**All-caps title typography:**
The blog card titles use `uppercase` — a strong brand choice. ALL
CAPS at 14px is unusual; it requires careful letter-spacing
adjustment to feel legible. The reference does **not** add extra
letter-spacing, which means Vietnamese diacritics (which are
taller than Latin letters) sit tightly. Works because the
`line-clamp-2` keeps titles to 2 lines max.

**Pattern (extractable):** `text-sm font-semibold uppercase
leading-5` is a fingerprint of the platform's card titles. Easy
to extract as a `<CardTitle>` component class.

---

## 12. Component patterns to extract

| Pattern | Source URL | Reusable as | Effort |
|---|---|---|---|
| Article card with image zoom + hover state | URL #1 | `<ArticleCard>` | ~30min |
| Post header (badge + H1 + meta row) | URLs #2-#6 | `<PostHeader>` | ~20min |
| `.blog-content` typography system (CSS) | URLs #2-#6 | `<BlogContent>` wrapper | ~1h |
| Code block (inline + `<pre>`) | URLs #4, #5, #6 | `<CodeBlock>` | ~15min |
| Blockquote (left accent border, italic, tinted bg) | URL #4 | `<Pullquote>` | ~10min |
| Bookmark embed (oEmbed-style card) | URLs #4-#6 | `<BookmarkCard>` | ~30min |
| Image with caption (`<figure>` + `<figcaption>`) | URLs #4-#6 | `<FigureWithCaption>` | ~10min |
| Category chip with active halo animation | URL #1 | `<CategoryChip>` | ~45min |
| Tag-star halo wrapper (active-state glow) | URL #1 | `<ActiveChipWrap>` | ~15min |
| Sort dropdown pill (button + chevron) | URL #1 | `<SortDropdown>` | ~20min |
| CTA section (H2 + lead + input form) | URL #1 | `<CTASection>` | ~30min |
| Hero with bloom + grid pattern + grain | URL #1 | `<BlogIndexHero>` | ~1h (already exists for homepage) |
| Footer with giant brand wordmark + mouse mask | URL #2 | (already exists site-wide) | — |
| Blog theme override (`[data-blog]` light-mode tokens) | All | `[data-blog]` styling | ~1h |

**Estimated total: ~6-7 hours** to template every reusable
component into a design-system folder.

---

## 13. Motion patterns (cross-reference course-detail §8)

The blog uses the **same motion vocabulary as the rest of the
platform**. Below is which of the four motion layers from
course-detail §8 apply to blog:

### Layer 1 — Pure CSS keyframes (tailwindcss-animate + custom)

Applied on blog:
- **`star-movement-top` / `star-movement-bottom`** — used by
  `.tag-star-top` / `.tag-star-bottom` (the active chip halo)
  and shared with `.next-course-star-*` / `.callout-star-*`.
  Duration: `6s linear infinite alternate` for the chip version
  (the `.tag-star-*` rule). Translation pattern: `translate(0%)`
  to `translate(100%)` (top) or `translate(-100%)` (bottom),
  fading opacity in/out.
- **`fade-in` / `fade-out`** — generic opacity transitions used
  by `view-transition-old/new(lesson-content)` (0.2s) and by
  the `.animate-fade-in` utility (.4s ease-out).
- **`spin` / `pulse` / `bounce`** — Tailwind built-ins, available
  but not specifically called out in blog markup.
- **`enter` / `exit`** — Radix-style enter/exit keyframes driven
  by `--tw-enter-*` / `--tw-exit-*` variables. Available for any
  Radix component (modals, dialogs, dropdowns).
- **`marquee`** — horizontal infinite scroll, declared but not
  visibly applied on blog pages.

**Reduced-motion guard:**
```css
@media (prefers-reduced-motion: reduce) {
  .tag-star-top, .tag-star-bottom { display: none; }
  .next-course-star-top, .next-course-star-bottom { display: none; }
  .quiz-glow-wrap:after, .quiz-glow-spotlight { display: none; }
}
```
The platform respects user motion preferences for the chip halos
and quiz glows — but **not** for the `star-movement-*` keyframes
on the active chip. This is a small a11y gap (see §16).

### Layer 2 — Framer Motion

**No Framer Motion references detected** in any of the 42 JS chunks.
This is consistent with the homepage spec — the platform does not
use Framer Motion. (Note: the blog index's "card hover" effects
are pure CSS — `transition-transform duration-500` + `:hover` on
the `<img>` — no React animation library needed.)

### Layer 3 — GSAP + ScrollTrigger

**Heavy GSAP usage detected across 10 chunks.** Aggregated
signatures from all chunks:
- `gsap.set`: 1075 occurrences (most common — declarative state
  management)
- `gsap.to`: 135 occurrences (timed animations)
- `gsap.timeline`: 118 occurrences (chained timelines)
- `gsap.fromTo`: 71 occurrences (explicit from + to)
- `gsap.from`: 35 occurrences (entrance animations)
- `gsap.kill`: 31 occurrences (cleanup)
- `ScrollTrigger`: 5 occurrences (minimal — scroll-tied animations
  are not the dominant pattern)

**Caveat:** GSAP is used heavily on the **course pages** for
scroll-pinned pain cards and similar. Its usage on **blog pages
specifically** is not separable from the shared chunk set. The
blog index's category-chip halos are pure CSS. The card hover
zoom is pure CSS. The filter row interactions are likely
React-state-driven without GSAP.

### Layer 4 — Lenis smooth scroll

**Lenis confirmed in 3 chunks** with `lerp: .1` and
`smoothWheel` semantics (interpolation factor 0.1, smooth wheel
scrolling). The same `lerp:.1` config appears across all 3
chunks, suggesting one shared Lenis instance.

**Behavior on blog:**
- Blog index: smooth scroll on the entire page (hero, card grid,
  CTA section all benefit from the smooth interpolation).
- Blog post: smooth scroll for the article body + related-posts
  section. The reading column itself scrolls inside the 768px
  container — which also benefits from Lenis's smooth wheel.

### View Transitions API

No `view-transition-name` on blog markup was observed. The lesson
pages use `view-transition-name:lesson-content` for cross-fade
navigation (cross-ref lesson-detail §8); blog pages do not have
this — navigating between posts is a regular page swap.

### Card hover motion

The card's image zoom (`scale-110` on `<img>`) is a CSS-only
motion via `transition-transform duration-500`. No JavaScript
involved. Pattern: cheap, performant, broadly compatible.

---

## 14. Comparison to current `nxhhuy.tech`

| Pattern | Current | Recommended next |
|---|---|---|
| Article card on index page | Plain card variant in `apps/web/components/article/` (`article-shell.tsx`, `article-view.tsx`; article CSS at `apps/web/components/article/article.css`) | Add `data-blog-card` attribute hook + hover-zoom + gradient bg (~45min). The `ArticleView` mount path is the right place — article chrome already lives there. |
| Post header (badge + title + meta) | Likely minimal in current article shell | Template `<PostHeader>` with the 3-line meta row (~30min) |
| Reading typography (`.blog-content` system) | Likely uses Tailwind `prose` or hand-rolled | Either: copy the CSS block (~1h), or convert to Tailwind utilities (~2h). The reference's 17px / 1.8 line-height is tuned for Vietnamese diacritics; for `nxhhuy.tech`'s English-only copy, 16px / 1.6 may sit closer to the existing article-chrome rhythm — measure before committing. |
| Blog-scoped color tokens | No `--blog-*` tokens | Add 15 `--blog-*` tokens for code/blockquote/badge/bookmark (~1h) |
| Light-mode `[data-blog]` card override | Likely uses generic theme tokens | Add the scoped override block to enable solid-white + drop-shadow on light mode (~30min) |
| Category chip with active halo | No chip component | Build `<CategoryChip>` with active/inactive states + `.tag-star-*` halo (~1h) |
| Filter row + sort dropdown | No filter UI (probably no tags yet) | Build `<FilterRow>` + `<SortDropdown>` only if tags are added (~1h combined) |
| Hero with bloom + grain | Hero component may exist (see homepage §2) | Reuse for blog index hero (~15min if shared) |
| Bottom CTA (phone-input capture) | Generic newsletter form likely exists | Adapt with `type=tel` if localizing to Vietnam, else keep email (~30min) |
| Related posts grid | Likely absent | Add `<RelatedPosts>` with 4-card grid + curated query (~1.5h including backend) |
| Footer with mouse-tracking wordmark | Site-wide footer exists | Reuse as-is |
| Reading column width (`max-w-[768px]`) | Probably wider currently | Set reading-viewport to 768px for prose-heavy routes (~5min) |
| No-share / no-TOC decision | (design call) | Match the reference's "no in-body share UI" if you want a clean reading experience |
| Theme transition (500ms color cross-fade) | Site-wide, may already exist | Verify and extend to blog content blocks |
| `prefers-reduced-motion` guard for star halos | (verify) | Add the `display:none` rule to your chip halo CSS, plus `animation: none` on `.tag-star-wrap` itself (the reference's existing guard hides the halos but leaves the chip-level `star-movement-*` keyframe running — incomplete a11y coverage). ~5min. |
| `[data-blog]` attribute on `<html>` | Not set; would need to be added in the blog route layout (`apps/web/app/[locale]/blog/layout.tsx`), not in `.marketing-theme` | Decide the gating selector location before implementation — `<html>`-level attribute scopes the override cleanly but couples blog routing to a theme concern. |

**Biggest opportunity:** the `.blog-content` typography system. It's
the most polished piece of the reference's blog design and would
immediately raise the perceived quality of long-form reading on
`nxhhuy.tech`. ~1h to copy the CSS, ~2h to refactor to Tailwind
utilities.

---

## 15. Prioritized action items

| Priority | Pattern | Source layer | Effort | Risk | Already on `nxhhuy.tech`? |
|---|---|---|---|---|---|
| **High** | `.blog-content` typography (CSS) | HTML + CSS | ~1h | None | Probably not — uses ad-hoc Tailwind |
| **High** | Blog-scoped color tokens (15 vars) | CSS | ~1h | Low (additive) | No `--blog-*` tokens |
| **High** | Light-mode `[data-blog]` card override | CSS | ~30min | None | No light-mode blog theme |
| **High** | Reading column `max-w-[768px]` | HTML + Tailwind | ~5min | None | Likely wider currently |
| **High** | Post header template (badge + H1 + meta) | HTML + Tailwind | ~30min | None | Likely missing |
| **Med** | Article card with hover-zoom + gradient bg | HTML + CSS | ~45min | None | Plain card variant likely exists |
| **Med** | Category chip + active halo (`.tag-star-*`) | HTML + CSS + keyframes | ~1h | Low (pure CSS) | No chip component |
| **Med** | Bottom CTA section with input capture | HTML + Tailwind | ~30min | Low | Generic newsletter form likely exists |
| **Med** | Related posts grid | HTML + backend | ~1.5h | Med (depends on content model) | Likely absent |
| **Med** | Hero with bloom + grain (blog index) | HTML + CSS | ~1h | None | Reuse from homepage if shared |
| **Low** | `[data-blog]` theme attribute on `<html>` | JS / SSR | ~15min | Low (page-type signal) | Site-wide theme likely already |
| **Low** | `prefers-reduced-motion` guard for halo | CSS | ~5min | None | Site-wide preference handling |
| **Low** | Sort dropdown (filter by date / category) | HTML + JS | ~1h | Med (needs filtering logic) | No filter UI yet |
| **Low** | Tag system (multi-tag, not just single category) | Backend + UI | ~4h+ | High (data model change) | Single category only |

**Recommended next session scope:** Top 5 "High" items (~3.5h) —
`.blog-content` typography, blog-scoped tokens, light-mode overrides,
reading column width, post header template. Lowest risk, highest
perceived quality impact.

---

## 16. Limitations and caveats

- **Single platform sampled:** Only one blog index + five posts.
  Patterns are not statistically validated. The post variation
  (0 → 43 code blocks, 9 → 30 images, 0 → 1 blockquote) shows
  that the design accommodates a wide range of content density;
  but other Vietnamese-language platforms may diverge on
  hierarchy of headings, badge placement, or excerpt length.
- **No JS execution:** The static HTML and CSS capture layout
  and styles, but anything that only manifests after hydration
  (filter dropdowns opening, theme toggles animating, search
  inputs becoming enabled) is inferred from class names and CSS
  rules. Actual interaction timing would require Playwright
  inspection.
- **No dark-mode toggle verification:** The HTML carries
  `data-blog` attributes and CSS has `:not(.dark)[data-blog]`
  overrides, but the toggle UI itself (sun/moon button) was
  not visible in the captured HTML — possibly rendered by a
  separate header component not present in the blog-index
  markup, or handled entirely in JS.
- **No mobile snapshot:** All patterns inferred from desktop
  HTML. The Tailwind responsive prefixes (`sm:`, `md:`, `lg:`)
  are documented; actual mobile rendering (touch targets, scroll
  behavior, viewport sizing) would require device emulation.
- **No accessibility audit:** Patterns were not evaluated against
  WCAG 2.2 AA. Concerns:
  - The `star-movement-*` keyframes do **not** have
    `prefers-reduced-motion` guards in the chip CSS
    (only `.tag-star-top/bottom` are guarded; the
    `animation: linear infinite alternate star-movement-top`
    on the chip itself is not).
  - Contrast of `--blog-accent` text on `--blog-pre-bg`
    background was not measured.
  - Blockquote italic + tinted bg may have insufficient contrast.
  - The 12px chip text might be below WCAG minimum for touch
    targets if chips become buttons.
- **No font loading verification:** "Be Vietnam Pro" is declared
  as `--default-font-family` in the CSS `:root`, but the
  `<link rel="stylesheet">` for Google Fonts was not located in
  the captured markup. Likely loaded via Next.js's font helper.
- **Vietnamese content:** All copy is in Vietnamese. The
  structural patterns are language-neutral; the typography
  choices (17px body, 1.8 line-height) are specifically tuned
  for Vietnamese diacritics and may need adjustment for
  English-only `nxhhuy.tech` content.
- **Lenis + GSAP usage attribution:** Both libraries are
  detected in the same JS chunks as the rest of the platform.
  Separating "blog-specific GSAP usage" from "course-specific
  GSAP usage" is not possible from the chunk analysis alone.
- **No comments system observed:** This is a deliberate
  design choice on the platform. If `nxhhuy.tech` wants
  comments (via Giscus, Disqus, or a custom system), the
  reference provides no pattern to copy.

---

## Appendix A: Reproduction recipe

To re-extract the same blog patterns for a different platform or
re-run this analysis on the same platform after changes:

```bash
# 1. Set up working directories
mkdir -p /tmp/blog-spec-assets/{html,js,css}

# 2. Fetch all pages in parallel (Safari UA needed — Firecrawl keyless 403s)
UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
cd /tmp/blog-spec-assets/html

URLS=(
  "https://<base>/blog"
  "https://<base>/blog/<post-1-slug>"
  "https://<base>/blog/<post-2-slug>"
  "https://<base>/blog/<post-3-slug>"
  "https://<base>/blog/<post-4-slug>"
  "https://<base>/blog/<post-5-slug>"
)

for url in "${URLS[@]}"; do
  fname=$(basename "$url" | tr -d '?' | head -c 60)
  curl -sL -A "$UA" -o "${fname}.html" "$url" &
done
wait

# 3. Enumerate unique static assets
grep -hoE '/_next/static/[^"]+\.(js|css)' *.html | sort -u > /tmp/blog-spec-assets/asset-urls.txt

# 4. Download each asset in parallel
BASE='https://<base>'
while read -r path; do
  fname=$(basename "$path")
  if [[ "$path" == *.js ]]; then
    curl -sL -A "$UA" -o "/tmp/blog-spec-assets/js/$fname" "${BASE}${path}" &
  else
    curl -sL -A "$UA" -o "/tmp/blog-spec-assets/css/$fname" "${BASE}${path}" &
  fi
done < /tmp/blog-spec-assets/asset-urls.txt
wait

# 5. Detect animation libraries
grep -l "framer-motion\|motion/react" /tmp/blog-spec-assets/js/*.js
grep -l "gsap\|ScrollTrigger" /tmp/blog-spec-assets/js/*.js
grep -l "lenis\|Lenis" /tmp/blog-spec-assets/js/*.js

# 6. Extract @keyframes from CSS
grep -hE "@keyframes [a-zA-Z0-9_-]+" /tmp/blog-spec-assets/css/*.css | sort -u

# 7. Extract blog-scoped CSS variables
grep -hoE "(--blog-[a-zA-Z0-9_-]+|--marketing-[a-zA-Z0-9_-]+):" \
  /tmp/blog-spec-assets/css/*.css | sort -u

# 8. Find [data-*] attribute hooks
grep -hoE 'data-[a-z][a-z-]*="[^"]*"' /tmp/blog-spec-assets/html/*.html \
  | sed -E 's/="[^"]*"//' | sort -u

# 9. Find card structure on index page
grep -oE '<a[^>]*data-blog-card[^>]*>.*?</a>' \
  /tmp/blog-spec-assets/html/blog.html

# 10. Extract the .blog-content typography CSS block
python3 -c "
import re, os
for cssf in sorted(os.listdir('/tmp/blog-spec-assets/css')):
    css = open(f'/tmp/blog-spec-assets/css/{cssf}').read()
    pos = 0
    while True:
        idx = css.find('.blog-content', pos)
        if idx == -1: break
        open_idx = css.find('{', idx)
        if open_idx == -1: break
        depth = 1; i = open_idx + 1
        while i < len(css) and depth > 0:
            if css[i] == '{': depth += 1
            elif css[i] == '}': depth -= 1
            i += 1
        print(css[idx:i])
        pos = i
"
```

---

## Appendix B: Honest disclosure

- **What I couldn't determine:**
  - Whether the "Lọc theo" (Filter by) dropdown's options are
    categories, tags, or sort orders — the markup doesn't render
    the menu in static HTML.
  - The actual interaction timing of the GSAP-animated elements
    (card hover-zoom is CSS-only, but if any GSAP-driven
    scroll-tied reveals exist on the blog index, their timings
    are not separable from course-page GSAP usage).
  - Whether the platform has an author archive page (no link
    from the meta row's author byline).
  - Whether the "Reading time" is computed at build time or
    runtime (rendered as static text).
  - The exact taxonomy structure (categories vs tags vs both).
- **What I guessed (and verified):**
  - That the dual-bg `padding-box` / `border-box` trick is used
    to render a gradient border on the active chip — confirmed
    by reading the inline `style=` attribute on the chip.
  - That the platform respects `prefers-reduced-motion` — confirmed
    via the `@media (prefers-reduced-motion:reduce)` rules in the
    CSS for `.tag-star-*` and `.quiz-glow-*`.
  - That the `.blog-content` is article-body-specific (vs page-level)
    — confirmed by the token scoping: tokens defined inside
    `.blog-content { ... }` only apply within elements that match
    that selector.
- **What was clear and unambiguous:**
  - The card markup structure (`<a data-blog-card>` + inner
    image-with-badge + meta + title + excerpt + CTA).
  - The post header composition (badge + H1 + 3-piece meta row).
  - The reading typography scale (17px body, 1.8 line-height,
    768px reading column).
  - The blog-scoped color token system (15 `--blog-*` tokens,
    light + dark variants).
  - The `data-blog="true"` attribute on `<html>` as the gating
    selector for blog-page theming.
- **Things I deliberately did not do:**
  - Did not render screenshots — would require Playwright/Chrome.
  - Did not execute JavaScript — would require browser automation.
  - Did not name the source platform in the body of the spec;
    referred to it as "the reference platform" throughout. The
    reproduction recipe in Appendix A names the URL pattern for
    reproducibility, but the body never references it.
  - Did not invent any values not present in the extracted
    HTML or CSS.

---

## Status

- **Drafted:** 2026-08-30
- **Reviewed:** No (sub-agent output, principal-engineer review pending)
- **Validated against `nxhhuy.tech`:** No (comparisons are inferential;
  no actual code inspection of `apps/web/components/article/`)
- **Vendor-neutrality verified:** Yes (0 hits for any reference site names)
