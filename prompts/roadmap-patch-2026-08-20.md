# `roadmap.md` — patch, 2026-08-20

Reconciles a reference-site feature inventory against what `roadmap.md` already says.
Most of the inventory was already specified in §7 and §14; this patch records the
decisions that changed, adds the one genuinely new component, and pushes the
per-article specifics into `docs/DEBT.md`.

Debt ids assume the register is at **D28**. Confirm before use.

---

## Edit 1 — insert at the top of §0.0 Decisions log

---

**2026-08-20 — reference-site feature inventory reconciled.** An analysis of the
reference site produced roughly nineteen feature groups. Reconciled against this
document rather than adopted: §7 already specified most of the interactive layer, and
§14 already set the rule for what to take from that site and what to avoid.

What changed:

- The interactive inventory in §7.1 gains a **tier** distinction. Tier 1 components are
  corpus-agnostic and built once; tier 2 components are one concept's mechanism made
  visible and are authored per article. This matters because further corpora are
  expected, and a tier-1 component must work for a corpus that does not exist yet.
- The reference site's simulators are database-specific. This corpus covers Next.js,
  React, Angular and NestJS. Tier 2 is built as **framework equivalents**, not ported.
- One component is genuinely new and is specified in §7.5 below.
- The commercial surface and most of the personal-content surface are struck; see §14.

**2026-08-20 — §16 Q8 narrowed, not reversed: a contact email is permitted.**
`nxhhuy@gmail.com` may appear in the site footer and on `/en/license`. Everything else
the rule excludes still stands — no About page, no bio, no photo, no employer, no author
byline on articles, no `Person` JSON-LD for the site owner. This extends the carve-out
D25 already required, since CC BY 4.0 obliges naming a copyright holder.

**Bylines remain excluded, and attribution is a different field.** Where an article is
ever adapted or translated from another work, CC BY obliges naming the original — title,
author, URL, licence — emitted as `isBasedOn` / `citation`, never `author`. That is
attribution, not a byline, and it reads as the same discipline the corpus applies to
claims. No such article exists yet, so the schema decision is tracked rather than taken.

---

## Edit 2 — §7.1, add a tier column

The existing table has Complexity and Phase. Add **Tier**, and correct two rows.

| Widget | Tier | Complexity | Phase |
|---|---|---|---|
| Code block: line numbers, copy, download, expand, language tag | 1 | Low | 1 |
| Callout / admonition blocks | 1 | Low | 1 |
| Comparison tables | 1 | Low | 1 |
| Concept-mapping grid | 1 | Low | 1 |
| **Quiz** — MCQ, pager, submit, explanation reveal | 1 | Medium | 3 |
| **Flashcard deck** — flip, counter, stacked-card visual | 1 | Medium | 3 |
| **Runnable playground** — Run / `⌘+Enter` / Reset | 1 | Medium–High | 3 |
| **Code assembly exercise** — typed slots, chip pool, three-state outcome (§7.5) | 1 | High | 3 |
| **Stepped diagram** — Reset / Next, narration per step | 1 (shell) | High | 4 |
| **Concept simulators** — one per mechanism, mounted in the stepped-diagram shell | 2 | High | 4 |
| ~~Video / animation player~~ | — | — | **Struck** |

Two corrections to the original table:

- **The video row is struck.** §16 Q5's standing recommendation is SVG plus motion, on
  the grounds that video carries production cost, hosting cost, and goes stale
  independently of the article it explains. That row predates Q5.
- **"Tabbed simulator — event loop"** is generalised. The shell is tier 1; the event loop
  is one tier-2 simulator mounted in it. Candidates drawn from articles that already
  exist: the render → commit pipeline, context re-render propagation, the
  middleware → guard → interceptor → pipe → filter chain, cached-versus-uncached
  resolution.

**Tier 1 ships first.** It unblocks every corpus. Tier 2 is incremental and each instance
is justified by an article that is hard to understand without it — not by a checklist.

---

## Edit 3 — §7.3, record the sidecar deferral

Append to §7.3. Do not delete the existing preference order; the argument stands.

---

**Deferred 2026-08-20: overrides are the working mechanism; sidecars are the documented
future.** §7.3 prefers sidecars committed to the corpus repos, on the grounds that a quiz
makes claims and claims belong under corpus CI. That reasoning is unchanged and is
correct. It is deferred because it is not yet paid for: sidecar support means schema
validation and a gate in **every** corpus repo, and `react-concepts` currently has no
`package.json` at all.

Until an important lesson genuinely needs corpus-side interactives, interactive content
lives in `curation/overrides/`. Revisit then, with the CI gap closed first.

**The §7.5 exercise is the case that will force this.** Its outcome table asserts what a
framework does with a given input — that is a claim, and it belongs under the same
verification as the article it sits in.

---

## Edit 4 — §7.4, rewrite

§7.4 exists to prepare for server-side quiz scoring. §16 Q3 resolved non-commercial and
struck the server branch. Replace the section with:

---

### 7.4 Quiz scoring is local, and stays local

`mode: 'local' | 'server'` was designed so that server-side answer checking would not be
a rewrite. §16 Q3 resolved non-commercial on 2026-08-19: nothing is gated, no score
means anything to anyone but the reader, and there is no reason to hide an answer key
from a page that gives away every article for free.

`mode` is `'local'` only. The prop shape is retained rather than removed, because the
argument that produced it — that a correct-answer key in the client bundle makes scores
meaningless — remains true if the project's basis ever changes. It is a recorded
constraint, not a planned feature.

---

## Edit 5 — new §7.5

---

### 7.5 Code assembly exercise

The strongest single idea taken from the reference site, and the one component in §7.1
that is genuinely new rather than already specified.

**The shape.** A prose brief, a code template with typed blanks, and a pool of chips
grouped by slot type. The reader fills the blanks and the component evaluates the whole
assembly.

**Three outcomes, not two.** This is the entire point:

| Outcome | Shown |
|---|---|
| **Invalid** | An authored error resembling what the real toolchain emits, plus why |
| **Valid but wrong** | The actual result of what they assembled, next to what the brief asked for, and the specific reason they differ |
| **Correct** | The result, plus an explanation of the mechanism that produced it |

The middle state carries the value. "It compiles and does the wrong thing" is the most
common real defect class and almost nothing teaches it. A binary right/wrong exercise
cannot express it at all.

**Outcomes are authored, not executed.** With a small number of typed slots the
combination space is finite. Author the correct assembly and the interesting near-misses;
everything else falls back to a generic message keyed on slot type. This is deliberately
not a sandbox:

- Every result a reader sees has been written and reviewed. An executor would generate
  output nobody verified, on a site whose thesis is that claims are verified.
- It is deterministic, diffable, and testable in CI.
- It needs no runtime, so it works on a static route with no server.

**Slots are typed.** Each blank declares an accepted category. A chip from the wrong
category is rejected on placement with a type-level message, before any outcome is
evaluated. Reserve outcome evaluation for assemblies that are at least well-formed.

**Distractors encode misconceptions.** A chip pool of random wrong answers teaches
nothing. Each distractor should be a near-miss a real reader would plausibly choose: the
plausible-but-wrong keyword, the identifier that differs by one character, the variant
that is syntactically legal but semantically different.

**Interaction, and the accessibility constraint that follows.** Select-chip-then-select-slot
is the **primary** interaction; drag is progressive enhancement. This is not a
concession — it is the only path that works from a keyboard, and the reference site
implements both. Selecting a filled slot returns its chip to the pool. A progress counter
and a reset control are required.

Framework equivalents worth authoring first: decorator and provider ordering in NestJS,
directive placement and cache boundaries in Next.js, dependency arrays and memo
boundaries in React.

---

## Edit 6 — §14, append the struck list

§14 already says what to take and what to avoid. Append what was rejected, so a later
analysis does not re-propose it.

---

**Struck 2026-08-20, with reasons.** A feature inventory of that site produced these;
none are deferred, all are rejected:

| Feature | Why |
|---|---|
| Pricing, paywalls, blur-overlay soft locks, lock icons, coupon inputs, checkout | §16 Q3 — non-commercial. Every lesson is open to every reader. |
| Phone-number lead capture | §16 Q3, and it collects personal data for a funnel that does not exist |
| Author byline, avatar, `Person` JSON-LD | §16 Q8. Attribution replaces it where a work is adapted. |
| Social icons, phone number in the footer | §16 Q8 — contact email only |
| YouTube channel grid | §16 Q8, and no channel is in scope |
| Embedded instructional video | §16 Q5 — SVG plus motion instead |
| SQL playground, WebAssembly Postgres, database simulators | No SQL corpus; `dsa-concepts` has no remote (D1). Replaced by tier-2 framework equivalents. |
| Popup OAuth, sessions, feedback telemetry | Phase 1 has no backend; `apps/api` has never been deployed. Accounts remain D26. |
| Testimonial carousel | Not struck on principle — blocked on having readers. See the debt row. |

---

## Edit 7 — §16 status lines

- **Q3** — append the struck list above to the existing resolved entry, so §16 and §14
  agree.
- **Q5** — mark the SVG-plus-motion recommendation as **decided**, since §7.1's video row
  is now struck on its authority.
- **Q8** — amend to record the contact-email carve-out. Keep the rest of the rule verbatim.

---

## Edit 8 — `docs/DEBT.md`

**Split D24.** It currently lumps the whole interactive layer into one row. Split into a
tier-1 row (corpus-agnostic primitives, blocking) and a tier-2 row (concept simulators,
incremental). The tier-1 row keeps the existing accessibility findings against the POC's
tab group and exercise chips.

**Amend the corpus-gates row** with what the scan actually found, since "some corpora lack
CI" is less actionable than naming which and what each needs:

- `react-concepts` — no `package.json`, no CI, nothing. Largest corpus at 73 files, holds
  all 15 of D11's untitled articles, and is the source of the first course. Every fix
  there has been verified by hand. **Urgent.**
- `nestjs-concepts` — manifest and one verify script, no workflow. `verify:forbid-unknown-values`
  exists and nothing runs it, so the probe committed to make D6 re-runnable is still only
  run by hand. **Cheap** — copy `verify.yml` from a sibling.
- `nextjs-concepts`, `angular-concepts` — both have `package.json` and `verify.yml`. Fine.

**New rows**, from D29:

| Item |
|---|
| **Category filters are inert.** The chips on `/en/courses` and `/en/blog` render and do nothing. Client-side filtering by corpus and by kind. Distinct from Pagefind (D21), which is full-text. |
| **Course overview is missing two sections** the schema can already support: a single-expansion FAQ accordion, and a vertical learning-path timeline visualising the progression `rationale` already argues in prose. |
| **Sticky-scroll showcase on `/en`.** Pinned left timeline paired with a right panel mounting the real tier-1 primitives as the reader scrolls — demonstrating how the corpus is read rather than describing it. Depends on tier 1 existing. |
| **Related articles are not rendered.** 289 edges exist in `catalog.json`; article routes show `related` refs as plain text with no end-of-article section. All 289 are intra-corpus (D27). |
| **Adapted-content attribution has no schema.** If an article is ever adapted or translated, CC BY requires naming the original. Needs a frontmatter field and a rendered provenance block emitting `isBasedOn` / `citation`, never `author`. Decide before the first adapted article, not after. |
| **Testimonials are blocked on having readers.** The site went public 2026-08-19 and has had no reader long enough to hold an opinion. A testimonial section now would contain invented quotes on a site that publishes its own unresolved-reference count to prove it does not fabricate. Revisit when real feedback exists. |
| **Sidecar schema support deferred** (§7.3). Overrides are the working mechanism until a lesson genuinely needs corpus-side interactives. The §7.5 exercise is the case that will force it, and the corpus CI gap must close first. |

---

## Not decided here

- Whether `demo-auth-concepts`, `demo-authz-concepts` and `demo-attacked-web` gain an
  article layer or stay demos. That is D9 / ADR-0002 / §16 Q7, unchanged.
- Whether translated content implies a `vi` locale. That is §16 Q2, and `vi` is currently
  in session 4's hard-no list.
