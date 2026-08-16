# corpus-web — Roadmap

> Status: **approved with open items** · Planning 2026-08-15 · Revised 2026-08-15
> The delivery surface for the `EverythingFromDayOne` concepts suite. Ships at `nxhhuy.tech`.
> Reference layout: [sydexa.com](https://sydexa.com/courses/react-advanced/lessons/js-patterns-react) (structure only — see §14 on trade dress).

---

## 0.0 Decisions log

**2026-08-15 — resolved by the user:**

| Ref | Question | Resolution |
|---|---|---|
| Q1 | Article `dek` | **Add `description:` to frontmatter across the five framework corpora.** Mechanical pass, ~120 files. Doubles as the meta description. Required in `packages/content-schema`. `auth`/`authz` deferred until their convention is audited. |
| Q2 | Language | **English-only ships.** All routes namespaced `/[locale]/` from Phase 1 and every user-visible string goes through a message catalogue immediately, so `vi` is additive later rather than a URL migration. |
| Q3 | Repo count | **One monorepo, `corpus-web`** — not split `-fe` / `-be`. See §4.0. |
| Q4 | Repo name | `corpus-web`. |
| Q6 | Portfolio location | The existing `nxhhuy.tech` is discarded; this project takes the apex. |
| Q8 | Résumé / personal content | **None.** No About, bio, photo, employer, client, or contact content anywhere. `/en` is a corpus landing page, not a personal one. Enforced as a hard rule in `.cursor/rules/20-never-violate.mdc`. Licensing attribution is the sole carve-out. |

**2026-08-15 — session 1 audit: FOUR corpora, not seven.** `demo-auth-concepts`,
`demo-authz-concepts`, and `demo-attacked-web` have no `docs/` folder and no frontmatter.
They are runnable demo apps, registered as `DemoSourceId` so refs to them resolve and warn,
with no adapters and no submodules — see `docs/adr/0002-demo-labs.md`. The React repo is
`react-concepts`, mounted at `content/react`. Default branches confirmed: `main` for
`nextjs` and `nestjs`, `master` for `react` and `angular`; Debt D4 closed. The fumadocs ×
Next 16.3 × Cache Components spike **passed all four criteria** — §6.1 is settled and the
fallback pipeline is not needed.

**Superseded — 2026-08-15 — corpus count corrected to seven.** `demo-auth-concepts` and
`demo-authz-concepts` join the five framework corpora, mounted at `content/auth` and
`content/authz`. `demo-attacked-web` is **not** a corpus — it appears to be the target
application the auth/authz demos attack, and is not submoduled. Neither new repo has a
recorded frontmatter convention; both are `demo-`prefixed and report HTML as their primary
language, so their adapter specs are a hypothesis and session 2 audits them first. This is
also the strongest argument yet for §4.0: the shared-schema cost scales with corpus count,
and it just went up 40%.

**Newly surfaced 2026-08-15 (see §16):** the `AngularDemos` repo already deploys to
`ng21.nxhhuy.tech` / `ng15.nxhhuy.tech`, and its own roadmap names a "Next.js shell at
`nxhhuy.tech`" as a planned step. That shell is this project. How the Angular demos
attach to it is **Q7 — open**.

---

## 0. Verdict up front

You have ~120+ articles of verified reference prose sitting in four repos with no reader. The site is not a new content project — it is a **rendering and retention layer** over content that already exists. Every architectural decision below is subordinate to one constraint: **the four corpus repos stay canonical. The site never becomes a place where content is authored.**

Three decisions carry the whole plan:

1. **Content is build-time, not database-backed.** Next.js owns rendering. Postgres never sits in the read path for an article body.
2. **NestJS earns its place on state, not content.** Progress, quiz scoring, flashcard scheduling, auth, entitlements. If Nest were only serving markdown it would be decoration on your CV, and reviewers can tell.
3. **Use `fumadocs-core` as a library; write your own UI.** The MDX pipeline, page tree, and TOC extraction are solved problems with zero portfolio value. The course chrome and the interactive widgets are where the differentiation lives.

---

## 1. What this thing actually is

Sydexa is a **course platform**: linear lessons, gated content, progress, quizzes. Your corpus is **reference documentation**: articles addressed by concept, cross-linked into a graph, read non-linearly.

Copying their information architecture wholesale would fight your content. The resolution:

> **Reference-first, course-second.** Articles keep their existing folder/slug identity and are individually addressable. **Paths** are a separate, thin layer: an ordered sequence of existing article IDs with an editorial framing. One article can appear in three paths. A path owns no content.

This gives Sydexa's lesson-by-lesson UX (sidebar order, prev/next, progress, completion) without duplicating a single article, and without a renumbering event every time you insert an article mid-wave. It also matches the invariant you already hold: `article_id` is the filename slug, never a sequence number.

**URL shape:**

```
/en                                corpus landing — thesis, four corpora, entry points
/en/concepts                       corpus index — all four repos
/en/concepts/nextjs                repo index
/en/concepts/nextjs/caching/...    article (canonical URL, stable forever)
/en/paths                          curated tracks index
/en/paths/react-deep-dive          path overview
/en/paths/react-deep-dive/3        path position → 308 redirect to canonical article URL
                                   (+ path context in a cookie/searchParam for prev/next chrome)
```

Canonical URL is always the article. Path positions redirect. One page, one URL, no duplicate-content SEO penalty.

---

## 2. Domain topology

| Host | Serves | Repo | Platform |
|---|---|---|---|
| `nxhhuy.tech` | Next.js app — portfolio + corpus + paths | `corpus-web` | Vercel |
| `api.nxhhuy.tech` | NestJS | `corpus-web` | Fly.io |
| `cdn.nxhhuy.tech` | Static media (diagrams, MP4, OG images) | — | Cloudflare R2 |
| `ng21.nxhhuy.tech` | Angular 21 demos | `AngularDemos` | separate deploy |
| `ng15.nxhhuy.tech` | Angular 15 demos | `AngularDemos` | separate deploy |

Single Next app owns the apex. **Do not use Next.js Multi-Zones here** — you have one team and one deploy; zones buy nothing and cost you a shared-layout headache. (You already have the Multi-Zones material in `react-concepts` article 37 — write about it, don't adopt it.)

`AngularDemos` stays a separate repo with its own deploys. It is **not** a submodule of this one — it is an application, not content, and merging it would drag Nx 22 and two Angular toolchains into a build that has no use for either.

`api.` on the same registrable domain matters: it lets Nest issue a session cookie scoped to `.nxhhuy.tech`, which sidesteps the entire third-party-cookie problem. This is the single biggest reason not to put the API on a `*.fly.dev` host in production.

---

## 3. Target versions

| What | Version | Why this one |
|---|---|---|
| **Next.js** | **16.3**, Cache Components ON | Same baseline as `nextjs-concepts`. The site becomes the proof-of-work for your own corpus. |
| React | 19.2 | Matches `react-concepts` baseline. |
| TypeScript | 5.9+ strict | Suite-wide. |
| Tailwind | v4 | CSS-first config; `@theme` tokens map cleanly to the light/dark toggle. |
| Fumadocs | `fumadocs-core` + `fumadocs-mdx` (latest 16.x line) | **Spike-gated** — see §6.1. |
| Shiki | v3+ via `rehype-pretty-code` | Build-time highlighting, zero client JS. |
| **NestJS** | **11.1.x** | Same baseline as `nestjs-concepts`. |
| Node | **22 LTS** on web, **24 LTS** on api | Next 16 floor is 20.9+; `nestjs-concepts` already targets 24. Divergence is deliberate and documented. |
| Express | 5 | Per `nestjs-concepts`. |
| TypeORM | 1.1.x | Per `nestjs-concepts`. Prisma is that repo's Phase 2 — do not fork the decision here. |
| PostgreSQL | 18 | Per `nestjs-concepts`. Neon serves 18. |
| Redis | Upstash / Valkey 8 | Sessions, rate limiting, BullMQ. |
| pnpm | 10.33.0 | Suite-wide. |
| Turborepo | latest | Task graph + remote cache. |

**Version-drift rule:** the site pins the *same* Next/Nest majors as the corpus repos. When `nextjs-concepts` moves its baseline, this repo moves with it in the same session. A site running Next 16.3 while the articles teach 17 is worse than no site.

---

## 4. Repo shape

### 4.0 One repo, not two — why `corpus-web-fe` + `corpus-web-be` is the wrong split

The instinct is right that the rest of the suite is standalone repos. It doesn't transfer here, because a frontend and a backend that were designed together share **contracts**, and the corpus repos share nothing with anything.

Two contracts are shared, and both are load-bearing:

- **`packages/content-schema`** — the same zod schemas validate frontmatter at build time in `web` and at ingest time in `api`. Four corpora make this heavier, not lighter: four adapters in one package, or four publish cycles across two repos. Split the repos and every schema change becomes: bump, publish, install, verify, in that order, twice. For a solo developer in the exploratory phase this is the tax that quietly kills the schema discipline.
- **`packages/api-client`** — generated from the Nest OpenAPI document and consumed by `web`. Cross-repo, the frontend is permanently chasing a stale published client, and "regenerate the client" becomes a step people forget under deadline.

Three further reasons:

- Adding one progress field touches an entity, a migration, a DTO, the generated client, and a component. In one repo that is one atomic PR. In two it is a coordinated release.
- Your Cursor Cloud Agent workflow runs from Slack **with the repo as the channel default**. One repo is one channel. Two repos means switching context mid-session, which is exactly the failure mode the `.cursor/rules` scaffold exists to prevent.
- Turborepo remote cache makes the "monorepo is slow" objection false at this size.

Independent deploys are preserved regardless: Vercel takes a root directory, Fly takes a Dockerfile path. Splitting the repo is not what buys you independent deploys.

**The honest counter-argument:** two repos would be cleaner if you wanted the NestJS app to read as a standalone portfolio artifact the way `nestjs-concepts` does. It doesn't need to — `nestjs-concepts` already *is* that artifact. What this repo demonstrates is something the suite currently has nowhere: a full-stack system, built and deployed as one. That is a stronger single thing to point at than two half-repos.

### 4.1 Layout

```
corpus-web/
├── apps/
│   ├── web/                    Next.js 16.3
│   │   ├── app/
│   │   │   ├── (landing)/      corpus landing, /license — NO personal content
│   │   │   ├── (corpus)/       /concepts/[repo]/[...slug]
│   │   │   ├── (paths)/        /paths/[path]/[position]
│   │   │   └── api/            BFF only — session proxy, never business logic
│   │   ├── components/
│   │   │   ├── chrome/         sidebar, toc-rail, breadcrumb, prev-next
│   │   │   └── mdx/            → re-export from packages/mdx-components
│   │   └── lib/source.ts       fumadocs loader
│   └── api/                    NestJS 11
│       └── src/modules/        auth, users, progress, quiz, srs, catalog,
│                               notes, entitlements, analytics, admin
├── packages/
│   ├── content-schema/         zod schemas — frontmatter, quiz, deck, path
│   ├── ui/                     design tokens + primitives (shadcn-style, owned)
│   ├── mdx-components/         ← the interactive layer (§7)
│   └── api-client/             generated from Nest OpenAPI, consumed by web
├── content/                    SUBMODULES (gitlinks), NEVER EDITED (§5)
│   ├── nextjs/ react/ angular/ nestjs/
├── curation/                   HAND-AUTHORED, COMMITTED
│   ├── paths/*.yaml            ordered article-id lists + editorial framing
│   └── overrides/*.yaml        per-article widget injection (§7.3)
├── tooling/                    eslint, tsconfig, prettier configs
└── scripts/
    ├── sync-content.mjs        pull from the four repos
    ├── build-catalog.mjs       frontmatter → catalog.json
    ├── push-catalog.mjs        catalog.json → POST api/catalog/sync
    └── verify-*.mjs            site-level CI gates (§13)
```

**Correction (2026-08-15):** an earlier draft of this section said `content/` is gitignored. That is wrong, and worth stating rather than quietly fixing. A parent repo tracks a submodule as a **gitlink** — a single commit SHA — not as files. There is nothing under `content/` for the parent's `.gitignore` to act on, so a `content/` entry there is inert. It would have read as protection while providing none.

The real guard is three cheap mechanisms, and they are load-bearing because the corpus's single-source-of-truth property is what keeps four repos standalone:

1. **`verify-submodules.mjs`**, in CI on every push: fails if any submodule working tree is dirty, or if `HEAD` is not exactly a tag.
2. **The same script as a `pre-commit` hook**, so the failure arrives before the commit rather than after the push.
3. **`submodule.<name>.ignore = none` in `.gitmodules`**, so `git status` surfaces dirty submodule content instead of hiding it — the default in some workflows suppresses exactly the signal being watched for.

An agent editing a corpus file still cannot get it into this repo by accident: recording a new gitlink requires committing inside the submodule first, and the gate fires before that is possible.

---

## 5. Content pipeline

The part everyone underestimates. Four repos → one site, with the corpus staying canonical.

### 5.1 Sync mechanism — **git submodules, pinned to tags**

Rejected alternatives, with reasons:

- **Merge the corpora into this monorepo** — kills the standalone-repo property that makes each `*-concepts` repo a portfolio artifact in its own right. Non-starter.
- **npm-publish each corpus** — publishing markdown to npm is a workflow tax with no reader-facing benefit.
- **Runtime fetch from GitHub raw** — puts GitHub's availability and rate limit in your read path. No.
- **Submodules pinned to tags** — ✅ builds are reproducible, content version is explicit in a commit, `git submodule update --remote` is one command, and a content change is a visible diff in this repo.

The known submodule ergonomics complaint (people forget `--recursive`) is fully handled by a `postinstall` hook plus a CI gate that fails if any submodule is dirty or unpinned.

**Promotion flow:** corpus repo tags `v1.4.0` → GitHub Action in that repo fires `repository_dispatch` at `concepts-platform` → Action bumps the submodule pointer, runs the gates, opens a PR. **Never auto-merges.** Content promotion is a human decision.

### 5.2 Frontmatter unification

The four repos have compatible-but-not-identical frontmatter (`article_id` / `recipe_id`, `concept_folder`, `wave`, `related`, `<fw>_baseline`, `status`, `difficulty`). Do **not** rewrite the corpora to unify them.

Instead: `packages/content-schema` holds one zod union with **per-repo adapters** that normalize into a single internal `Article` shape:

```ts
type Article = {
  id: string;            // `${repo}/${article_id}` — globally unique, stable
  repo: RepoId;
  kind: 'concept' | 'recipe';
  folder: string;
  title: string;
  dek: string;           // the sub-title line — needs a frontmatter field (§16 Q1)
  wave: number | null;
  difficulty: Difficulty | null;
  baseline: { framework: string; version: string };
  status: 'draft' | 'complete';
  related: ArticleRef[];
  sourcePath: string;    // for the "Edit on GitHub" link
  contentHash: string;   // sha256 of body — drives the DB upsert (§9)
}
```

The adapter layer is the compatibility shim. When a corpus's frontmatter changes, one adapter changes — not 120 files.

`status: 'draft'` articles render only when `NEXT_PUBLIC_SHOW_DRAFTS=1`. Prod ships completed work only.

### 5.3 Catalog

`build-catalog.mjs` emits `catalog.json`: the full article list, folder tree, path definitions, and the resolved cross-link graph. It is the **only** artifact the API needs to know about content. It gets `POST`ed to `api/catalog/sync` on deploy, which upserts `lessons` rows keyed on `(repo, article_id)` and marks vanished ones `archived` — never deleting them, because `lesson_progress` rows point at them.

### 5.4 Cross-repo links — the thing that only works once everything is in one place

Your `verify-links.mjs` currently warns on cross-repo links because they can't resolve. On this site they **can**. `nextjs-concepts` linking to `react-concepts/rendering/how-react-renders` becomes a live link.

This is genuinely the strongest argument for building the site at all, and it should be a headline feature, not a side effect: a **concept graph view** showing the four corpora as one interconnected body of work. That is a thing no course platform has, and it is a direct visual argument for the depth of the corpus.

Consequence: the site-level `verify-links` gate is **stricter** than the per-repo one. Cross-repo links that warn in the corpus repos become **hard failures** here.

---

## 6. Frontend architecture

### 6.1 Fumadocs — spike first, then commit

`fumadocs-core` is headless and explicitly usable as a library without adopting `fumadocs-ui`. It gives you: MDX compilation, typed frontmatter validation, page-tree generation, TOC extraction, search integration, Shiki code blocks.

Adopt `fumadocs-core` + `fumadocs-mdx`. **Skip `fumadocs-ui`** — the layout is where you differentiate, and their theme is instantly recognizable to anyone who reads docs sites.

**Blocking spike (Phase 0, timeboxed 1 day):** verify `fumadocs-mdx` builds under **Next.js 16.3 with Cache Components enabled**. Fumadocs targets Next 15.3/16.x; 16.3 + Cache Components is a narrow enough combination that I will not assert compatibility without you running it. Cache Components changes what may be read during prerender, and fumadocs' virtual `.source` generation is exactly the kind of build-time file access that can trip it.

**Exit criterion:** one article from `content/nextjs/` renders at `/concepts/nextjs/<slug>` with working TOC and Shiki, `next build` clean, no Cache Components errors.

**Fallback if the spike fails:** hand-rolled pipeline — `gray-matter` + `remark`/`rehype` + `next-mdx-remote-client` + a custom TOC extractor. Roughly two extra days of work; not a project risk, just a tax. Decide from the spike result, not from preference.

### 6.2 Rendering strategy

This is where you dogfood your own thesis. The corpus argues that Next 16 inverted caching defaults and most material is now wrong. The site should be a demonstration:

| Surface | Strategy | Note |
|---|---|---|
| Article body | `'use cache'` + `cacheLife('max')`, keyed on `contentHash` | Content only changes on deploy. Never fetched per-request. |
| Sidebar tree | `'use cache'`, module-level | Same for every reader. |
| Search index | Static asset | Not a server route. |
| Progress ticks (right rail) | Suspense boundary → per-user fetch | Uncached. The article shell prerenders and streams; progress fills in. |
| Quiz results / SRS due count | Suspense, uncached | Same. |
| Auth state in header | `'use cache: private'` is **not** a server cache — it is per-session request memoization only | Your article 12 finding. Applies directly here; don't expect it to reduce API load. |

The concrete win: an article page prerenders fully and streams the user-specific rail in. First paint of the *content* is independent of the API being up. If Fly.io is cold-starting, the article still renders. Build the site so an API outage degrades to a read-only corpus, never to a blank page.

### 6.3 Layout spec (from the reference screenshots)

**Three-column, matching the reference structure:**

- **Left (280px, collapsible):** logo → collapse toggle → course/repo title → content search input → collapsible section groups → lesson rows with state icons (locked / in-progress / complete). Persists scroll position across navigation; collapse state in a cookie so it survives SSR without a flash.
- **Center (max ~720px prose):** breadcrumb → H1 → dek → MDX body → prev/next footer.
- **Right (~48px rail):** the tick-mark scroll-spy. Each tick = one `##`/`###` section, filled as it is scrolled past, with a completion badge at the bottom. It reads as a progress bar and a TOC simultaneously — a genuinely good pattern and worth copying the *idea* of. Implement with `IntersectionObserver`, not scroll listeners.

**Theme:** floating light/dark toggle. Dark is the default and gets the design attention — that's what your audience uses. The reference runs violet-on-near-black; pick a different accent. Anchoring on their palette makes the resemblance look like a clone rather than a convention.

**Mobile:** sidebar → sheet, TOC rail → collapsible bar under the header. Sidebar-first layouts degrade badly if this is deferred; do it in Phase 1, not Phase 4.

---

## 7. The interactive layer

This is the actual gap between "markdown on a page" and the reference site, and it is the most valuable work in the project.

### 7.1 Component inventory (from the reference)

| Widget | Complexity | Phase |
|---|---|---|
| Code block: line numbers, copy, download, expand, language tag | Low | 1 |
| Callout / admonition blocks | Low | 1 |
| Comparison tables (already in your prose) | Low | 1 |
| Concept-mapping grid (`JS concept → React usage`, arrowed) | Low | 1 |
| **Quiz** — MCQ, pager, submit, explanation reveal | Medium | 3 |
| **Flashcard deck** — flip, counter, stacked-card visual | Medium | 3 |
| **Runnable playground** — Run / `⌘+Enter` / Reset | Medium–High | 3 |
| **Stepped diagram** — Reset / Next, narration per step | High | 4 |
| **Tabbed simulator** — event loop w/ Macrotask/Microtask/Mix, step counter | High | 4 |
| Video / animation player | Low (embed) | 4 |

### 7.2 Playground: worker eval, not Sandpack

The reference's "Chạy ⌘+Enter" on plain-JS snippets is a sandboxed eval, not a bundler. **Sandpack is the wrong tool for 90% of your snippets** — it boots a whole bundler to run six lines of `console.log`.

Two tiers:

- **Tier 1 (most snippets):** Web Worker + a `console` shim, hard timeout, `structuredClone`-guarded output serialization. ~200 lines. Covers every plain-JS example in `js-patterns`-style content, and every `dsa-concepts` snippet.
- **Tier 2 (React/JSX only):** Sandpack, lazy-loaded, behind an explicit "Open interactive editor" click so its ~1MB never lands in a default page load.

Tier 1 first. Tier 2 only where a snippet genuinely needs to render.

### 7.3 Authoring: sidecars + overrides, never inline edits

**The corpus must not gain site-specific MDX components.** The moment an article contains `<EventLoopSim />`, it stops being a portable standalone repo and stops rendering on GitHub — and GitHub is currently its only reader.

Two mechanisms, in preference order:

1. **Sidecar files, committed to the corpus repos:** `js-patterns-react.quiz.yaml`, `js-patterns-react.deck.yaml` next to the article. Schema-validated by `content-schema`, gated by the corpus's own CI. Quizzes are content and belong with the content — and this keeps them under your verified-claims discipline.
2. **Injection overrides in `curation/overrides/`:** a YAML map of `article_id → [{ afterHeading, component, props }]`. This is how a rich widget lands in an article without touching it. Site-specific presentation stays in the site repo.

The rule: **if it is a claim, it lives in the corpus. If it is a rendering, it lives here.** That's the same prose/code split you already enforce, extended one level.

### 7.4 Quiz answers must not ship to the client

For Phase 3, client-side answer checking is acceptable and simple. But note it early: if you ever want scores to mean anything, the correct-answer key cannot be in the page bundle. That means `POST /quiz/attempt` with the submitted option, Nest holds the key, the response carries the verdict plus the explanation. Design the component's props to allow both from day one (`mode: 'local' | 'server'`) so this isn't a rewrite later.

---

## 8. Backend — what NestJS is actually for

Explicit inventory, because "I added a backend" is not an architecture:

| Module | Owns | Why not Next route handlers |
|---|---|---|
| `auth` | Registration, login, sessions, refresh rotation, OAuth (GitHub/Google) | Session issuance belongs to one service. Splitting it across two runtimes is how you get subtle logout bugs. |
| `users` | Profile, preferences (theme, sidebar state, locale) | — |
| `catalog` | Ingests `catalog.json`; owns `lessons`, `paths` | Gives every other module a stable FK target for content. |
| `progress` | Lesson completion, section-level scroll progress, streaks | Write-heavy, needs transactions and dedup. |
| `quiz` | Question bank, attempt scoring, answer key custody | Answer key must never reach the client (§7.4). |
| `srs` | Flashcard scheduling (SM-2 / FSRS), due queues | Real algorithmic work; the most interesting thing in the API. |
| `notes` | Highlights, bookmarks, per-article notes | — |
| `entitlements` | Free vs. paid access, if you ever gate | Isolated so gating is one policy, not scattered guards. |
| `analytics` | Event ingest → BullMQ → aggregates | Batched writes; a bad fit for edge/serverless handlers. |
| `admin` | Catalog inspection, attempt review, user admin | — |

**The honest test:** if you removed Nest, what breaks? Answer: everything user-specific, and nothing about reading. That is the correct shape. Reading works without a backend; *retention* needs one.

**Next's `app/api/` is a BFF only** — session cookie proxying and nothing else. Zero business logic. Any time you're tempted to add logic there because "it's faster," you're building two backends.

**Contract:** Nest exposes OpenAPI via `@nestjs/swagger`; `packages/api-client` is generated from it in CI. The web app never hand-writes a fetch call to the API. This also gives you a genuinely good line for interviews: contract-first between two services you own.

---

## 9. Data model (first cut)

```
users                 id, email, password_hash?, name, avatar_url, locale, theme, created_at
accounts              id, user_id, provider, provider_account_id        -- OAuth
sessions              id, user_id, expires_at, revoked_at, user_agent, ip_hash

lessons               id, repo, article_id, kind, folder, title, wave, difficulty,
                      status, content_hash, source_path, archived_at
                      UNIQUE (repo, article_id)
lesson_sections       id, lesson_id, anchor, heading, ordinal   -- drives the right rail
paths                 id, slug, title, description
path_items            id, path_id, lesson_id, ordinal

lesson_progress       user_id, lesson_id, status, furthest_section_ordinal,
                      seconds_read, started_at, completed_at
                      PK (user_id, lesson_id)
section_progress      user_id, lesson_section_id, seen_at
path_progress         user_id, path_id, current_ordinal, completed_at

quizzes               id, lesson_id, ordinal
quiz_questions        id, quiz_id, prompt, code_snippet, explanation
quiz_options          id, question_id, label, body, is_correct    -- never serialized to client
quiz_attempts         id, user_id, quiz_id, score, submitted_at
quiz_answers          attempt_id, question_id, option_id, is_correct

decks                 id, lesson_id, title
cards                 id, deck_id, front, back
card_reviews          user_id, card_id, ease, interval_days, due_at,
                      reps, lapses, last_reviewed_at
                      PK (user_id, card_id)

notes                 id, user_id, lesson_id, anchor, quoted_text, body, created_at
bookmarks             user_id, lesson_id, created_at
entitlements          user_id, scope, granted_at, expires_at
events                id, user_id?, name, props jsonb, occurred_at    -- partitioned monthly
```

**`content_hash` is the pivot.** Catalog sync compares hashes; unchanged articles are no-ops. A changed hash flags `lesson_progress` rows for optional invalidation — you decide per-change whether an edit is significant enough to reset completion. Do not auto-reset; a typo fix should not wipe a reader's streak.

**Never hard-delete a `lesson`.** Articles get renamed and moved (you have already done a `git mv` in `react-concepts`). Archive and add a `lesson_aliases` table mapping old `article_id` → new. That table also feeds the Next `redirects()` config, so old URLs keep working — which matters once anything is indexed.

---

## 10. Auth

**Nest is the identity provider.** You're learning Nest; auth is the most instructive module in it, and outsourcing it to Auth.js would hollow out the backend.

- Session cookie: `httpOnly`, `Secure`, `SameSite=Lax`, `Domain=.nxhhuy.tech`. Works across apex and `api.` with no CORS credential dance.
- Short-lived access token + rotating refresh token, refresh reuse detection → revoke family.
- **Single-flight refresh** on the client. You have this documented in `react-concepts` (`refresh-storm` recipe) — implement it exactly as written. The site becoming a live implementation of your own recipes is worth more than any of the individual features.
- OAuth: GitHub first (your audience has accounts), Google second.
- Rate limiting: `@nestjs/throttler` + Redis, on login/register/refresh.
- Password reset and email verification via BullMQ + Resend.

**Deliberately not doing:** magic links (delivery reliability in Vietnam is not a fight worth having), 2FA (Phase 5+, if ever), passkeys (interesting, not urgent).

**Anonymous progress:** track in `localStorage` with a client-side ID and migrate it into the DB on first signup. Requiring an account before a reader can see a completion tick will cost you readers.

---

## 11. Search

| Option | Verdict |
|---|---|
| **Pagefind** | ✅ **Phase 1.** Static index built at deploy, no backend, works offline, fast. Handles ~120 articles trivially. |
| Fumadocs built-in (Orama-based in recent versions) | Viable if the §6.1 spike lands cleanly — verify what it ships with rather than assuming. |
| Postgres FTS in Nest | Phase 4+, only if you want personalized ranking (e.g. surface completed articles differently). |
| Typesense / Meilisearch | Only if the corpus passes ~500 articles or you want typo tolerance + faceting. Real infra cost. Not now. |

Vietnamese-language handling is the one thing to check before committing: Pagefind's tokenization for Vietnamese diacritics needs verification if you ever add `vi` content (§16 Q2). English-only, it's a non-issue.

---

## 12. Deployment & cost

**Recommended v1:**

| Component | Host | Cost |
|---|---|---|
| Next.js | Vercel Hobby | $0 |
| NestJS | Fly.io (1 shared-cpu-1x, 512MB) | ~$5/mo |
| Postgres 18 | Neon free tier | $0 |
| Redis | Upstash free tier | $0 |
| Media | Cloudflare R2 | ~$0 |
| DNS | Cloudflare | $0 |
| **Total** | | **~$5/mo** |

**⚠️ Vercel Hobby prohibits commercial use.** The moment you gate a single lesson behind payment, you need Vercel Pro ($20/mo) or you move. Decide the monetization question before you build gating, not after.

**Alternative if cost or control matters:** single Hetzner CX22 (~€4/mo) + Coolify, running Next (standalone output), Nest, Postgres, and Redis in Docker Compose. Roughly the same money, more ops work, and you lose Vercel's Next-16-specific optimizations. Take this only if you specifically want the ops experience on your CV.

**Neon branching** gives you a DB branch per preview deploy for free. Wire it up in Phase 2 — preview environments with real isolated data is disproportionately valuable for a solo project.

---

## 13. CI gates

Extending the discipline that already works in the corpus repos.

| Gate | Fails on | New? |
|---|---|---|
| `verify-frontmatter` | Any article failing the zod union | Reused |
| `verify-links` | **Any** unresolved link — cross-repo now hard-fails (§5.4) | Stricter |
| `verify-code-blocks` | Drift between extracted blocks and demo source | Reused, runs on submodule content |
| `verify-catalog` | Duplicate `article_id`, orphaned `related` ref, path item pointing at a missing/draft article | **New** |
| `verify-submodules` | Any submodule dirty or on a floating ref rather than a tag | **New** |
| `verify-sidecars` | Quiz/deck YAML failing schema; quiz with 0 or >1 correct options | **New** |
| `verify-a11y` | Axe violations on a sampled route set | **New** |
| `lighthouse-ci` | LCP > 2.5s, CLS > 0.1 on the article template | **New** |
| `build` | `next build` + `nest build` | **New** |

The Lighthouse gate is not vanity. A site whose thesis is "everyone gets Next.js caching wrong" that ships a slow site loses the argument in the first five seconds.

---

## 14. On the reference site

Worth saying plainly: **the three-column docs layout is a convention, not their invention** — Docusaurus, Mintlify, Fumadocs, Stripe, and Nextra all ship it. Copying the structure is fine and expected.

What is not fine, and what you should deliberately avoid: their color palette, their specific illustrations, their component visual identity, their copy, and their brand feel. "We can adjust CSS" is the right instinct — go further than adjust. Pick your own accent, your own type scale, your own diagram style, so that side by side the two sites read as *the same category*, not *the same site*.

Their genuinely good ideas, worth taking as ideas: the tick-mark progress rail, the concept→usage mapping grid, the stepped simulators, quizzes interleaved after each section rather than dumped at the end. Take the pattern, rebuild the execution.

---

## 15. Phases

### Phase 0 — Spike & skeleton *(target: 1 week)*
1. Monorepo scaffold: pnpm workspaces + Turborepo + shared tooling configs.
2. **Blocking spike:** fumadocs-mdx × Next 16.3 × Cache Components (§6.1). Exit criterion is one real article rendering.
3. Submodule wiring for all four corpora + `sync-content.mjs` + `verify-submodules`.
4. Design tokens: color scales, type scale, spacing, dark/light `@theme` blocks in Tailwind v4.
5. `nxhhuy.tech` DNS → Vercel; deploy the skeleton.

**Gate:** the one-article render works and is live at a real URL.

### Phase 1 — Read-only corpus *(target: 3 weeks)*
6. Frontmatter adapters + zod union for all four repos.
7. `build-catalog.mjs`; catalog drives routes and the sidebar tree.
8. Full route tree; every completed article renders.
9. Chrome: sidebar, breadcrumb, TOC rail with `IntersectionObserver` scroll-spy, prev/next.
10. Shiki code blocks with copy/download/expand.
11. Pagefind search + `⌘K` dialog.
12. Mobile layout.
13. Corpus landing at `/en` (§15.1) and `/en/license`. **No personal content** — see §16 Q8.
14. SEO baseline: metadata, OG image generation, sitemap, `robots.txt`, JSON-LD.
15. Cache Components strategy per §6.2, verified against `.next/server/app/**.html` — **not** curl or view-source (your own finding).

**Gate: this is a complete, shippable, genuinely useful site with zero backend.** If everything after this slips six months, you have still shipped. Structure the work so this is true.

#### 15.1 What `/en` contains, now that it isn't a portfolio

The landing page argues for the corpus, not for a person:

1. **The thesis.** One paragraph on what makes this corpus different from the tutorial layer it competes with — claims traced to official docs, framework source, or measurement; code extracted verbatim from running demos rather than hand-written; CI gates that fail on drift. That is a genuinely uncommon claim and it is the whole pitch.
2. **Four corpus cards.** Name, one-line scope, article count, framework baseline, completion state. Links into each repo index. The three demo labs get a separate row — they are applications to run, not reading.
3. **Concept graph teaser.** A cropped view of the cross-corpus link graph (§5.4) with a link to the full view. This is the single most visually distinctive thing the site will have.
4. **Entry points.** "New to React" / "Debugging a specific problem" / "Browse everything" — three doors into the same material, matching the reference-first IA in §1.
5. **How to read this.** Concept vs. recipe, the difficulty vocabulary, the baseline-version convention.

Explicitly absent: name, photo, bio, work history, employers, clients, testimonials, contact form, social links, "hire me". A GitHub link to the `EverythingFromDayOne` org is a project link and is fine.

### Phase 2 — Backend & identity *(target: 3 weeks)*
16. Nest scaffold, TypeORM + Neon, migrations, Docker Compose for local dev.
17. `auth` + `users`: register, login, OAuth GitHub, refresh rotation, single-flight refresh on the client.
18. `catalog` sync endpoint + deploy-time push.
19. `progress`: lesson + section, anonymous→account migration.
20. Right rail wired to real progress via a streamed Suspense boundary.
21. OpenAPI → `packages/api-client` generation in CI.
22. Neon branch-per-preview.

**Gate:** log in, read an article, see progress persist across devices. API down → corpus still fully readable.

### Phase 3 — Retention loop *(target: 3 weeks)*
23. `content-schema` for quiz + deck sidecars; authoring pass over the highest-traffic articles.
24. Quiz component + `quiz` module; `mode: 'local' | 'server'` from day one.
25. Flashcards + `srs` module (FSRS over SM-2 — better retention, and more interesting to write about).
26. Tier-1 worker playground.
27. Notes + bookmarks + a `/review` dashboard: due cards, streaks, path progress.

**Gate:** a reader has a reason to come back tomorrow.

### Phase 4 — Depth *(target: ongoing)*
28. Stepped diagrams and simulators (event loop, reconciliation, prototype chain, Next.js cache lifecycle — the last one is uniquely *yours*, nobody else has it).
29. **Concept graph view** across all four corpora (§5.4) — the headline differentiator.
30. Paths layer with editorial framing.
31. Tier-2 Sandpack playgrounds where JSX genuinely needs rendering.
32. Analytics + admin.
33. `llms.txt` / MCP endpoint — you're writing a reference corpus in 2026; make it machine-readable.

### Phase 5 — Conditional
34. i18n (§16 Q2), entitlements + payments (§16 Q3), comments, RSS/newsletter.

---

## 16. Open questions

**Q1, Q2, Q4, Q6 — RESOLVED.** See the decisions log at §0.0.

---

**Q3 — Monetization. Open, and now urgent.** Determines whether `entitlements` is built at all, whether Vercel Hobby is permissible (it forbids commercial use), and whether quiz scoring must be server-side. Not urgent to *implement* — urgent to *decide*, because the quiz component's `mode: 'local' | 'server'` prop and the Phase 2 hosting choice both branch on it.

**Q5 — Media strategy. Open, recommendation standing.** The reference embeds video for closure and `this`. Video means production time, hosting cost, and content that goes stale independently of the article. **Recommend: SVG + motion-driven animation instead** — versionable, diffable, no bandwidth, sharper on retina, and it lives in the same CI gates as everything else.

**Q7 — How do the Angular demos attach to the shell? NEW, open.**

`AngularDemos` already deploys Angular 21 and Angular 15 to `ng21.` and `ng15.nxhhuy.tech`, and its own planned-next-steps name a "Next.js shell at `nxhhuy.tech`" with Angular 21 becoming "an NF remote or iframe embed." That shell is this project, so the decision lands here. Three options:

| Option | Cost | What it demonstrates |
|---|---|---|
| **Link out** — `/demos` lists them, opens the subdomains | ~zero | Nothing technically, but nothing breaks either |
| **iframe under `/en/demos/angular-21`** | ~1 day | Consistent chrome; honest about the boundary. Matches how `AngularDemos` already embeds v15 in v21 |
| **Cross-framework Native Federation** — Next hosts Angular 21 as a remote | High, and fragile | Genuinely impressive if it works |

Two things argue against option 3, and they are worth taking seriously because they are your own findings. First, `AngularDemos` currently has Angular 21 as the **NF host** with an empty manifest; making Next the host inverts that relationship and means rebuilding the federation setup on both sides. Second, `react-concepts` article 37 concluded that micro-frontends are an organizational solution with a ~4+ FE-team threshold, and that most teams regret early adoption. Shipping a fragile cross-framework MF setup on a solo project contradicts the article — and a reviewer who reads both will notice.

**Recommend: option 2, plus an ADR.** iframe embed under a `/en/demos/*` route with shared chrome, and a written architecture decision record explaining why cross-framework MF was rejected here and what the threshold would be. Module Federation is your strongest differentiator (Athena, `@eduloginc`, three-country teams) — but the way to demonstrate seniority with it is a defensible decision not to use it, not a brittle demo that proves you can.

**Q8 — RESOLVED.** No personal content. See §0.0 and §15.1.

The trade-off, stated once so it is a decision rather than a drift: the site stops functioning as a portfolio artifact you can point a recruiter at, because there is no page that says who built it. The corpus repos and the GitHub org still carry that signal, so the loss is smaller than it looks — but it is real, and reversing it later means adding exactly the pages this rule forbids. If the intent is only to avoid *employment* detail rather than all attribution, say so, because those are different rules.

---

---

## 17. Invented / inferred decisions

Stated explicitly per convention — all of these are mine, none came from you:

1. Single monorepo `corpus-web` over the proposed `corpus-web-fe` / `corpus-web-be` split (§4.0).
2. Reference-first, path-second information architecture (§1) — inferred from the mismatch between your reference-doc corpus and the reference site's linear-course IA.
3. URL scheme, including path positions as redirects to canonical article URLs.
4. Submodules-pinned-to-tags over the four alternatives (§5.1).
5. `content/` gitignored, to structurally prevent corpus edits from this repo.
6. Composite `id` as `${repo}/${article_id}`.
7. Node 22 on web / Node 24 on api — deliberate divergence, follows each corpus's stated baseline.
8. Sidecar + override split for interactive authoring (§7.3).
9. Nest as identity provider rather than Auth.js.
10. Fly.io + Neon + Upstash as the v1 hosting shape.
11. FSRS over SM-2 for scheduling.
12. Phase boundaries and the Phase-1-is-shippable constraint.
13. Every "recommend" in §16.
14. `AngularDemos` stays a separate repo and is not submoduled here.
15. The §15.1 landing-page contents — nothing about what replaces the portfolio was specified.
16. Six-file `.cursor/rules` split, with `.mdc` as canonical and `AGENTS.md` / `CLAUDE.md` generated under a CI drift gate.
17. The licensing carve-out to the Q8 rule — CC BY 4.0 requires naming a copyright holder, so `LICENSE` and `/en/license` are exempt.
18. Reading Q8 as covering seed/fixture data and OG images, not only page content.

---

## Approval checklist

- [ ] §1 reference-first IA and the paths-as-thin-layer model
- [ ] §2 domain topology (apex = Next, `api.` subdomain, no Multi-Zones)
- [ ] §3 version table, incl. the Node 22/24 split and the version-drift rule
- [ ] §4 monorepo layout, incl. gitignored `content/`
- [ ] §5 submodules-pinned-to-tags + adapter-based frontmatter unification
- [ ] §6.1 fumadocs-core adoption, contingent on the Phase 0 spike
- [ ] §6.2 Cache Components strategy
- [ ] §7 interactive layer scope + the corpus-stays-clean authoring rule
- [ ] §8 Nest module inventory (i.e. that Nest earns its place)
- [ ] §9 data model, incl. never-delete-a-lesson
- [ ] §10 Nest-as-IdP
- [ ] §11 Pagefind for v1
- [ ] §12 hosting shape + the Vercel Hobby commercial-use constraint
- [ ] §13 CI gates
- [ ] §15 phase order and the Phase-1-is-shippable constraint
- [x] §16 Q1, Q2, Q4, Q6 — resolved 2026-08-15 (§0.0)
- [ ] §4.0 single-monorepo argument
- [x] §16 Q8 — resolved 2026-08-15: no personal content (§15.1, §0.0)
- [ ] §15.1 landing-page contents
- [ ] §16 Q3 (monetization), Q5 (media), **Q7 (Angular demos)**
- [ ] §17 invented decisions

On approval: `prompts/session-1.md` — monorepo scaffold, content submodules, and the blocking fumadocs × Next 16.3 × Cache Components spike. Everything else is downstream of that spike result.

Q7 does not block anything before Phase 4. Q3 blocks Phase 2 hosting. Nothing blocks Phase 1.
