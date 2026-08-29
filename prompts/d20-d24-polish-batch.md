# Polish session — D20–D24 design-spec polish batch

**Branch:** off `develop`, PR to develop. Promote to main after Vercel Preview
verified.

**Scope:** ship the top 5 polish items from the four design specs
(`prompts/design-spec-2026-08{,-lessons,-blog,-home}.md`) as a single
PR with one commit per item. Lowest-risk, highest-perceived-impact
items from the action-items table. Items are ordered by effort × risk.

**Reference specs (READ BEFORE EDITING):**
- `prompts/design-spec-2026-08.md` — course-detail + motion stack
- `prompts/design-spec-2026-08-lessons.md` — lesson-detail
- `prompts/design-spec-2026-08-blog.md` — blog index + post
- `prompts/design-spec-2026-08-home.md` — homepage

## Background

Four vendor-neutral design specs were authored 2026-08-29 covering the
reading surface. They pair current `nxhhuy.tech` code references with
extracted patterns and prioritize action items. This prompt ships the
five lowest-risk, highest-impact items as a single PR.

The design system already has the tokens we need:
- `--color-signal` (accent), `--color-signal-soft`, `--color-signal-dim`
  (see `packages/ui/src/tokens.css`).
- Tailwind v4 utilities auto-mapped from `@theme`: `bg-signal`,
  `text-signal`, `border-signal`, `bg-surface`, `border-graphite`,
  `text-display`, `text-muted`.
- Motion tokens: `--ease-out`, `--duration-fast/base/slow`.

**Hard rules (from `.cursor/rules/20-never-violate.mdc`):**
- NO inline styles or raw hex values. Tailwind v4 utilities only.
- NO changes to `globals.css` color tokens (the three-tier refactor is
  a breaking change, deferred to a separate session).
- NO Framer Motion / GSAP / Lenis integration. CSS-only polish.
- NO changes to `content/*` submodules.
- NO changes to the locked rules in `.cursor/rules/`.

## Item 1 — Section divider (line + dot + label + dot + line)

**Effort:** ~30min. **Risk:** None.

**Pattern from `design-spec-2026-08-home.md` §7:** reusable section
anchor — a horizontal row of "line + glowing dot + label + glowing dot +
line" used between major sections.

**Files:**
- NEW: `apps/web/components/section-divider.tsx`
- MODIFIED: `apps/web/messages/en.json` (add `section.dividerLabel` key)

**Component shape:**

```tsx
// apps/web/components/section-divider.tsx
type Props = {
  label: string;
  className?: string;
};

export function SectionDivider({ label, className }: Props) {
  return (
    <div
      role="separator"
      aria-label={label}
      className={`flex items-center justify-center gap-3 text-sm text-muted ${className ?? ''}`}
    >
      <span
        aria-hidden="true"
        className="h-px w-16 rounded-full bg-gradient-to-r from-transparent to-graphite"
      />
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full bg-graphite"
      />
      <span className="meta">{label}</span>
      <span
        aria-hidden="true"
        className="h-1 w-1 rounded-full bg-graphite"
      />
      <span
        aria-hidden="true"
        className="h-px w-16 rounded-full bg-gradient-to-l from-transparent to-graphite"
      />
    </div>
  );
}
```

**i18n key (add to `apps/web/messages/en.json` under existing `article`
block):**

```json
"sectionDividerLabel": "Continue reading"
```

Use a phrase that fits the corpus tone. Verify with
`grep -ciE '\b(sydexa|100 days|ng-|nxhhuy@|vercel|tailwind)\b'` on the
modified file returns 0.

**Usage in `apps/web/app/[locale]/page.tsx` (home page):** between the
hero and the first section, render `<SectionDivider label={t(messages, 'article.sectionDividerLabel')} />`.
Read the file first to find the natural insertion point (between the
`<header>` and the first `<section>`).

**Accessibility note:** The component is a `<div role="separator">` with
`aria-label`. Decorative line/dot spans are `aria-hidden`. This matches
the established pattern of `.meta` for chrome (see `apps/web/app/globals.css` line 108).

## Item 2 — Hero bloom + gradient text (course-detail page)

**Effort:** ~1h. **Risk:** Low. **Source spec:** `design-spec-2026-08.md` §2.

**Pattern:** A soft glow behind the hero H1, plus gradient text fill on
emphasized words.

**File:** `apps/web/app/[locale]/courses/[course]/page.tsx`

**Current code** (lines 114–116):
```tsx
<header className="mt-6">
  <h1 className="text-4xl">{course.title}</h1>
  <p className="mt-4 max-w-[var(--measure-prose)]">{course.description}</p>
```

**New code shape:**
```tsx
<header className="relative mt-6 overflow-hidden">
  <div
    aria-hidden="true"
    className="pointer-events-none absolute -inset-x-12 -inset-y-8 rounded-full bg-signal-dim opacity-25 blur-3xl"
  />
  <h1 className="relative text-4xl">
    {/* Gradient applied to the LAST WORD if it's < 12 chars;
        otherwise to the whole title. Use a simple heuristic:
        if (lastWord.length <= 10) wrap it in <span>. */}
    {course.title}
  </h1>
  <p className="relative mt-4 max-w-[var(--measure-prose)]">{course.description}</p>
```

**Bloom color decision:** use `bg-signal-dim` (the softest signal tier)
at 25% opacity, blur 3xl. This preserves dark-theme contrast — the
existing dark theme has `--color-ink: #0e141b` ground; the bloom is a
subtle warm haze, not a saturated glow. The reference site uses purple
but the discipline in `packages/ui/src/tokens.css` says "the accent.
Provenance and current position ONLY. Never a general-purpose button
colour, never a large fill" — so use signal-dim, NOT the saturated
signal color.

**Gradient text:** For this initial ship, do NOT split the title into
wrapped words. The complexity (locale-aware word splitting, RTL support,
length heuristics) is not worth the perceived benefit. If you want to
demo gradient text, apply it to the WHOLE H1 with
`bg-clip-text text-transparent bg-gradient-to-b from-display to-signal`.
Verify the contrast on the dark ink ground meets WCAG AA (3:1 for large
text). If the gradient drops contrast below threshold, fall back to
plain `text-display`.

**Decision tree (pick one based on contrast check):**
1. Apply `bg-gradient-to-b from-display to-signal bg-clip-text text-transparent`
   to the whole `<h1>`. Verify visual contrast in browser.
2. If contrast fails, fall back to plain `text-display` with the bloom
   behind it (no gradient text). Document the decision in the PR body.

**Files NOT to touch:** the `<CurriculumList />` component, the page's
breadcrumb nav, the CTA buttons. Bloom is a hero-only effect.

## Item 3 — Card hover accent (blog + course cards)

**Effort:** ~30min. **Risk:** None. **Source spec:** `design-spec-2026-08-blog.md` §5.

**Pattern from spec:** cards gain a subtle "lift" or "accent bar
appearance" on hover. The reference site uses `group-hover:scale-110`
on image-bearing cards. Our cards are text-only, so substitute with a
**left-border accent** that slides in on hover.

**Files:**
- MODIFIED: `apps/web/components/blog/article-index.tsx` (lines 80–95)
- MODIFIED: `apps/web/components/courses/course-card.tsx` (lines 19–34)

**Current blog card (article-index.tsx line 85):**
```tsx
className="border-graphite bg-surface hover:border-muted block rounded-md border p-4 no-underline"
```

**New shape:**
```tsx
<li key={article.uid} className="relative">
  <span
    aria-hidden="true"
    className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 rounded-full bg-signal transition-transform duration-300 group-hover/scale-y-100"
  />
  <a
    href={articlePath(locale, article.repo, article.articleId)}
    className="group border-graphite hover:border-signal bg-surface relative block rounded-md border p-4 pl-5 no-underline transition-colors duration-300"
  >
    {/* existing content unchanged */}
  </a>
</li>
```

**Current course card (course-card.tsx line 22):**
```tsx
className="border-graphite bg-surface hover:border-muted block rounded-md border p-6 no-underline"
```

**New shape:** same pattern as the blog card, with `p-6 pl-7` (more
padding to match the larger card).

**Why left-border accent instead of `scale-110`:** our cards have no
images to scale. A sliding accent bar is the cheapest visual upgrade
that works on text-only cards. It also signals which card is focused
when tabbing through.

**Why `group/scale`:** Tailwind v4 uses the `group/scale` syntax
(different from a regular `group`). This is correct — the parent `<a>`
carries `group`, and the `<span>` child uses `group-hover/scale-y-100`
to scope the hover to the parent.

**Verify:** the `group/scale` syntax requires Tailwind v4. Confirm
`package.json` lists `tailwindcss: ^4.x`. If it doesn't, use plain
`group-hover:scale-y-100` instead.

## Item 4 — Film-grain noise overlay (CSS layer, opt-in)

**Effort:** ~30min. **Risk:** None. **Source spec:** `design-spec-2026-08-home.md` §2.

**Pattern:** SVG data-URI fractalNoise overlay with `mix-blend-overlay`
at 0.075 opacity, used as a decorative texture layer on hero/section
backgrounds.

**File:** MODIFIED `apps/web/app/globals.css` (append a new `@layer`
block at the end).

**CSS to append:**
```css
/* Film-grain noise overlay — opt-in via `.film-grain` class.
   Decorative texture for hero/section backgrounds. */
.film-grain {
  position: relative;
  isolation: isolate;
}

.film-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  opacity: 0.075;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}
```

**Usage:** Add `film-grain` to the `<header>` class in
`apps/web/app/[locale]/courses/[course]/page.tsx` (the same one
modified in Item 2). The class is opt-in — only the course-detail page
ships with it for this PR. The blog post page and home page get it in
future iterations.

**Why `opacity: 0.075` not 0.5:** the reference site uses 0.5 with
mix-blend-soft-light. Our dark theme needs subtler noise to avoid
washing out the signal bloom (Item 2). 0.075 is the floor — anything
higher competes with the bloom for visual attention.

**Why `isolation: isolate`:** prevents the noise from blending into
elements OUTSIDE the `.film-grain` container (z-index/flex children,
etc.).

## Item 5 — Share buttons (Facebook + Twitter / X)

**Effort:** ~1.5h. **Risk:** Low (small new component, i18n keys,
URL building). **Source spec:** `design-spec-2026-08-blog.md` §16.

**Pattern:** Two icon buttons at the top of blog post content,
linking to Facebook and Twitter share URLs.

**Files:**
- NEW: `apps/web/components/share-buttons.tsx`
- MODIFIED: `apps/web/messages/en.json` (add `share.facebook`,
  `share.twitter`, `share.label`)
- MODIFIED: `apps/web/components/article/article-view.tsx` (insert
  `<ShareButtons>` after the H1 at line 135)

**Component shape (`apps/web/components/share-buttons.tsx`):**

```tsx
type Props = {
  url: string;
  title: string;
  locale: Locale;
  messages: Messages;
};

export function ShareButtons({ url, title, locale, messages }: Props) {
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const tw = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <div
      role="group"
      aria-label={t(messages, 'share.label')}
      className="mt-4 flex flex-wrap gap-2"
    >
      <a
        href={fb}
        target="_blank"
        rel="noopener noreferrer"
        className="border-graphite hover:border-signal text-muted hover:text-signal inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm no-underline transition-colors duration-200"
      >
        <span aria-hidden="true">f</span>
        <span>{t(messages, 'share.facebook')}</span>
      </a>
      <a
        href={tw}
        target="_blank"
        rel="noopener noreferrer"
        className="border-graphite hover:border-signal text-muted hover:text-signal inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm no-underline transition-colors duration-200"
      >
        <span aria-hidden="true">𝕏</span>
        <span>{t(messages, 'share.twitter')}</span>
      </a>
    </div>
  );
}
```

**i18n keys (add to `apps/web/messages/en.json`):**
```json
"share": {
  "label": "Share this article",
  "facebook": "Share on Facebook",
  "twitter": "Share on X"
}
```

**Insertion in `article-view.tsx`:** after the H1 at line 135, before
the article body. The `url` and `title` props come from the
`ArticleViewProps` — check the existing prop signature (lines 28–48)
to see how `article.url` or similar is constructed. If `article.url` is
not in scope, compute it from `SITE_ORIGIN` + `articlePath(...)` in the
page that calls `<ArticleView>` and pass it as a new prop.

**Why text+icon, not icon-only:** `Icon-only buttons fail WCAG 2.2
SC 2.5.3 Label in Name` if the icon has no programmatic name. Text
labels keep the screen-reader experience simple and don't require
adding icon assets to the repo. The leading `f` / `𝕏` are
`aria-hidden="true"` decorative runs.

**Why `target="_blank"` + `rel="noopener noreferrer"`:** standard
security hygiene for opening share dialogs in a new tab. The `noopener`
prevents the new tab from accessing `window.opener` (reverse tabnabbing
defense).

## Verification gate (do not skip)

After all five items:

1. `pnpm typecheck` — green (no new errors introduced).
2. `pnpm verify:frontmatter` — green (196/196 articles adapt).
3. `pnpm verify:links` — pre-existing D38 content-half failure is
   expected (NOT caused by this PR). Triage per the cursor-slack-relay
   skill.
4. `pnpm --filter @corpus/web build` — green.
5. `pnpm verify:prerender` — green; 181 blog + 12 lesson HTML files
   under `.next/server/app`.
6. **Manual visual smoke** (cannot be automated; state "verified
   visually" in the PR body if you cannot test):
   - Open `/en/courses/react-render-cycle` — hero bloom visible behind
     the H1; H1 readable.
   - Open `/en/blog` — section divider visible between hero and
     listing; blog article cards show accent bar on hover.
   - Open `/en/blog/react/suspense` (or any adapting article) — share
     buttons visible above the body; clicking opens Facebook / X
     share dialog in a new tab with the correct URL pre-filled.
7. **Manual keyboard smoke:**
   - Tab through the blog cards; confirm the accent bar appears on
     `:focus-visible` (the existing focus ring still applies).
   - Tab through the share buttons; confirm the existing
     `:focus-visible` outline (defined in tokens.css line 86) renders.

If any of the manual checks cannot be performed, state that in the PR
body under "Known limitations" — do not silently skip.

## Invented decisions

- **Section divider is a `<div role="separator">`, not an `<hr>`.**
  `<hr>` is a thematic break between prose paragraphs; a "section
  divider with a label" is more semantic as a labeled separator. The
  `aria-label` carries the section name for screen readers.
- **Bloom is `signal-dim` at 25%, not `signal` at any opacity.** The
  design discipline in `packages/ui/src/tokens.css` says signal is for
  provenance and current position only — never a large fill. Using
  `signal-dim` (the softest tier) at low opacity respects that
  constraint.
- **Card hover is a left-border accent, not `scale-110`.** The
  reference site uses scale-110 on image-bearing cards. Our cards
  have no images. A sliding accent bar is the cheapest visual
  upgrade that works on text-only cards.
- **Film-grain opacity is 0.075, not 0.5.** The reference site uses
  0.5 with mix-blend-soft-light, but that's on a brighter background.
  Our dark theme (#0e141b ink) needs subtler noise to avoid
  competing with the bloom from Item 2.
- **Share buttons are text+icon, not icon-only.** Icon-only buttons
  fail WCAG 2.2 SC 2.5.3 Label in Name. Text labels keep the
  experience accessible without adding icon assets.
- **Share buttons open in a new tab with `noopener noreferrer`.**
  Standard security hygiene for share dialogs.
- **Items ship as 5 separate commits in one PR.** Easier to review
  and revert individually. See "Commit convention" below.

## Known issues / next steps

- D38 content-half (44 unresolved refs in nextjs/nestjs submodules)
  remains. Unrelated to this PR.
- D19 real impl (axe-core + Lighthouse CI) remains blocked on a
  design call about the WCAG 2.2 `target-size` rule and the rail's
  18×2px ticks.
- Three-tier accent tokens (`accent-deep`, `accent-bloom`) are
  deferred to a separate session — the refactor is breaking and needs
  a separate PR.
- Lenis smooth scroll (~5KB) is the next high-impact polish item
  but requires a separate session because it's a new dependency.

## Files in scope for this PR

- NEW: `apps/web/components/section-divider.tsx`
- NEW: `apps/web/components/share-buttons.tsx`
- MODIFIED: `apps/web/messages/en.json` (add section/share keys)
- MODIFIED: `apps/web/app/[locale]/page.tsx` (use SectionDivider)
- MODIFIED: `apps/web/app/[locale]/courses/[course]/page.tsx`
  (hero bloom + film-grain)
- MODIFIED: `apps/web/components/blog/article-index.tsx`
  (card hover accent)
- MODIFIED: `apps/web/components/courses/course-card.tsx`
  (card hover accent)
- MODIFIED: `apps/web/components/article/article-view.tsx`
  (share buttons after H1)
- MODIFIED: `apps/web/app/globals.css` (append `.film-grain` layer)

## Files explicitly NOT in scope

- `content/*` — submodules, hard rule.
- `packages/ui/src/tokens.css` — three-tier refactor deferred.
- `apps/web/components/article/sidebars.tsx` — D18 already shipped;
  no further changes here.
- `apps/web/components/article/article-shell.tsx` — leave alone.
- `apps/web/components/article/toc-rail.tsx` — out of scope.
- `apps/web/components/chrome/*` — chrome layer separate.
- Any new npm dependencies — none required for this batch.

## Commit convention

Five commits, in this order, in the PR:

1. `feat(polish): add reusable SectionDivider component (D20 item 1)`
2. `feat(polish): add hero bloom to course-detail page (D20 item 2)`
3. `feat(polish): add hover accent bar to blog + course cards (D20 item 3)`
4. `feat(polish): add film-grain noise overlay utility (D20 item 4)`
5. `feat(polish): add share buttons to blog articles (D20 item 5)`

Each commit must pass `pnpm typecheck` on its own. Don't bundle them
into one mega-commit — easier to review and easier to revert
individually if an item turns out to misbehave.

PR title: `feat(polish): design-spec polish batch (D20 items 1–5)`

PR body should reference `prompts/design-spec-2026-08{,-lessons,-blog,-home}.md`
as the design source of truth and link to this prompt file:
`prompts/d20-d24-polish-batch.md`.
