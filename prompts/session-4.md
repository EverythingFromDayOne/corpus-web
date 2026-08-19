# Session 4 — remaining Phase 1 surfaces

> **Executor:** `@Cursor` on the Cursor Models pool.
> **Prerequisite:** session 3 article routes are on a PR, not merged. Do not
> revive `/en/concepts/…`. Do not edit `content/`. Do not install packages
> without asking.
> **Out of scope:** DNS/deploy, merging the article PR, inventing architecture,
> rewriting listing or article chrome, Shiki-as-a-redesign, axe-clean claims.

Session 3 shipped the seven browse routes. What remains of Phase 1 is the
deferred residue already numbered in `docs/DEBT.md`. This prompt does not add
a new surface.

---

## 1. Do these, in this order, only if the session is asked to pick one

Pick **one** debt row. Do not batch.

| Pick | Debt | What "done" looks like |
|---|---|---|
| A | D20 | Shiki via `rehype-pretty-code` at build time. Copy/download/expand already exist. Do not ship a client highlighter. |
| B | D21 | Pagefind index + ⌘K. Replace the disabled search placeholder. Must not read `cookies()` / `headers()` / `searchParams` above a static shell. |
| C | D25 | `/en/license` — CC BY 4.0 attribution page. Licence text only; no bio, no profile link. |
| D | D22 | sitemap, robots.txt, OG images. No `Person` JSON-LD. No author in OG. |
| E | D23 | A gate that asserts against `.next/server/app/**.html`, not the build table, not curl. Article/lesson paths currently group as `◐` in the table because Cache Components forbids `dynamicParams`; the HTML is a complete prerender. Do not "fix" that by disabling Cache Components. |
| F | D18 / D19 | Article chrome a11y. 18×2px rail ticks stay 18×2px unless this session is explicitly told to change the visual contract. |

---

## 2. Hard no

- No fifth corpus. No demo-lab submodule.
- No `vi` locale.
- No About / Hire Me / author byline.
- No `export const dynamic` / `revalidate`.
- No new npm package without asking.
- No auto-merge.

---

## 3. Close-out

Four mandatory docs, then `/commit`. Invented decisions in the PR body.
`prompts/session-5.md` is the last file if this session completes a pick.
