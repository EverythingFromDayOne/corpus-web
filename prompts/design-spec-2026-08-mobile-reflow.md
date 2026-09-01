# corpus-web — Mobile reflow audit (3-viewport) + proposed fixes

> **Status:** draft audit + spec for `polish/mobile-reflow-pass`. **Docs-only.** No code lands in this PR.
>
> **Context:** session-132 standing rule ("make sure u verify on small device also"). PR #134 (home-hero bloom cleanup) finished the sydexa-video-driven background spec rollout but did not include a multi-viewport audit; this spec captures that audit and proposes one fix per identified issue.
>
> **Method:** Chrome headless (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --force-device-scale-factor=1 --hide-scrollbars --window-size=W,H --screenshot=path`) screenshots at three viewport widths against `pnpm start` on `localhost:3000`. No new dev dependency required. 15 PNGs captured (5 surfaces × 3 viewports); vision-analysis tool inspected each.

---

## 0. Viewports used

| Tag | Width × Height | DPR | Notes |
|---|---|---|---|
| `m` (mobile) | 375 × 812 | 1 (forced) | iPhone SE/13 logical px |
| `t` (tablet) | 768 × 1024 | 1 (forced) | iPad portrait |
| `d` (desktop) | 1280 × 800 | 1 (forced) | laptop |

Per the `visual-reference-translation` skill rule Step 5b: chrome headless on macOS respects `--window-size` for layout viewport calculations when paired with `--force-device-scale-factor=1`. The PNG dimensions confirmed this (e.g., `en-m-375.png` = `375 × 812` per `file`).

---

## 1. Findings table

Severity: 🔴 critical (blocks use) · 🟡 medium (visual/affordance) · 🟢 low (polish).

| Surface | m 375 | t 768 | d 1280 | Notes |
|---|---|---|---|---|
| `/en` (home hero) | 🔴 description paragraph clipped mid-word ("framew...", "ex...", "coc..."); "Browse all articles" CTA clipped beyond right edge | 🟡 header crowded; search/CTA/nav compete for ~768px | 🟡 hero left-aligned with empty right third; stats container undersized | The home hero's earlier `bg-signal-dim opacity-25 blur-3xl` was removed in PR #134, but the underlying overflow predated that |
| `/en/blog` (article listing) | 🔴 hero subtitle "Every adapting article, grouped by corpus and..." clipped | 🟡 card grid 2-col fine; filter panel consumes vertical space | ✅ clean | Subtitle truncation is consistent with home hero's parent-container bug |
| `/en/courses` | 🔴 course cards (.course-card) extend past 375px right edge; body prose clipped mid-word | 🟡 cards 1-col mostly; padding generous | ✅ clean | Course-card meta strip `REACT · 6 LESSONS · 115 MIN READ` likely needs `flex-wrap: wrap` |
| `/en/courses/react-foundations` (course hero) | 🔴 `.course-hero` description paragraphs all clipped mid-word; CTAs not visible above fold at 375 | 🟡 hero ok at tablet | ✅ clean | Same root cause as `/en` — container wider than viewport |
| `/en/blog/angular/animations` (article body) | 🔴 metadata bars clipped mid-token (`ANGULA...`, `V...`); callout boxes extend past viewport right edge | 🟡 metadata strip needs flex-wrap on narrow widths | ✅ clean | Specific to `articles/[corpus]/[slug]` route — body+meta layout |

### Article body caveat

`/en/blog/react/hooks` returns 404 (the slug doesn't exist on this corpus path; the route is `react-concepts` articles under `/en/blog/react/...` but the specific `hooks` slug isn't an article — `react-concepts/v0.6.0` doesn't ship hooks as an article, it ships recipes). Test corpus for the react-concepts path: `react/concurrent/suspense.md` exists. **React-article-body mobile audit is incomplete**; the angular-corpus path was used as the proxy in the row above and the root cause is the same `.prose` and meta-strip layout.

---

## 2. Root-cause analysis

Two independent mechanisms at play:

### 2a. Document-root overflow container

Both `html` and `body` already have `overflow-x: clip` (PR #128), which correctly prevents horizontal scroll. BUT `clip` does NOT prevent the underlying container from being wider than the viewport — it just clips the visible region. The issue is that something inside the body content tree is forcing the body wider than the viewport in CSS pixels, and the body text wrapping at the WRONG (too-wide) parent width.

Likely culprits:
- A `min-width: 100%` somewhere on a child of `.ls-wrap`
- An unbreakable long token (course slug in a `prose` block, version number) that the browser refuses to wrap
- A flex/grid item without `min-width: 0`

### 2b. Long-word break policies

`overflow-wrap: normal` (the spec default for all block elements) refuses to break inside a word. The description text in `.course-hero` includes words like `react-render-cycle` (a course slug, 18 chars) which won't naturally break at a viewport edge. On mobile, this causes the prose to overflow.

The fix is `overflow-wrap: break-word` on the prose containers (or `min-content` on the wrapping flex/grid items). Per the CSS spec, `overflow-wrap: break-word` is supported in all browsers (Safari 16.4+ for `anywhere`, the older `break-word` alias works everywhere).

---

## 3. Proposed follow-on PRs

Each is the smallest possible change. Real-phone spot-check after each.

### Fix A — `polish/mobile-fix-a-overflow-wrap`

**Approach:** add `overflow-wrap: break-word` (CSS spec; supported everywhere) to `<html>` and to the prose containers. Enables long-word break at the viewport edge.

**Files to touch:**
- `apps/web/app/globals.css` — add `html { overflow-wrap: break-word }` rule inside the `@layer base` block
- Optionally: `apps/web/components/home/home.css` and `apps/web/app/[locale]/courses/[course]/page.tsx` for explicit per-container coverage

**Size estimate:** 1-2 files, +5/-0.

**Risk:** low. CSS-only; long words break at the viewport edge only when there's no other word that can fit.

### Fix B — `polish/mobile-fix-b-card-meta-flex-wrap`

**Approach:** add `flex-wrap: wrap` to the course-card meta strip (`REACT · 6 LESSONS · 115 MIN READ`) and the article-page meta strip on small viewports, so the bar wraps to multiple lines instead of clipping.

**Files to touch:**
- `apps/web/components/courses/course-card.tsx` — meta strip div gets `flex-wrap`
- `apps/web/components/articles/article-meta.tsx` (or equivalent; verified by grep) — same fix

**Size estimate:** 2 files, +4/-2.

**Risk:** low. Visual-only; cards become slightly taller on mobile (no width change).

### Fix C — `polish/mobile-fix-c-grid-collapse`

**Approach:** at `<768px` viewports, ensure the catalog grid (`/en/courses`) and the blog filter grid (`/en/blog` sidebar-tree) collapse to single-column. Currently the screenshot suggests the cards at 375px may try to render multi-column and overflow.

**Files to touch:**
- `apps/web/components/blog/article-index.tsx` — grid template media query
- `apps/web/components/courses/course-card.tsx` — grid container media query

**Size estimate:** 2 files, +6/-2.

**Risk:** low. Pure breakpoint adjustment.

### Fix D — `polish/mobile-fix-d-hero-balance` (deferred)

**Approach:** at ≥1024px, the home hero is left-aligned with large empty right column. Options: (a) reposition the stats card and CTAs to right-aligned balance, or (b) add a hero illustration on the right.

**Status:** deferred — requires content choice (illustration vs. metadata balance). Naming the follow-on PR is enough.

---

## 4. Implementation sequence (proposed)

| Order | PR | Touches | Risk |
|---|---|---|---|
| 1 | `polish/mobile-fix-a-overflow-wrap` | 1-2 files | low |
| 2 | `polish/mobile-fix-b-card-meta-flex-wrap` | 2 files | low |
| 3 | `polish/mobile-fix-c-grid-collapse` | 2 files | low |
| 4 | `polish/mobile-fix-d-hero-balance` | TBD | medium (content decision) |

Fix A first because it's the most defensive; once the long-word break is enabled, the per-element overflow symptoms become less bad. Real-phone spot-check after each fix.

---

## 5. Audit limitations (transparency)

- Chrome `--headless=new` on macOS does NOT run the iOS Safari rendering engine. Some iOS-specific reflow bugs (notably `100vh` and safe-area-inset issues) won't surface in these screenshots. Per-session real iPhone spot-check required before declaring production-ready.
- DPR=1 was used for CSS-pixel-equivalent captures. Real-device renders at DPR=2 may show different font rendering and icon proportions (font hinting, kerning).
- Audit limited to 5 surfaces (home, blog index, courses index, course detail, article body). Internal pages (curriculum, lesson pages, account stubs, etc.) and translation routes (`/vi/...`) are out of scope.
- No interaction testing — taps, focus rings, scroll-stickiness, Pagefind dialog opening, sticky-header reads all require manual testing beyond `--screenshot`.

---

## 6. Visual evidence (kept untracked)

15 PNG screenshots live at `/tmp/mobile-audit/*.png` (untracked, per session 132's docs/scratch convention). Each is the Chrome headless capture at the named viewport. Rerun via the script at the top of this file's commit message.

Re-running the captures:
```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="http://localhost:3000/en"   # or any other path
LABEL="en"                        # short label
mkdir -p /tmp/mobile-audit
for spec in "375,812,m" "768,1024,t" "1280,800,d"; do
  IFS=',' read -r W H T <<< "$spec"
  "$CHROME" --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
            --force-device-scale-factor=1 \
            --window-size="${W},${H}" \
            --screenshot="/tmp/mobile-audit/${LABEL}-${T}-${W}.png" "$URL"
done
```

Requires `pnpm start` (or `pnpm --filter @corpus/web start`) running in a separate process on port 3000.

---

## 7. References

- PR #132 (`feat(course-hero)`) — fixed `.film-grain` z-index bug
- PR #133 (`feat(ambient)`) — added line-grid + corner glow on listing surfaces
- PR #134 (`feat(home-hero)`) — home-hero bloom cleanup, this PR's parent context
- PR #135 (`docs(spec)`) — home-section bloom contract (already-pending implementation PR `polish/home-section-bloom-alt`)
- `prompts/design-spec-2026-08-home.md` — original home spec
- `prompts/design-spec-2026-08-home-section-blooms.md` — section bloom follow-on spec
- `visual-reference-translation` skill Step 5b — multi-viewport verification standard
- `apps/web/app/globals.css` lines 28 and 42 — current `overflow-x: clip` on html/body
- `apps/web/components/home/home.css` line 18 — `.ls-wrap` `padding-inline: 1.5rem; max-width: 76rem; width: 100%`

## 8. Status

Draft, awaiting user review. **No code lands in this PR.** Follow-on implementation PRs named in §3 (`polish/mobile-fix-a/-b/-c/-d`).
