# corpus-web — Home-page section bloom contract (per-section ambient)

> **Status:** draft extension to `prompts/design-spec-2026-08-home.md` §8 ("Background aurora (whole-page decoration)"), narrowed from the original spec's "Gap: no per-section blooms" annotation.
>
> **Authority:** this file is a **follow-on spec** that closes one of the gaps named in the sydexa-video-driven background spec (`prompts/design-spec-2026-08-background.md`, PR #131, rolled out via PRs #132 → #133 → #134). The home-page section bloom layer was the only home surface the sydexa rollout did not touch.
>
> **Scope:** this is a **docs-only** PR. It documents the existing shipped state (so future changes don't accidentally consolidate the warm + cool bloom split), proposes a unifying rule, and lists concrete follow-on polish PRs. **No code lands in this PR.**

---

## 0. Pre-existing state (the contract today)

The home page `/en` is composed of, top-to-bottom:

| JSX section | Wrapper class | Existing bloom | Token used | Opacity | Corner anchor | Size (radial) |
|---|---|---|---|---|---|---|
| Hero | `.ls-hero` (PR #134) | `::before` warm upper-right aurora + `::after` cool lower-left aurora | `--marketing-accent-bloom` + `--color-cool` | 24% / 20% colour-mix | upper-right + lower-left | 40×26 / 34×22 rem |
| Corpora cards | `.ls-sec` (first) | `::before` warm right-edge bloom | `--marketing-accent-bloom` | 22% colour-mix | right | 32×18 rem |
| Audience cards | `.ls-audience` | `::before` warm bottom-right bloom | `--marketing-accent-bloom` | 16% colour-mix | bottom-right | 36×22 rem |
| Entry points + Reading conventions | `.ls-sec + .ls-sec` | `::before` warm left-edge bloom | `--marketing-accent-deep` | 18% colour-mix | left | 32×18 rem |

Source of truth for the existing rules: `apps/web/components/home/home.css` lines 225–309. The comments on those rules cite `design-spec home §6 "Gap: no per-section blooms"` — that gap note is now resolved by THIS spec.

**Net visual signature today:** all four body sections use **warm** accent blooms (`--marketing-accent-bloom` / `--marketing-accent-deep`). None of them use `--ambient-cool-*` (the cool token family introduced by PR #131/#133). The only cool accent on the home page is the hero's lower-left `::after`.

## 1. Why this matters

Per the sydexa-video-driven spec (`prompts/design-spec-2026-08-background.md` §2 row for `.ls-hero`), the visual rule is "**dark navy canvas (Rule 1) + one quiet accent glow per surface (Rule 2) + faint line-grid overlay (Rule 3)**". Rule 2 is satisfied PER-SURFACE — every surface (hero, blog pane, courses listing, blog index) gets exactly one focal accent. But the **PAGE-LEVEL** story is missing: the body sections on `/en` all use the warm token, with no cool accent continuity into the body. That means as the visitor scrolls from the hero (warm upper-right + cool lower-left) into the body, the cool accent disappears after the first viewport and the rest of the page reads as monochromatic warm.

Sydexa's video analysis showed the opposite pattern: the body of a long page has **alternating warm and cool focal accents** at each section boundary, so the eye gets colour-led cues for where to look next. The corpus-web body currently reads as a single warm wash after the hero.

## 2. Proposed unifying rule

Per the spec-first cadence, here is the contract I propose. **No code lands in this PR** — this section is the spec for a future polish PR.

### Rule 2a (page-level) — alternating accent on `.ls-sec` boundaries

> Each `.ls-sec` carries one focal bloom via `::before`, **alternating token family per section** so successive sections don't stack the same accent. The warm/cool alternation mirrors sydexa's T-junction glow flow.
>
> | Section index | Token family | Corner anchor | Suggested replacement |
> |---|---|---|---|
> | 1st `.ls-sec` (corpora) | warm (existing) | right | keep current (`--marketing-accent-bloom` 22%) |
> | `.ls-audience` (special) | cool (proposed) | bottom-right | `--ambient-cool-glow` 16% (same numeric value as current warm, just a different token) |
> | 2nd+.ls-sec (entry points + reading conventions) | warm (existing) | left | keep current (`--marketing-accent-deep` 18%) |

This adds **exactly one cool focal accent** to the body (the audience section), keeping warm dominance in the existing pattern. Cool accent inheritance matches the hero's lower-left cool `::after` — same token family, so the visual rhyme reads top-to-bottom.

### Rule 2b (surface-level) — keep current per-section sizing + opacity

No change to the existing 32×18 / 36×22 rem sizes or 22%/18%/16% colour-mix values. They were tuned by PR #116/#125/#128 individually and verified-by-eye. This spec only changes the **token** used by `.ls-audience::before`, not its size or opacity.

### Rule 3a (grid on body sections) — out of scope here

`.ls-sec` currently has no line-grid (only the bloom layer). The ambient-grid modifiers from PR #133 (`ls-ambient-grid` + `ls-ambient-glow` at 18% colour-mix) could be applied to body sections to add line-grid per sydexa Rule 3, but **this spec deliberately defers that** — adding grid + bloom layering on body sections while the body bloom tokens are still being unified is two changes at once. Grid-on-body goes in a follow-on spec if/when the bloom token change proves durable after a real-phone spot-check.

## 3. What changes (the next polish PR)

The next PR implementing this spec is `polish/home-section-bloom-alt` (proposed, not yet opened). It would touch one CSS rule:

| File | Change | Net |
|---|---|---|
| `apps/web/components/home/home.css` line 305 | `--marketing-accent-bloom` → `--ambient-cool-glow` in `.ls-audience::before` | 1 char (token rename only) |

That's it. One token rename in one rule. No JSX change, no new CSS, no new tokens, no dependency on PR #134's hero changes (which already shipped). The `.ls-audience` block picks up the cool accent family without otherwise changing size/opacity/corner anchor.

### Why this is the only safe first step

- **Token swap only.** Audience section keeps its 16% colour-mix and bottom-right anchor. Visually the change is small (warm → cool at the same numeric intensity and same corner).
- **Token family already exists.** `--ambient-cool-glow` was added in `packages/ui/src/tokens.css` PR #133 and resolves to `--color-cool-soft` (dark) / `--color-cool` (light). No new tokens.
- **Self-contained.** Doesn't affect the hero (warm + cool auroras stay as they are), doesn't affect corpora (warm bloom stays), doesn't affect entry-points (warm bloom stays). Only the audience section shifts from warm to cool.
- **Reversible.** If the visual contrast is wrong after spot-check, the rename is a one-line revert.
- **Real-phone spot-check still required** before merge — audience section lives below the fold on most viewports; the bloom won't show on every visitor's first paint. Worth confirming it doesn't conflict with the `from-display to-signal` accent on the audience card eyebrows.

## 4. Out of scope (intentionally)

- **Line-grid on body sections** (`ls-ambient-grid` modifier on `.ls-sec` and `.ls-audience`) — Rule 3a, deferred. Combining Rule 2 + Rule 3 changes in one PR is too much for a reviewer to evaluate.
- **Per-section bloom variations on `/en/blog` sidebar-tree layout** — different surface, different contract (spec extends to it later if needed).
- **Pagefind search-dialog bloom** — the dialog already has its own chrome treatment; the ambient spec deliberately excludes modal surfaces because they're transient.
- **Course-detail hero bloom composition** — already finalized in PR #117 + PR #132.

## 5. References

- `prompts/design-spec-2026-08-background.md` (PR #131) — the sydexa-video-driven background spec that introduces Rule 2 + Rule 3.
- `prompts/design-spec-2026-08-home.md` §6 — the original home spec, with a "Gap: no per-section blooms" annotation that this file resolves.
- `apps/web/components/home/home.css` lines 225–309 — the existing per-section bloom CSS whose behaviour this spec captures.
- PR #133 (`polish/grid-overlay-and-corner-glow`) — introduced the `--ambient-cool-glow` token this spec depends on.
- PR #134 (`polish/home-hero-bg-pass`) — finished the sydexa spec rollout on the home hero.

## 6. Status

Draft, awaiting user review. **No code lands in this PR.** Follow-on implementation PR `polish/home-section-bloom-alt` is named but not branched; will be cut after this spec lands.
