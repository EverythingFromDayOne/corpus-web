# Polish session — D18 POC accessibility defects (close)

**Branch:** off `develop`, PR to develop. Promote to main after Vercel Preview
verified.

**Scope:** close D18 entirely. Three remaining real defects after the prior
`article-shell.tsx` refactor.

## Background

D18 was opened 2026-08-19 tracking five POC a11y defects transcribed from the
captured screen recording. Two of the five are already resolved by the
`article-shell.tsx` refactor that shipped later in Phase 1:

| Defect | State today | File:line evidence |
|---|---|---|
| `#sbt`'s `aria-expanded` hardcoded `true` | ✅ already dynamic | `apps/web/components/article/article-shell.tsx:68` binds `aria-expanded={ctx.desktopOpen}` |
| Progress ring SVG has no name + duplicates `.pc` text | ✅ already fixed | `apps/web/components/article/sidebars.tsx:130-138` has `aria-hidden="true"` on the SVG plus a separate `<span className="av-prog-t">` showing `doneCount / lessonCount` |

Three defects remain and this prompt closes them.

## Defect 1 — sidebar search input has no label

**File:** `apps/web/components/article/sidebars.tsx`, lines 63–68

**Current code:**
```tsx
<input
  type="search"
  disabled
  aria-disabled="true"
  placeholder={t(messages, 'placeholders.search')}
/>
```

**Problem:** placeholders are NOT labels. A user using a screen reader or
voice control cannot identify this input's purpose. The existing
`<label className="sr-only" htmlFor="av-corpus-select">` pattern at line 44
shows the established solution in the same file — replicate it.

**Fix:** wrap the input with a real `<label>` and use `aria-disabled` (already
present) to communicate disabled state. Also add `aria-label` as a belt-and-
braces fallback. Match the surrounding code style — the existing label uses
`t(messages, 'article.chooseCorpus')` so add a new message key
`article.searchSidebar` or reuse an existing one if appropriate.

**New code shape:**
```tsx
<label className="sr-only" htmlFor="av-corpus-search">
  {t(messages, 'article.searchSidebar')}
</label>
<input
  id="av-corpus-search"
  type="search"
  disabled
  aria-disabled="true"
  aria-label={t(messages, 'article.searchSidebar')}
  placeholder={t(messages, 'placeholders.search')}
/>
```

**Message catalogue:** add `article.searchSidebar` to `apps/web/messages/en.json`
under the existing `article` block. Use a clear en-US string like
`"Search within this corpus"`. Vendored copy only — no third-party brand names.
Verify with `grep -ciE '\b(sydexa|100 days|ng-|nxhhuy@|vercel|tailwind)\b'`
on the changed file returns 0.

## Defect 2 — three of four status-dot states are colour-only

**File:** `apps/web/components/article/sidebars.tsx`, lines 79–89 (the article
list inside `CorpusSidebar`)

**Current code:**
```tsx
<a ... aria-current={on ? 'page' : undefined}>
  <i className={`av-dot${on ? ' now' : done ? ' done' : ''}`} />
  {article.title}
</a>
```

**States in scope:**
- `now` — currently reading this article. The parent `<a>` gets `aria-current="page"`, so screen readers DO announce this. ✅
- `done` — completed. Nothing in the DOM says "completed" except the colour. ❌
- (default) — not started. Implicit — no announcement needed, but should be `aria-hidden` on the decorative dot. ⚠️

**Problem:** the dot is a non-semantic `<i>` carrying colour-only state for
the `done` case. Users on screen readers can't tell whether an article is
completed.

**Fix:** add `aria-hidden="true"` to the dot (it's decorative), and append
`<span className="sr-only">` for the `done` state. The `now` state is already
announced via `aria-current="page"` on the parent — no extra span needed.

**New code shape:**
```tsx
<a
  key={article.uid}
  href={articlePath(locale, article.repo, article.articleId)}
  className={on ? 'on' : undefined}
  aria-current={on ? 'page' : undefined}
>
  <i className={`av-dot${on ? ' now' : done ? ' done' : ''}`} aria-hidden="true" />
  {article.title}
  {done ? <span className="sr-only"> (completed)</span> : null}
</a>
```

**Verify** the `.sr-only` class already exists in the codebase by reading
`apps/web/components/article/article.css` — confirm it's defined with the
usual 1×1px absolute clip pattern, do not re-define.

## Defect 3 — closed mobile drawer keeps focusable elements in tab order

**File:** `apps/web/components/article/article-shell.tsx` (the `ChromeContext`
provider / `desktopOpen` / `mobileOpen` state) and
`apps/web/components/article/sidebars.tsx` (the `<aside>` consumer).

**Investigate first, then fix.** Read the relevant state flow:

1. `apps/web/components/article/article-shell.tsx` — find the `ChromeContext`,
   the `toggle()` callback, and the `mobileOpen` setter.
2. `apps/web/components/article/sidebars.tsx` line 37 / 120 — the
   `<aside className={sidebarClassName(desktopOpen, mobileOpen)} ...>` —
   and the `sidebarClassName` helper.
3. The CSS class is `.av-sb` (sidebar) and the mobile drawer is shown via
   `.av-view.mobsb .av-sb { transform: translate(0) }` per
   `apps/web/components/article/article.css` (the `@media (max-width:1000px)`
   block).

**Problem:** when the drawer is closed on mobile, the CSS uses
`transform: translate(-102%)` to slide it off-screen. Off-screen is NOT
hidden — the `<select>`, `<input type="search">`, and ~9 `<a>` links inside
the sidebar remain in the tab order and receive focus when a user tabs
through. Screen reader users also still see the links because the
`visibility` is not `hidden`.

**Fix:** add the `inert` attribute (HTML attribute, not ARIA) to the `<aside>`
when `mobileOpen` is `false` AND viewport is mobile. `inert` removes all
descendants from the tab order AND hides them from the accessibility tree.
The desktop collapse path already handles this correctly via
`.av-view>.av-sb.collapsed { visibility: hidden; ... }` per the same
`article.css` — do not break that path.

**New code shape (in both `CorpusSidebar` and `CurriculumSidebar`):**
```tsx
<aside
  className={sidebarClassName(desktopOpen, mobileOpen)}
  aria-label={t(messages, 'article.corpusNav')}  /* or 'curriculumNav' */
  inert={!mobileOpen ? true : undefined}
/>
```

**Note:** React 19 supports the `inert` attribute as a boolean prop. The
attribute is omitted when `mobileOpen` is `true` (rendered with no value),
present (rendered as `inert=""` or just `inert`) when false. Use
`inert={!mobileOpen ? true : undefined}` so React omits the attribute when
not needed.

**Verify** the desktop collapse path still works after this change:
- Desktop sidebar collapse uses `desktopOpen` state, separate from
  `mobileOpen`. The `inert` should only fire on the mobile drawer path.
- If the sidebar is collapsed on desktop, the CSS `visibility: hidden`
  already handles keyboard/screen reader hiding. Do not add `inert` to
  the desktop case.

## Verification gate (do not skip)

After the changes:

1. `pnpm typecheck` — green (no new errors introduced by this prompt).
2. `pnpm verify:frontmatter` — 196/196 articles adapt cleanly.
3. `pnpm verify:links` — pre-existing D38 content-half failure is
   expected (NOT caused by this PR). Triage per the cursor-slack-relay
   skill.
4. `pnpm --filter @corpus/web build` — green.
5. `pnpm verify:prerender` — green; 181 blog + 12 lesson HTML files
   under `.next/server/app`.
6. **Manual mobile-drawer check via Playwright or curl** (if Playwright
   is set up; otherwise skip and note in PR body):
   - Open the article page on a 390px viewport.
   - Tab through without opening the drawer.
   - Confirm focus does NOT enter the sidebar `<aside>` (no link
     highlight on tab-stop).
   - Open the drawer (click the toggle). Confirm focus DOES enter.
7. **Manual screen-reader sanity check** (skip if no SR available; note
   in PR body):
   - VoiceOver on macOS, navigate to `/en/blog/react/suspense`.
   - Confirm the search input announces as "Search within this corpus,
     dimmed" or similar.
   - On a completed article (`done` state), confirm the link announces
     as "Thinking in React, completed" (note the comma from the
     `<span className="sr-only">`).

If any of the manual checks cannot be performed, state that in the PR
body under a "Known limitations" heading — do not silently skip.

## Invented decisions

- **Don't replace the `<i>` dot with a `<span role="img">`.** The dot is
  decorative; `aria-hidden` is correct. `role="img"` would require
  `aria-label` and would actually make the announcement noisier without
  adding information.
- **Don't change the colour tokens.** The CSS color-only distinction
  (graphite / verified / signal) is part of the design system and is
  used in many places. The fix is to add semantic information alongside
  the colour, not to change the colour palette.
- **Use `inert` (not `aria-hidden` or `tabIndex={-1}` on each child).**
  `inert` is the modern, single-attribute solution and matches the
  HTML spec. Per-child tabindex management is fragile and breaks the
  next time someone adds a focusable element to the sidebar.

## Known issues / next steps

- D20 (Shiki code blocks with copy/download/expand) is the next polish
  item but is a substantial feature on its own (dual-theme under Cache
  Components, copy/download/expand buttons, markdown rendering pipeline
  integration). It deserves its own session and its own prompt file.
- D19 stubs remain in place. Real axe-core + Lighthouse CI + Playwright
  implementation requires a design call first (axe's WCAG 2.2
  `target-size` rule fails the rail's 18×2px ticks — "axe clean" and
  "matches the POC" may be mutually exclusive).
- D38 content-half (44 unresolved refs in nextjs/nestjs submodules) is
  unrelated to this prompt; do not attempt to address it here.

## Files in scope for this PR

- `apps/web/components/article/sidebars.tsx` — Defects 1, 2, 3
- `apps/web/messages/en.json` — add `article.searchSidebar` key
- `apps/web/components/article/article.css` — only if `.sr-only` is
  undefined (confirm before adding)

## Files explicitly NOT in scope

- `apps/web/components/article/article-shell.tsx` — already correct for
  the D18 defects we're closing; do not touch unless the `inert`
  change requires a context update (it should not — `mobileOpen` is
  already in scope).
- `apps/web/components/article/toc-rail.tsx` — D18 does not list the
  TOC rail; leave it alone.
- `apps/web/components/chrome/*` — chrome layer is separate from the
  article chrome; D18 is article-chrome-only.

## Commit convention

Three commits, in this order, in the PR:

1. `fix(a11y): label the sidebar search input (D18 defect 1)`
2. `fix(a11y): announce completed-article state on sidebar links (D18 defect 2)`
3. `fix(a11y): make mobile drawer inert when closed (D18 defect 3)`

Each commit must pass `pnpm typecheck` and `pnpm --filter @corpus/web build`
on its own. Don't bundle them into one mega-commit — easier to review and
easier to revert individually if a defect turns out to be misdiagnosed.
