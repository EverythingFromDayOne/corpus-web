# Design direction — "Instrument"

> Written before any component. The plan is the contract; the CSS derives from it.

## The subject, named

A reference corpus whose distinguishing property is **provenance**. Every claim is traced
to official docs, framework source, or measurement. Every code block is extracted verbatim
from a demo that runs. CI gates fail on drift between the two. No competing resource in
this space can say that, and it is the only thing worth designing around.

Audience: working engineers, reading long-form technical prose in English, mostly on a
laptop, mostly in dark mode, usually while debugging something.

The page's single job: **make a claim's provenance visible at the moment you read it.**

## What this is deliberately not

The reference site (`sydexa.com`) runs violet on near-black. Copying the three-column docs
layout is fine — Docusaurus, Stripe, Mintlify and Fumadocs all ship it, it is a convention
rather than anyone's invention. Copying the palette would make the resemblance read as a
clone. Violet is out.

Also out, as generic defaults rather than choices: cream-and-serif with a terracotta
accent; near-black with a single acid-green accent; broadsheet hairlines with zero radius.

## Palette — 5 named values

| Token | Hex | Role |
|---|---|---|
| `ink` | `#0E141B` | Ground. Cold, blue-cast, visibly *not* black — blueprint, not terminal. |
| `surface` | `#151D26` | Cards, code blocks, sidebar. |
| `graphite` | `#2B3745` | Hairlines, dividers, inactive rail ticks. |
| `signal` | `#E4A548` | **The accent.** Amber, as in an instrument lamp. |
| `verified` | `#63B98C` | Gate-passed states only. Never decorative. |

`stale` (`#D2705F`) exists as a sixth, semantic-only token for drift markers and legacy
code annotations. It never appears in chrome.

**The discipline on `signal`:** amber marks provenance and current position. Nothing else.
Not buttons-in-general, not headings, not large fills. If amber appears on a surface, that
surface is telling you where something came from or where you are. A palette earns meaning
by refusing to spend it.

## Type — three roles, one risk

| Role | Face | Why not the obvious choice |
|---|---|---|
| Display | **Archivo** (variable, width 92) | The width axis lets headings run semi-condensed, which reads as engineering signage. Not Space Grotesk — that pairing is the current default. |
| Body | **Public Sans** | Humanist, open apertures, holds up at 17px over 600-line articles. Not Inter — Inter is the tell. |
| Mono | **IBM Plex Mono** | Has actual character at small sizes; distinct from JetBrains Mono, which every dev site already uses. |

**The risk: monospace is structural UI type, not just code type.** Every piece of metadata
— eyebrows, breadcrumbs, difficulty tags, baseline versions, rail section numbers,
provenance paths — is set in IBM Plex Mono, uppercase, tracked +0.08em. Prose is sans. The
result reads as a readout with an article inside it rather than an article with code in it.

Justification: in this corpus the metadata *is* the argument. A baseline of `Next.js 16.3`
is the difference between a true claim and a false one. Setting it in the same neutral sans
as the prose buries the thing that makes the corpus trustworthy.

Scale: 1.200 minor third from 17px body. `13 / 14 / 17 / 20 / 24 / 29 / 35 / 42`.
Prose measure caps at 68ch.

## Layout

Three columns, per roadmap §6.3. The variation that matters is the right rail: it is not a
table of contents that happens to show progress, it is a **read-position readout** that
happens to be navigable. Hairline ticks in `graphite`, filling to `signal` as sections are
passed, with the section ordinal in mono beside the active one.

```
┌────────────┬──────────────────────────────┬──┐
│ CORPUS     │ NEXTJS · WAVE 2 · ADVANCED   │01│
│  nextjs  ▸ │                              │02│
│  reactjs   │ Cache Components and the     │03│◂ signal
│  angular   │ stale-answer tax             │04│
│  nestjs    │                              │05│
│  dsa       │ Next 16 inverted the caching │06│
│            │ defaults, which makes most   │  │
│ ⌘K search  │ existing material wrong.     │  │
│            │ ┌──────────────────────────┐ │  │
│            │ │ demo/cache/page.tsx      │ │  │ ◂ PROVENANCE
│            │ │   › CachedProducts    ✓  │ │  │
│            │ ├──────────────────────────┤ │  │
│            │ │ 1  'use cache'           │ │  │
│            │ └──────────────────────────┘ │  │
└────────────┴──────────────────────────────┴──┘
```

## Signature: the provenance strip

Every code block carries a header showing the demo file and symbol it was extracted from,
in mono, with a `verified` tick tied to the `verify-code-blocks` gate that produced it.
Clicking it opens that symbol on GitHub.

This is the one memorable element, and it is the right one because **it is true and it is
not reproducible**. No tutorial site can render a provenance strip, because no tutorial
site extracts its code from a running demo. The design's most distinctive feature is a
direct rendering of the corpus's actual editorial discipline, which is the only kind of
distinctiveness that does not wear off.

Everything else stays quiet so this can be loud.

## Motion

One orchestrated moment: the landing page's concept-graph teaser draws its edges on load,
once, 900ms, then settles. Elsewhere: 120ms ease-out on hover and focus, nothing else.
`prefers-reduced-motion` disables the graph draw and all transitions.

## Quality floor, unannounced

Responsive to 360px. Visible keyboard focus in `signal` at 2px offset. Contrast ≥ 4.5:1 for
body, ≥ 3:1 for large display and UI borders. Reduced motion respected. No layout shift
from font loading — `size-adjust` fallbacks for all three faces.

## Self-critique before build

- *Is amber-on-dark a default?* It is common in terminal themes. It earns its place here
  because it is scoped to a single semantic — provenance and position — rather than used as
  a general accent. If it starts appearing on buttons, the direction has failed.
- *Are three accent colours too many?* Yes, if all three were decorative. `verified` and
  `stale` are state colours that appear on a handful of components. Kept.
- *Is the mono-for-chrome risk gratuitous?* It would be on a marketing site. Here the
  metadata carries the corpus's core claim, so promoting it typographically is argument,
  not styling. Kept — but if it makes the sidebar hard to scan at 360px, the sidebar
  reverts to sans and the risk stays confined to article metadata.
