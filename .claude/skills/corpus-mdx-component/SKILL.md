---
name: corpus-mdx-component
description: "How to build interactive components for the article reading experience — quizzes, flashcard decks, runnable code playgrounds, stepped simulators, and code blocks. Use when adding or editing anything in packages/mdx-components or packages/ui, or when a task asks for an interactive explainer inside an article. Covers the two playground tiers, component registration, and the design token discipline."
---

# The interactive layer

Every MDX component lives in `packages/mdx-components` and is exported through one map.
Never define one inline in a route file — components are addressed by name from
`curation/overrides/*.yaml`, so an unregistered component silently fails to inject.

## Playgrounds — two tiers, and the default is not Sandpack

**Tier 1 is the default.** A Web Worker with a `console` shim, a hard timeout, and
`structuredClone`-guarded output serialisation. Roughly 200 lines. It covers every plain-JS
snippet in the corpus.

**Tier 2 is Sandpack**, lazy-loaded behind an explicit "Open interactive editor" click, and
only where JSX must actually render. Sandpack must never land in a default page load — it
boots a bundler to run six lines of `console.log`.

Reaching for Sandpack first is the most common mistake here.

## Quizzes

The component takes `mode: 'local' | 'server'` from the start, even while only `local` is
implemented. Retrofitting server scoring later means rewriting the component; accepting the
prop now costs nothing.

In `local` mode the answer key is in the bundle and scores are advisory. In `server` mode
the key never leaves the API — see the `corpus-nest-module` skill.

## Styling

Every colour and type value comes from `@theme` tokens in `packages/ui`. The direction is
documented in `packages/ui/DESIGN.md`; read it before choosing anything visual.

The `signal` amber is scoped to **provenance and current read position only**. If amber
starts appearing on general-purpose buttons, the design direction has failed.

## The signature element

Code blocks carry a provenance strip: the demo file and symbol the code was extracted from,
plus a tick from the gate that verified it, linking to that symbol on GitHub.

`sourceUrl` is nullable — private corpora return `null`. **Hide the control, never render a
dead link.**

## Avoid

- Never define an MDX component outside `packages/mdx-components`
- Never load Sandpack in a default page load
- Never use `localStorage` or `sessionStorage` for state the server render needs — cookies,
  so SSR renders the right state without a flash
- Never use scroll listeners for the TOC rail — `IntersectionObserver`
- Never use raw hex, arbitrary Tailwind values, or inline styles
- Never render a "View source" link when `sourceUrl` is `null`
- Never hardcode a user-visible string — the message catalogue, even with one locale
- Never treat mobile as later polish; the sidebar-first layout degrades badly
