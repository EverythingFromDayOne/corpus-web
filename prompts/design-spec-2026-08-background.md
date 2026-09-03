# Design spec — background approach (sydexa-video-driven) — 2026-09-02

> **Status:** Hypothesis-grade spec. Derived from sydexa.com video walk-through
> captured 2026-09-02 (43s, 60fps, Retina). Implementation must re-verify
> each claim against the shipped CSS before merging the corresponding code PR.
>
> **See also:** [`docs/scratch/sydexa-bg-analysis.md`](../../docs/scratch/sydexa-bg-analysis.md)
> — the analysis this spec was derived from (per-surface observations from
> the video, mapping table, rejection list, failure-mode call-out).

## 0. Goal

Bring our site background treatment into the same **calm, layered,**
**rule-based** shape sydexa uses across its public surfaces. Specifically,
fix three observed gaps:

1. **`.course-hero` "dirty CRT screen"** — film-grain overlays bloom gradients
   and reads as visual noise, not texture. (Session 132 user feedback.)
2. **`.ls-hero` is the most-treated surface on `/en`** — film-grain plus a
   single `bg-signal-dim opacity-25` bloom is busy without a unifying rule.
   The grains + the bloom fight each other.
3. **`/en/courses` and `/en/blog` have no treatment at all** — flat dark
   canvas, no visible texture, no focal glow. Inconsistent with `/en`'s
   (overtreated) and with sydexa's consistent-per-surface pattern.

The fix is **additive depth, not additive layers**: introduce a faint
line-grid SVG overlay (sydexa's blueprint texture) and a single corner glow
on the listing surfaces, then **dial back** the overtreated surfaces to
match.

## 1. Three rules (the unifying shape)

These three rules apply to **every shipped surface** of the site. If a future
feature adds a new surface, it must conform:

### Rule 1 — Dark navy canvas, no cream default
The page background is `--color-ink` (`#0e141b` dark, `#f4f6f9` light).
No surface ever introduces a parallel palette or replaces this base.
Already shipped; this spec just re-asserts it.

### Rule 2 — One quiet accent glow per surface, off-center anchor
Each surface has at most **one** decorative radial-gradient or
CSS-bloom element. Anchored to a corner or off-center edge so it does not
align with the page's H1/H2 weight. Opacity range: 12%–30% depending on
surface kind (hero: 18%, listing: 14%, detail: 22%).

The accent colour is **role-differentiated**, not always-amber:

- **Warm** (signal/amber) — for "active / press / focus" affordances. PR
  #116 already uses this for per-section blooms on `/en`.
- **Cool** (`--color-cool`) — for "ambient depth / calm" glows on listing
  surfaces and the new corner glow. **NEW** — see §3.

The Rule 2 accent set must NOT add a third colour. We do not introduce a
purple/violet token to "match sydexa". The point of the mapping is
*structural* (one focal glow per surface), not *literal* (we are not
becoming purple).

### Rule 3 — Faint line-grid overlay, ≤10% opacity, single SVG
A single data-URI SVG line-grid background, applied at **≤10% opacity** as
a `background-image` on hero/listing wrappers. Not animated. Not a
multi-layer pattern. The grid is **one image**, **one declaration**, used
**everywhere that needs it**.

The SVG must:
- Be **2KB or smaller** (data-URI inline)
- Use `--color-graphite` as the line colour (CSS `currentColor`-friendly
  via inline `<svg style="color: ...">` if needed)
- Have a tile size of ~24×24px so the grid reads as "blueprint" not "graph paper"
- Carry `aria-hidden="true"` — pure decoration

The grid replaces `.film-grain` on the home hero (see §4 step 2) and is
**not** added to surfaces that lack texture today (course detail inner
sections, articles, lesson pages — those stay calm dark).

## 2. Per-surface visual contract (current → proposed)

| Surface | Current shipped (2026-08-31, PR #130) | Proposed |
|---|---|---|
| **`.course-hero`** | `film-grain` (SVG noise, `opacity: 0.075` overlay) + 2 bloom divs. Reads as "dirty CRT" per session 132 user feedback. | Drop `film-grain` className (already committed in `polish/course-hero-grain-removal @ 58ead66`). Keep both bloom divs at lower opacity (30% → 22% on warm, 26% → 18% on cool). |
| **`.ls-hero` on `/en`** | `film-grain` + 1 `bg-signal-dim opacity-25 blur-3xl` bloom + 1 large bloom inside `.ls-wrap`. Three layers total. | Drop `film-grain`, add the line-grid (Rule 3) at 8% opacity. Replace the single `bg-signal-dim` bloom with one warm-bloom (already inside `.ls-hero::before` per PR #120) + keep `.ls-hero::after` cool bloom. Net: 2 decorative elements (1 grid + 1 bloom) instead of 3. |
| **`.blog-layout` (pane side of `/en/blog`)** | Flat dark via `body`. No background. | Add the line-grid at 6% opacity (less than home — pane has cards in front). Add a **mid-right cool corner glow** (Rule 2 cool variant) at 14% opacity. |
| **`/en/courses` top** | Flat dark. No background. | Add the line-grid at 6% opacity. Add a **mid-right cool corner glow** at 14%. Cards (`.course-card`) absorb the glow; cards do not need their own background change. |
| **`/en/blog/[corpus]/[slug]` article body** | Already calm dark via `.blog-content` tokens (PR #115, design-spec blog §10/§15). No change. | No change. Already matches the rule. |
| **`/en/courses/[course]` body sections (Promise / Benefits / Curriculum)** | Flat dark, per-section blooms only on `/en`. | Add **per-section blooms** mirroring the PR #116 pattern (warm/cool alternation, corner-anchored, low opacity). This was previously auto-deferred because the course detail page already has hero blooms; rule is "one accent glow per region" and the per-section blooms carry the rule on the body. |

## 3. Tokens to add (the `cool` accent for ambient depth)

We already have `--color-cool: #6aa9d8` and `--color-cool-soft: #a4c6e0`
and `--color-cool-dim: #2c4659` (PR for D28). This spec adds **two**
thin wrapper tokens so the rule is grep-discoverable:

```css
/* in packages/ui/src/tokens.css, under --marketing-accent-* block */

--ambient-cool-glow: var(--color-cool-soft);     /* dark theme */
--ambient-cool-grid:  var(--color-graphite);     /* dark theme */

:root[data-theme='light'] {
  --ambient-cool-glow: var(--color-cool);
  --ambient-cool-grid: var(--color-graphite);
}
```

Naming convention follows PR #111's `--marketing-accent-*` family:
**role-named, not colour-named**. Future agents grepping for "ambient" or
"calm" find these.

## 4. Implementation phasing (three PRs)

**PR 1 — `polish/course-hero-grain-removal` (already cut, branch in tree)**

Already exists at `polish/course-hero-grain-removal @ 58ead66`, off
`develop @ 2f4f6b2`. Two files, +5/−10. Drops `film-grain` from
`.course-hero`. All gates already green on the parent commit. Rebase,
push, open PR, merge via `--admin` once post-session README says go.

**PR 2 — `docs/sydexa-bg-analysis-spec` (this file + the analysis doc)**

Docs-only PR. Re-asserts the spec §0–§4 written here, plus links to
`docs/scratch/sydexa-bg-analysis.md`. No code changes. The "Plan notes"
field in the PR description explicitly calls out: "review pass before
any code lands."

**PR 3 — `polish/grid-overlay-and-corner-glow`**

The mechanical port of this spec:

- **`apps/web/app/globals.css`** — add the line-grid CSS rule (Rule 3) +
  the corner-glow CSS rule (Rule 2 cool). Tokens resolved from
  `--ambient-cool-grid` and `--ambient-cool-glow`.
- **`packages/ui/src/tokens.css`** — add the two `--ambient-cool-*` tokens
  in both dark + light blocks.
- **`apps/web/app/[locale]/page.tsx`** — remove `film-grain` from
  `.ls-hero` className (mirrors PR 1).
- **`apps/web/app/[locale]/courses/[course]/page.tsx`** — already clean
  per PR 1; verify on rebase.
- **`apps/web/components/blog/article-index.tsx`** — apply the new
  background rule to `.blog-pane` (the right-hand side of the blog grid).
- **`apps/web/app/[locale]/courses/page.tsx`** — apply the same
  background rule to the courses-listing wrapper.

No i18n keys. No new components. No deps.

### Verification per PR (per the visual-reference-translation skill, Step 5)

For PR 3 specifically:
1. `pnpm typecheck` (5/5 expected)
2. `pnpm build` (no warnings, Pagefind 222/unchanged)
3. `pnpm verify:prerender` (196/196 + 18/18 unchanged)
4. `pnpm verify:frontmatter` (196/196 unchanged)
5. HTML probe `curl /en/courses | grep -c 'grid-overlay'` (expect ≥1)
6. HTML probe `curl /en/blog | grep -c 'grid-overlay'` (expect 1 on pane)
7. CSS bundle probe — confirm the new class rule appears in the
   `_next/static/chunks/*.css` bundle
8. Real-phone spot-check (user opens develop.nxhhuy.tech on their phone) —
   the canonical gate per corpus-web, can't be auto-verified.

## 5. What this spec explicitly does NOT touch

- **Article body styling** — `.blog-content` is already calm (PR #115,
  design-spec blog §15) and matches the calm-dark pattern. No change.
- **Search dialog** — full-screen modal, opaque background; no surface
  treatment would be visible. No change.
- **Footer** — already flat. No change.
- **Course-detail body blooms** — explicitly deferred to a follow-on
  spec/§6 if the user flags the course-detail body as needing the
  per-section bloom treatment PR #116 did for `/en`. Not in this spec.
- **Card surfaces** — already bloom + gradient (PR #115). No change.
- **Topbar** — already backdrop-blur (PR #114). No change.
- **3D illustrations / illustrated thumbnails / paywalls / pricing /
  Vietnamese copy** — out of bounds per visual-reference-translation
  skill, `.cursor/rules/20-never-violate.mdc`, and roadmap §16 Q2/Q3.

## 6. Out of scope in this commit (recorded for follow-on sessions)

- **Animated gradient** — sydexa's "synthwave/cyberpunk" reading on
  `/courses/advanced-sql` hero has subtle motion. We **deliberately do
  not animate** the corner glow (CSS transitions + prefers-reduced-motion
  already govern our surface). Adding ambient motion would cross the
  stop-and-ask threshold for new ambient animation.
- **3D / low-poly hero backdrop** — sydexa uses 3D illustrations of B-Tree
  nodes. We have no such assets and would not invent them. Out of bounds.
- **Particles / sparkle layer** — sydexa's FAQ section uses a particle
  texture. We don't have the SVG. Out of bounds unless a user asks.
- **Course-detail hero bloom refinement** — the blooms on
  `/en/courses/[course]` after PR #117 are two-bloom aurora (warm right
  + cool left). PR 1 in this spec dials them back by reducing opacity,
  not by replacing. If the user later wants the wider silhouette change,
  that's a separate PR with its own spec.

## 7. Invented decisions

- **Two new tokens** (`--ambient-cool-glow`, `--ambient-cool-grid`)
  rather than reusing `--marketing-accent-*` directly. Reason: the
  `marketing-accent-*` family is "active/press/CTA" semantics; ambient
  bloom + grid are "calm/depth/page" semantics. Same word family
  (`ambient-*`) makes grep parity work and prevents future PRs from
  accidentally reusing a marketing token for ambient background
  purposes.
- **Single line-grid SVG**, not a per-surface gradient + grid combination.
  Reason: the sydexa reading is "grid is the texture", not "grid is one
  of three layers". One image, one rule, one place to grep.
- **No animation on the glows.** Sydexa's hero probably animates the
  glow, but we don't on our site (memory rule + `prefers-reduced-motion`
  is the default we ship). Keeping that consistent matters more than
  matching sydexa literally.
- **The corner glow anchor** — chose **mid-right** (not top-right) to
  match PR #116's per-section bloom convention. Different per-surface
  corners so successive glows don't stack on the same axis.
- **Grid texture replaces film-grain entirely** (no coexistence). Mixing
  grain + grid reads as "trying too hard". The brief was "sydexa's
  background approach", and sydexa has grain-as-substitute not
  grain-alongside.

## 8. Hard constraints this spec must respect

- `.cursor/rules/20-never-violate.mdc` — no personal content, no
  invented pricing, no locale-mixing (we are English-only).
- Roadmap §16 Q2 (English-only), §16 Q3 (non-commercial), §16 Q5 (no
  video / no animated media beyond SVG motion).
- `packages/ui/DESIGN.md` is the design source of truth; this spec
  records a **role extension** (ambient vs marketing accent) within
  the existing token family, not a new palette. SPEC.md update
  referenced in PR description.
- `docs/DEBT.md` D41 will be opened at PR 2 close: "Film-grain
  on home hero reads as visual noise (sydexa-video audit, 2026-09-02)".
  D41 has no fix in this PR cycle — it's the residue that PR 3 closes.

## 9. Failure modes I'm pre-empting

- **Mobile (≤480px) legibility** — the grid is at 8% opacity, so
  text-overlay contrast is unaffected. Real-phone spot-check on
  develop.nxhhuy.tech is the canonical gate.
- **`overflow-x: clip` on `body` (PR #128)** — background `background-image`
  on `.blog-pane` will be visible across the pane's natural width;
  won't break sticky because the pane grid is `grid-template-columns:
  320px 1fr`, not full-bleed. Will verify in PR 3.
- **`z-index: -1` film-grain trap** (already closed by PR #130) — the
  new grid lives on `background-image`, not pseudo-element, so the
  trap doesn't apply. Real-phone verification still required.
- **Chrome headless retina viewport pitfall** — visual-mobile verification
  cannot trust Chrome `--window-size`. Real phone or iframe required
  per the skill's Step 5b.
