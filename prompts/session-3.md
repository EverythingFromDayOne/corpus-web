# Session 3 — the three-surface shell, one complete flow, live at `nxhhuy.tech`

> **Executor:** planning in chat, execution in Slack. `@Cursor` on the Cursor Models pool
> for the route work; hold the expiring credit for the article layout and the deploy.
> **Prerequisite:** the `roadmap.md` amendments in §0, applied and committed before this runs.
> **Gate:** a reader lands on the home page, opens a course, reads its curriculum, starts a
> lesson, finishes it, moves to the next one, and finds the article index — at a real URL,
> on a phone.

---

## 0. Roadmap amendments this session requires

Apply first. Four dated `§0.0` entries. This session contradicts two approved sections,
reverses one entry written earlier today, and closes one open question. None of that
should happen silently inside a session prompt.

### 2026-08-19 — the three-surface shell, approved (explicit user instruction)

§1 argues against adopting the reference site's information architecture wholesale. That
argument is **narrowed, not reversed**: the surfaces are adopted, the content model is not.

| surface | route | what it is in this project's terms |
|---|---|---|
| home | `/en` | corpus landing, §15.1 contents |
| courses | `/en/courses`, `/en/courses/[course]` | the **paths** layer of §1, promoted from thin to primary |
| lesson | `/en/courses/[course]/lessons/[slug]` | an article rendered with course chrome |
| articles | `/en/blog` | index over the whole corpus |
| article | `/en/blog/[corpus]/[slug]` | **canonical** article URL |

The reference-first invariant holds: one article, one canonical URL, a course owns no
content, and one article may appear in several courses. What changes is that courses become
a first-class browse surface in Phase 1 rather than Phase 4.

### 2026-08-19 — canonical article URL moves from `/en/concepts/…` to `/en/blog/…`

This supersedes the flat-URL entry written earlier today, which named
`/en/concepts/<corpus>/<slug>`. The flattening decision — no concept-folder segment —
**stands unchanged and is the part that matters**; only the first segment changes, to match
the three-surface shell.

Taken now because nothing is deployed and nothing is indexed. This is the last moment it is
free. The design contract asserts the old path in six places — `canonical`, `og:url`, two
`hreflang`, the JSON-LD `@id` and `mainEntityOfPage`, and the `BreadcrumbList` — and all six
must be updated in `docs/design/article-layout-poc.html` as part of this session.

Noted honestly: "blog" is a poor description of reference documentation with no publication
dates. It is adopted because it is the conventional label readers expect for this surface
and because it matches the navigation the shell is modelled on. The corpus is not blog
content and must not grow blog affordances — no dates, no chronological sort, no authors.

### 2026-08-19 — `/en/paths/*` deferral withdrawn; the cookie constraint dissolved

This morning's entry deferred paths because a path-context cookie read above the article
shell would force the route dynamic. **That constraint no longer applies.** Course context
lives in a URL segment — `/en/courses/[course]/lessons/[slug]` — so `generateStaticParams`
enumerates course×lesson pairs, every lesson page prerenders, and course-aware prev/next and
the curriculum sidebar need no cookie, no `searchParams`, and no dynamic route.

`/en/paths/*` is retired as a URL; `/en/courses/*` replaces it. Position-number redirects
(`/en/paths/x/3`) are dropped entirely rather than deferred — lesson slugs are stable and
position numbers are not, which is the same argument that keeps `article_id` off sequence
numbers in §1.

### 2026-08-19 — Q3 monetization resolved: non-commercial (explicit user instruction)

Not commercial; no content will ever be gated behind payment. Consequences, all
simplifying:

- Vercel Hobby is permissible unconditionally. Remove the commercial-use warning from §12.
- `entitlements` leaves the §8 Nest module inventory entirely.
- Quiz scoring is `mode: 'local'` only; the server branch is dropped, which also removes the
  interactive layer's dependency on auth.
- **No lock icons, no locked-lesson state, no prices, no enrol or purchase affordance, no
  paywall, no "notify me" email capture.** Every lesson in every course is open. The
  reference site's sidebar shows padlocks on most lessons; ours shows none.
- Progress and completion remain, anonymous in `localStorage` per §10.

Tick §16 Q3 on the approval checklist.

---

## 1. What this session is, and is not

**Is:** the first build a person can look at and use. Seven routes, real content, deployed.

**Is not:** complete Phase 1. Items 10, 11, 14 and 15 are partial or deferred and their
residue is itemised as debt in §9. Do not silently absorb them.

Phase 0 item 5 — *`nxhhuy.tech` DNS → Vercel; deploy the skeleton* — has been open since
session 1, and Phase 0's gate is *"the one-article render works and is live at a real URL."*
This session closes that gate. **Deploy early, not last.** Everything to date has been
verified by a human pasting terminal output; a route tree that has never been deployed is
half-built.

---

## 2. The blocker to clear first

`build-catalog` currently writes **0 paths**. `curation/paths/` is wired,
`packages/content-schema` already carries the path schema, and `verify-catalog` already
checks that every path item resolves to a non-excluded article — but nothing has been
authored. **There is no course content.**

**The first course is already authored** and ships with this prompt:
`curation/paths/react-render-cycle.yaml` — twelve `react` articles in reading order, flat
per §4, with a `note` on every position. Create the directory, commit the file, and confirm
`build-catalog` reports one path and that `verify-catalog`'s path-target check passes. Do not
re-sequence it; the ordering is an editorial decision that has been made.

A second course is a stretch goal, not a requirement. An index with one card is honest; an
index padded with fabricated courses is not. If you add one, draw it from `nextjs` — 10/10
adapting, and the corpus the design contract was drawn from.

### The constraint that governs all curation copy

`curation.ts` states it directly, and it applies to the course index, the detail page, and
every `note`:

> Curation is presentation and sequencing, **never claims**. Nothing here is allowed to
> assert anything about how a framework behaves — if it needs to, it belongs in the corpus.

This rules out the reference site's hero copy. *"Your component re-renders 47 times on every
keystroke"* is a behavioural claim, and in a course definition it would sit in `description`
or `rationale` where no gate can verify it. Course copy explains **why these articles, in
this order**. Any technical assertion has to come from an article that is under
`verify-frontmatter` and `verify-links`. If a course page needs to make a claim to be
compelling, the claim belongs in an article and the page should quote or link it.

---

## 3. Routes

```
/en                                            home
/en/courses                                    course index
/en/courses/[course]                           course detail, with #curriculum
/en/courses/[course]/lessons/[slug]            lesson — article + course chrome
/en/blog                                       article index
/en/blog/[corpus]/[slug]                       article — canonical, the design contract
```

All generated from `catalog.json`. `generateStaticParams` yields every adapting article for
`/en/blog/[corpus]/[slug]`, and every course×lesson pair for the lesson route. Do not filter
to one corpus — the route is corpus-agnostic by construction and a filter is work you would
delete.

The 16 excluded articles (D11's 15 untitled `react` files, D15's `angular` duplicate) must
**404**, not render an empty shell.

### One article component, two route wrappers

The article body, heading structure, TOC rail, code blocks, and provenance strip are
identical on both routes. Only two things differ:

| | `/en/blog/[corpus]/[slug]` | `/en/courses/[course]/lessons/[slug]` |
|---|---|---|
| left sidebar | concept tree, grouped by corpus and folder | **course curriculum** — sections, lessons, current highlighted |
| prev / next | concept graph | **course order** |
| breadcrumb | `Articles / <Corpus> / <title>` | `Home / Courses / <Course> / <title>` |
| `rel=canonical` | self | → the `/en/blog/…` URL |

Build it as one component taking a chrome variant, not two copies. If a change to the
article body has to be made twice, the split is wrong.

### `/en` — home

§15.1 is the specification: thesis paragraph, four corpus cards, concept-graph teaser, three
entry points, reading conventions. Three adjustments:

- Corpus cards carry **live counts read from `catalog.json`**, never hardcoded.
- One entry point is the featured course.
- The reference site's home page has a live interactive demo panel beside the hero. Ours
  gets a **static placeholder** in that slot — see §8. Do not build a simulator here.

**No personal content.** No About, bio, photo, employer, byline, or `Person` JSON-LD. Hard
rule, `.cursor/rules/20-never-violate.mdc`.

### `/en/courses` and `/en/courses/[course]`

**Index:** one card per course — title, framing line, lesson count, corpora drawn from,
estimated reading time computed from word count. Planned-but-unauthored courses may appear
as explicitly labelled **"Coming soon"** cards with no link. No prices, no enrol buttons, no
lock icons.

**Detail:** breadcrumb, title, framing paragraph, then a stat row — lesson count, estimated
reading time, level if the corpus carries one. Two actions: **start the first lesson** and
**view curriculum**. Nothing about payment.

Then `#curriculum`: the ordered lesson list, grouped by section, each row linking to its
lesson URL with position and title. `#curriculum` must be a real anchor that deep-links and
scrolls correctly, because it is one of the paths this session is judged on.

### `/en/blog`

Index over all 181 adapting articles. Group and filter by corpus; a corpus filter row is in
scope, a full-text filter is not (§8).

**Sort by corpus and concept folder, not by date.** The corpus has no publication dates and
inventing them is fabrication. Each entry shows title, description, corpus, and computed
read time. No author. No hero image — the reference site's cards carry illustrations and we
have no such assets; use a typographic card treatment rather than a placeholder image.

### `/en/blog/[corpus]/[slug]`

`docs/design/article-layout-poc.html` is the contract: three columns at a uniform 60rem
measure, collapsible sidebar, hover-label rail with progress ring, provenance strip on code
blocks, breadcrumb, prev/next.

Two contracts, no overlap. `docs/design/listing-pages-poc.html` is the contract for `/en`,
`/en/courses`, `/en/courses/[course]`, `/en/blog`, and the lesson chrome — the shared top
bar, the card and chip treatments, the census readout, the curriculum sidebar, and the
pinned-chrome scroll model. `docs/design/article-layout-poc.html` remains the contract for
the article body: prose measure, headings, code blocks with the provenance strip, figures,
callouts, the parts structure, and the rail. Neither restates the other, and the lesson
route composes both. If a change would have to be made in both files, the split is wrong —
say so rather than editing both.

**The POC carries known defects. Correct them; do not transcribe them.**

- **The mobile grid.** At ≤1000px the sidebar becomes `position:fixed` and the rail
  `display:none`, leaving `main` the only grid item while it still declares `grid-column:2`
  — so it lands in an implicit second track with the `1fr` track empty beside it. Place
  children explicitly at every breakpoint.
  *Annotated 2026-08-19: corrected in the POC itself, so transcribing it now carries the
  fix. Measured before: 1000px resolved to `4.8125px 995.188px` from a one-track template.
  After: `1000px`, one track, `main` in column 1.*
- **The collapsed-sidebar specificity patch.** `.view.nosb` at (0,2,0) outranks the ≤1000px
  `.view` rule at (0,1,0), which is why the POC needs a `.view.nosb>.sb{visibility:visible}`
  patch inside the media query. Scope the desktop collapse to the desktop breakpoint instead
  of patching around it.
  *Annotated 2026-08-19: corrected in the POC itself. The desktop template, the placement,
  and `.view.nosb` now sit in a `(width > 1000px)` block whose exact complement is the
  `(width <= 1000px)` block, and the `visibility:visible` patch is deleted rather than
  extended. Measured before: a collapsed sidebar carried the three-column template into
  mobile and cost `main` 56px of 390 to an empty rail track.*
- **Heading order runs `h1 → h3 → h3 → h2`.** The warm-up and roadmap blocks are `h3` before
  Part 1's `h2`. Demote them out of the hierarchy rather than promoting them. This changes
  the rail's tick denominator and sets an authoring convention for every article using the
  pattern — disclose it.
- **The language badge.** The third code block has no `.lang`, and no CSS rule for `.lang`
  exists. Take the language from the fence info string; render nothing when absent rather
  than falling back to a symbol name.
- **The second figure is not a simulator.** `#mk` is a `<span class="meta">` in a control
  row, referenced by no JavaScript. Render it as a plain caption or delete it.
- **`✓ 7 blocks verified` is mock data** — the page has three code blocks. Derive provenance
  counts from the article or omit the strip until the extraction pipeline exists.
- **Two breadcrumbs disagree.** The rendered trail is `Next.js / Caching / <title>`; the
  JSON-LD is `Concepts / Next.js / <title>`. With the folder gone from the URL there is no
  folder route to link, so `Articles / <Corpus> / <title>` is the only shape where every
  non-terminal crumb resolves. Use it in both, and update the six hardcoded `/en/concepts/…`
  URLs in the POC's head while you are there.

**Defects in `listing-pages-poc.html` — same rule, correct rather than transcribe:**

- **`.foot` does two jobs** — the page footer and the metadata row inside cards. This
  already caused a real selector collision in the POC, where `querySelector('.foot')`
  matched a card row instead of the footer. Split the names before this becomes
  components; it gets worse, not better, once these are React.
- **The mobile curriculum stacks above the article at ≤1000px**, pushing the lesson
  content below a twelve-item list. A drawer is the likely answer, matching the article
  POC's mobile sidebar. The POC does not specify one — decide, and disclose it.
- **The rail's 18×2px ticks are carried over deliberately and fail WCAG 2.2 target-size.**
  Do not silently enlarge them: the dimension is the visual contract and the tension is
  tracked in §10. If you believe they must change, stop and say so.

Five accessibility defects are **out of scope and go to debt** (§9). Do not fix them here
and do not claim axe-clean.

Code blocks use whatever the POC does. Shiki is item 10, deferred.

---

## 4. The curriculum is flat, and that is settled

`PathDefinition` in `packages/content-schema/src/curation.ts` is a flat ordered array of
`{ article, note? }`. **There is no section grouping and none is to be added in this
session.** The reference site's sidebar groups lessons under named headings; ours does not.
A schema change ripples into `build-catalog`, `verify-catalog`, and the catalog artifact,
and it is not a session-3 decision.

What the schema does give you, and what the curriculum must use: **`note` is per item.**
Render it as one line of framing beneath each lesson title, in the `#curriculum` list and in
the lesson sidebar. A flat list with per-position framing carries more than grouped headings
would; do not drop it as decorative.

`rationale` is required and belongs on the course detail page above the curriculum.
`estimatedHours` is optional and is deliberately omitted from the first course — compute
reading time from word count instead of asserting a number nothing measures.

Paths are YAML at `curation/paths/*.yaml`. That directory **does not exist yet**;
`loadPathDefinitions` degrades to zero rather than throwing, which is why the catalog reports
`0 path(s)` without erroring. Creating the directory and the first file is part of this
session.

---

## 5. Rendering

**Prerequisite:** `catalog.json` is produced at build time via `//#build:catalog` in
`turbo.json`, which `@corpus/web#build` depends on. This was wired on 2026-08-19 and did
not exist before — the session-1 spike survived without it only because it hardcodes one
param and reads MDX through fumadocs. If a route prerenders zero pages, check the artifact
before the route code.

§6.2 is the Cache Components strategy. Both article routes are cached static shells and
nothing above them reads `cookies()`, `headers()`, or `searchParams`. This is now
straightforward — course context is a URL segment, so there is nothing to read.

Shipping a dynamic article route would be an embarrassment the corpus documents at length in
`nextjs/stale-answer-tax`. Report the `○` / `◐` / `ƒ` breakdown from `next build`.

Theme: an inline pre-paint script sets `data-theme` from a cookie before first paint so the
shell stays static and there is no flash. The POC persists nothing and defaults to dark;
persistence is new work. If the cookie read cannot be kept out of the cached tree, fall back
to a client-only toggle with a `prefers-color-scheme` default and say so — do not make the
route dynamic.

---

## 6. Progress, without a backend

The rail's ticks and progress ring are real, not placeholder. Scroll position drives them.
Completion state persists anonymously in `localStorage` with a client-side id, per §10 — no
sign-in, no server, and nothing that would make a route dynamic.

Two things this must not do: block a reader behind a completion requirement, and lose data
silently. Migrating anonymous progress into a real account on first sign-up is §10's plan and
goes to debt.

---

## 7. Deploy

1. DNS: `nxhhuy.tech` → Vercel. Apex only, no Multi-Zones (§2).
2. Vercel Hobby; the commercial-use constraint no longer applies.
3. **Do not gate the deploy on the red CI gates.** `verify-links` fails on D13's 44
   unresolved refs — corpus-side authoring work that will keep failing for weeks.
   `build-catalog` exits 0 now that it emits with exclusions, so `next build` succeeds.
   Deploy on `next build` green and leave `verify-links` red as a tracked signal under issue
   #3. Wiring it as a deploy prerequisite blocks the site indefinitely on work unrelated to
   whether it renders.
4. Unresolved `related` refs render as plain text, never as broken links. There are 44 and
   readers will hit them.
5. Report the deployed URL and confirm all seven routes resolve on it.

---

## 8. Placeholders — what is deliberately inert

Each of these renders visibly and does nothing. Every one must **say so in the UI** — a
disabled control with a "coming soon" affordance, not a live-looking control that silently
fails. A search box that accepts input and returns nothing is worse than a disabled one.

| placeholder | why |
|---|---|
| Sidebar search input and `⌘K` | Pagefind is item 11 |
| Warm-up quiz card on lesson pages | interactive layer, session 4 |
| Home page interactive demo panel | static graphic; simulators are Phase 4 |
| Additional course cards | labelled "Coming soon", unlinked, only for courses genuinely planned |
| Article hero images | no assets; typographic cards instead |
| Sign-in | **omit entirely from the nav.** Phase 1 has no backend, progress is anonymous `localStorage`, and there is nothing to sign into. A dead sign-in button on a non-commercial site invites the question it cannot answer. |

Real, not placeholder: the progress ring and rail ticks driven by scroll position, the
collapsible sidebar, the theme toggle, prev/next on both routes, `#curriculum` anchoring, and
the corpus filter on `/en/blog`.

---

## 9. Definition of done

- [ ] `roadmap.md` §0 amendments applied; §16 Q3 ticked on the approval checklist
- [ ] One course authored in `curation/paths/`, sequence approved before use; `build-catalog`
      reports a non-zero path count
- [ ] Seven routes render from `catalog.json`; every adapting article has a page
- [ ] Course lessons render the same article component with curriculum chrome and
      `rel=canonical` back to `/en/blog/…`
- [ ] The 16 excluded articles 404
- [ ] `#curriculum` deep-links and scrolls
- [ ] Article page matches the POC with all seven listed defects corrected, including the six
      hardcoded URLs in its head
- [ ] Breadcrumb and `BreadcrumbList` agree on both routes
- [ ] No author byline, no invented dates, no `Person` JSON-LD, no personal content anywhere
- [ ] No price, enrol, paywall, lock icon, locked-lesson state, or email capture anywhere
- [ ] Every §8 placeholder is visibly inert rather than silently broken
- [ ] Mobile layout works at 390px — verified by looking at it
- [ ] Both article routes are static; `○` / `◐` / `ƒ` breakdown reported
- [ ] Live at `nxhhuy.tech`, seven routes confirmed on the deployed URL
- [ ] Phase 0 item 5 marked complete in `progress.md`; Phase 0 gate closed
- [ ] Debt rows in §10 opened with real ids before the PR is marked ready
- [ ] Invented decisions listed in the PR body
- [ ] `SESSION-LOG.md`, `CHANGELOG.md`, `.agents/summary.md`, `progress.md` updated — the last
      three in place, never union-merged

---

## 10. Moved to debt

Open as rows in `docs/DEBT.md` **in this session**, before the PR is ready. Ids are
append-only; highest issued is D16, so these start at D17 — adjust if the register has moved.
One row each. A single "deferred Phase 1 work" row is unactionable.

| item | what it is |
|---|---|
| corpus repo gates | `react-concepts` has no `package.json` and no CI. `nestjs-concepts` has a manifest and one verify script but no workflow. `nextjs` and `angular` have both. Every corpus fix so far was verified by hand — the reason a `.ts` extension became D12 and a false claim became D6. |
| POC accessibility defects | Five, none machine-detectable. `#sbt`'s `aria-expanded` is hardcoded `true` while the mobile drawer starts closed, and four close paths never update it. The progress ring SVG has no name and duplicates the `.pc` text — the fix is `aria-hidden` plus a named percentage, not `role="img"`. The sidebar search input has only a placeholder. Three of four status-dot states are colour-only. And the closed mobile drawer keeps a select, an input and nine links in the tab order, off-screen, with no `inert` or `visibility:hidden` — unlike the desktop collapse, which is correct. |
| site CI gates | `verify-a11y`, `lighthouse-ci`, Playwright screenshot diffing on both article routes. Two grid bugs shipped past every existing gate during POC work and were caught only by a human opening the page. Tension to resolve when picked up: axe's WCAG 2.2 `target-size` rule fails the rail's 18×2px ticks, so "axe clean" and "matches the POC" may be mutually exclusive. |
| Shiki | Item 10. The POC hand-rolls highlighting with `.k` / `.st` / `.fn` spans. Dual-theme Shiki under Cache Components is its own decision. |
| Pagefind + `⌘K` | Item 11. Inert this session. |
| SEO residue | Item 14 minus what ships: sitemap, `robots.txt`, OG image generation to `cdn.nxhhuy.tech`. Metadata and JSON-LD ship now. |
| render-mode verification | Item 15's method — assert against `.next/server/app/**.html`, not the build table, not curl, not view-source. |
| interactive layer | Session 4: build-output tab group, quiz, flashcards, drag-or-tap exercise, mechanism player, home-page simulator. The POC's tab group has `role="tablist"` with no `aria-controls`, no `tabpanel` roles and no roving tabindex; the exercise chips are `div`s unreachable by keyboard. Fix when built. |
| `/en/license` | Item 13's second half. The sole carve-out to the no-personal-content rule, since CC BY 4.0 requires naming a copyright holder. |
| accounts and progress sync | Progress is anonymous `localStorage`. Migrating it into a real account on first sign-up is §10's plan and needs the Nest backend. |

---

## 11. Invented decisions

Disclose these in the PR body with anything else decided during execution.

1. **Canonical moves to `/en/blog/[corpus]/[slug]`**, reversing an entry written earlier the
   same day. Justified only because nothing is deployed or indexed; it would not be
   justified a week from now.
2. **Lessons render rather than redirect.** §1 specified 308 redirects from path positions to
   the canonical article. Rendering with `rel=canonical` instead is what makes course chrome
   possible at all, and it is what removes the need for a cookie.
3. **Position-number URLs dropped entirely**, not deferred. Lesson slugs are stable, position
   numbers are not.
4. **`/en/blog` sorts by corpus and concept folder, not date.** No dates exist to sort by.
5. **Excluded articles 404.** Nothing upstream specifies the behaviour.
6. **The first course is drawn from `react`**; its sequence goes back for approval rather
   than being decided by the executor.
7. **Heading-order remedy is demotion, not promotion**, which changes the rail's tick
   denominator and sets an authoring convention corpus-wide.
8. **Sign-in omitted from the nav** rather than shown disabled.
9. **The deploy is not gated on `verify-links`.** Otherwise the site ships when D13's
   authoring work finishes, which is unrelated to whether it renders.
10. **Theme persistence via a pre-paint cookie read**, with a client-only fallback rather
    than a dynamic route.
