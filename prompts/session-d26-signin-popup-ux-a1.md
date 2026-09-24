# Session 202 — D26 sub-slice A.1: sign-in popup UX bug fixes

**Branch:** `feat/d26-signin-popup-ux` (already exists, already has PR #184 open against
`develop`). Continue work on this SAME branch — do not cut a new one. New commits land
on top of `be6540e`. PR #184 will pick up the new commits automatically; do not open a
second PR.

**Scope:** four UX bugs Huy found by clicking through the live Vercel preview deploy of
PR #184. This is a bugfix pass on sub-slice A, not a new slice. Fix exactly these four
and nothing else.

## Context — what shipped and what's wrong

`apps/web/components/chrome/sign-in-button.tsx` (see the file's own docstring, lines
1-32, for the full original design) opens a centered popup to
`${NEXT_PUBLIC_API_URL}/auth/google` and polls `GET /me` every 2s to detect sign-in
completion. Huy clicked through it on the preview deploy and found:

### Bug 1 — state resets on navigation

Repro: `/home` → click "Sign in" → popup opens → processing state shows → navigate to
`/courses` (or any other route) while the popup is still open → the sign-in button on
the new page shows "Sign in" again, not "Signing in…". The component's `useState` /
`useRef` state lives inside `<SignInButton>`, which is inside `<SiteHeader>`, which is
re-rendered as a new instance on every route change because it's a Server Component
child re-mounted per-route via `apps/web/app/[locale]/layout.tsx` → `<SiteHeader>` on
each navigation (client component state does not survive a full remount across the App
Router's per-segment tree when the parent server component re-renders with new params).

**Fix:** hoist the sign-in-in-progress state to a Context so it survives the
`<SiteHeader>` remount. Provider goes in `apps/web/app/[locale]/layout.tsx` alongside
the existing `<ArticleChromeProvider>` (see `apps/web/components/article/article-shell.tsx`
for the precedent pattern — `createContext` + a `use*` hook that throws if used outside
the provider). Keep the context value to the boolean-ish state only (`processing` and a
setter, or equivalent) — do NOT hoist the popup ref, interval ref, or fetch logic itself;
those can stay local to the component instance that owns the actual `window.open` call,
as long as the *displayed* processing state is read from Context so every button
instance across route changes shows the same state.

**Decided (no new dependency):** use React Context, not Zustand or any other state
library. Checked — no state-management package exists in `apps/web/package.json` or
root `package.json`. `.cursor/rules/20-never-violate.mdc` requires stopping to ask
before installing any new npm package; Context needs zero new packages and there's
already a working precedent (`ArticleChromeProvider`) to mirror. Do not introduce
Zustand or anything else.

### Bug 2 — polling antipattern; switch primary signal to `postMessage`

The current design polls `GET /me` every 2s for up to 60s regardless of the actual OAuth
completion time — wasteful (every 401 in that window is a wasted round trip) and slow to
react (up to 2s of user-visible lag after the popup actually closes/succeeds).

**Fix:** primary success signal becomes `window.postMessage` from a new callback page,
not polling. Polling stays ONLY as an infrequent safety net (5-10s interval, not 2s) in
case `postMessage` doesn't fire for some reason (e.g. popup navigated away, or a browser
oddity).

New file: `apps/web/app/auth/google/callback/page.tsx` (flat route, NOT a route group —
matches D55's flat-route convention already used elsewhere in `apps/web/app/`). This is
the page the popup window lands on immediately after the API's
`GET /auth/google/callback` redirect completes (see
`apps/api/src/modules/auth/auth.controller.ts` — it 302s the browser to
`${WEB_ORIGIN}/` on success today; that target does NOT need to change on the API side —
this new page is a WEB-side route the popup can land on and message its opener from
before/instead of the plain `${WEB_ORIGIN}/` redirect target. Read the controller's
existing redirect logic before touching anything — if changing the redirect target is
required to land the popup on this new page, that's an `apps/api` change, in scope for
this same PR, minimal: just changing the string literal target of `res.redirect(302,
...)` on success, from `${webOrigin}/` to `${webOrigin}/auth/google/callback`. Do NOT
touch the failure-path redirect, do NOT touch `/auth/logout`, do NOT touch session
lifecycle, cookie writing, or `req.login()`.

The new `apps/web/app/auth/google/callback/page.tsx`:
- Client component (`'use client'`).
- On mount, calls `window.opener?.postMessage({ type: 'oauth-success' }, window.location.origin)`
  then `window.close()`.
- If `window.opener` is null (e.g. someone navigates here directly, not via the popup
  flow), render a minimal redirect-to-home fallback — do not leave a dead page. A simple
  `useEffect` that does `window.location.replace('/')` when there's no opener is enough;
  no new UI polish needed here, this is an edge case, not the main path.
- No new i18n needed for this page — it should be visually near-instant/blank
  (open → close), not a page a human is meant to read. If you need ANY visible text for
  a no-opener fallback moment, it must go through the message catalogue
  (`topbar.*` or a new top-level key in `en.json`) — never a hardcoded string, per
  `.cursor/rules/20-never-violate.mdc`'s "NEVER hardcode a user-visible string" rule.

In `sign-in-button.tsx` (or wherever the Context provider now owns the listener):
add a `window.addEventListener('message', handler)` that:
- Validates `event.origin === window.location.origin` (the popup's callback page and the
  parent are same-origin — both are `apps/web`, this is NOT a cross-origin postMessage,
  so validate against the web app's own origin, not `WEB_ORIGIN` env — there is no need
  to read `WEB_ORIGIN` from the client; `window.location.origin` is correct and simpler).
- Checks `event.data?.type === 'oauth-success'`.
- On match: revert to signed-in-looking state immediately (whatever the existing
  `revert()`-on-success path already does), no more waiting on the next poll tick.
- Remove the listener on unmount / after firing once.

Keep the polling code path (rewritten to 5-10s interval, see Bug 2.1) as the fallback —
don't delete it, just slow it down and make `postMessage` the fast path.

### Bug 2.1 — popup redirects to `localhost:3000`, no callback route exists

This is the direct consequence of Bug 2's fix landing: right now there IS no
`/auth/google/callback` page on the web side (the API's success redirect target is
`${WEB_ORIGIN}/`, i.e. plain `localhost:3000` in dev, not any callback path) — so the
popup currently redirects to the bare homepage, which is NOT wired to detect it's inside
a popup and doesn't postMessage anything. Fixing this IS registering the new route from
Bug 2 (`apps/web/app/auth/google/callback/page.tsx`) AND updating the API's success
redirect target string to point at it, as described above. Same PR, same commit or a
logically separate commit — your call, but both halves (web page + api redirect target)
must land together or the popup flow is broken.

### Bug 2.2 — 401-debounce never triggers

In the current `tick()` function (see lines 97-129 of the pre-fix
`sign-in-button.tsx`), `last401AtRef.current = Date.now()` is stamped on **every** 401
response seen during polling — including while the popup is still open and repeatedly
polling. That means by the time the popstate closes, `last401AtRef.current` is *always*
recent (it was just stamped moments ago on the last poll tick), so
`elapsedSince401 >= 5000` in the popup-closed branch (line 101-102) essentially never
evaluates true within a normal click-to-close gap — the debounce window's intent (give a
slow callback write 5s of grace after the user closes the popup) never actually gets
exercised because the timestamp keeps getting refreshed while the popup is still open,
independent of when the popup actually closed.

**Fix:** only stamp `last401AtRef` (or whatever the equivalent debounce-anchor field is
after the Bug 1/2 refactor) on the **popup open→closed transition**, not on every 401
tick. I.e., detect the moment `popup.closed` flips from false to true (or the moment you
notice it in a tick), and stamp the anchor timestamp THEN — not on every 401 response
received while it's still open. The elapsed-since-close check should measure "how long
since the popup closed", not "how long since the last 401", which is the actual bug —
the variable name says one thing and the code measures another.

### Bug 4 — 60s hard timeout is a footgun

**Repro:** if the OAuth flow legitimately takes >60s (slow network, user takes their
time on Google's consent screen), the current `setTimeout(() => revert(), 60_000)` fires
regardless of whether the popup is still open and the user is still mid-flow — the
button silently reverts to "Sign in" while the popup is still sitting there open,
confusing state.

**Fix:** remove the blanket 60s force-revert entirely. Reasons to revert become:
- `postMessage` success (Bug 2's fast path) → revert to signed-in.
- Popup closed by the user without ever getting a success message → revert after the 5s
  post-close debounce (Bug 2.2, fixed) confirms no pending write.
- No more "OAuth simply took too long" timeout — as long as the popup is open, let it
  run. There's no user-hostile infinite-hang risk here because the ONLY way to stay
  "processing" indefinitely is to keep the popup open indefinitely, which is the user's
  own choice, not a bug.

## Files in scope

1. `apps/web/components/chrome/sign-in-button.tsx` — Context consumption, postMessage
   listener, slowed-down polling fallback (5-10s not 2s), debounce-anchor fix, timeout
   removal.
2. `apps/web/app/[locale]/layout.tsx` — new Provider wrapping (or a new small dedicated
   file for the context + provider, imported into layout — follow the
   `ArticleChromeProvider` precedent for where the context module itself lives; it's
   currently colocated in `apps/web/components/article/article-shell.tsx`, so a
   reasonable choice is a new `apps/web/components/chrome/sign-in-context.tsx` sibling
   file, imported both by `layout.tsx` for the Provider and by `sign-in-button.tsx` for
   the hook).
3. `apps/web/app/auth/google/callback/page.tsx` — NEW FILE, the postMessage-and-close
   landing page.
4. `apps/api/src/modules/auth/auth.controller.ts` — one-line change to the success
   redirect target string (see Bug 2.1). Do not touch anything else in this file.
5. `apps/web/messages/en.json` — ONLY if the no-opener fallback needs a visible string;
   otherwise no change. **No `vi.json` change under any circumstance** — English-only
   ships, per `roadmap.md` §16 Q2 and `.cursor/rules/20-never-violate.mdc`'s
   locale rule. This has already been the correct call twice in this D26 sub-slice; keep
   it that way.

## Docs to update (same PR)

- `docs/DEBT.md` — D26 row: append a note describing the A.1 fix landing (do not remove
  or rewrite the existing sub-slice A description; append to it). Follow the safe
  append pattern from session 200/201: anchor edits so they don't corrupt the row —
  read the row fully before editing, use a targeted patch, not a blind text replace.
- `.agents/SESSION-LOG.md` — new entry per the mandatory session-protocol format (see
  `AGENTS.md` "After EVERY session" section — branch, files changed with one-line
  reasons, why, invented decisions [should be "none" if you follow this spec exactly],
  known issues/next steps).
- `CHANGELOG.md` — new dated entry under `## [Unreleased]`, bullets only
  (Added/Changed/Removed/Fixed), no paragraphs.
- `progress.md` — update only if a status flag actually changes; this is a bugfix on an
  already-GREEN item, so likely no flag change is needed, just note the fix landed if
  `progress.md` tracks sub-slice A explicitly. Use the safe `cat >>` / anchor-on-trailing-
  `---`-separator append pattern, not `text.replace()` on a mid-paragraph fragment
  (session 199/200 lesson — corruption risk).

## Gates — must all exit 0 before you report done

Same gate set as the original sub-slice A dispatch: typecheck, lint, build (both
`apps/web` and `apps/api` since `auth.controller.ts` changes), unit tests, agents:check,
verify-submodules, frontmatter validation, link validation, catalog build. Run
`pnpm verify` (or whatever the repo's canonical all-gates command is — check
`package.json` scripts) and paste the actual output, not a paraphrase.

Specifically also re-verify:
- `react-hooks/rules-of-hooks` — all hooks unconditional, before any early return, in
  every touched component (this was clean in the original; keep it clean through the
  Context refactor).
- No raw hex values, no inline styles (`.cursor/rules/20-never-violate.mdc`).
- No hardcoded user-visible strings outside the message catalogue.
- `'use client'` boundary correctness — no class instances crossing it.

## Manual verification — REQUIRED, do not substitute bundle-content greps

The previous sub-slice A dispatch substituted "grep the built JS bundle for
`window.open` / `setInterval`" for actually clicking through the flow, and Echo
correctly flagged that as a real gap (evidence the code ships the logic, not evidence
the logic works). This CLI still has no real browser, so the same limitation applies —
but this time say so explicitly and do not imply verification happened when it didn't.
If you cannot spin up a real Google OAuth flow and click through it, say plainly in the
PR body: "Manual scenarios NOT run — no browser available in this environment" and list
exactly which of the 4 scenarios below remain unverified. Do not present bundle
inspection as equivalent to a click-through.

The 4 scenarios Huy (or whoever verifies on the preview deploy) needs to check:
1. Sign in from `/`, navigate to `/courses` mid-flow, confirm the button still shows
   "Signing in…" on the new page (Bug 1 fix).
2. Complete a real Google sign-in and confirm the button flips to signed-in state
   near-instantly (not after a 2s poll lag) — confirms `postMessage` fired (Bug 2/2.1
   fix).
3. Open the popup, then close it without completing sign-in — confirm the button
   reverts to "Sign in" within roughly 5s, not instantly and not stuck (Bug 2.2 fix).
4. Leave the popup open and idle for well over 60s without completing sign-in — confirm
   the button STAYS in "Signing in…" state (does not force-revert) as long as the popup
   remains open (Bug 4 fix — the removed-timeout behaviour).

## Out of scope — do not touch

- Avatar dropdown / sign-out button / profile page (D26 sub-slice B).
- `POST /progress/migrate` (D26 sub-slice C, `apps/api`).
- Refresh tokens, RBAC, `/auth/logout` CSRF.
- `/me` → `/auth/me` rename.
- `NEXT_PUBLIC_API_URL` architecture (ADR-0004, already shipped).
- Any change to `/auth/logout` or the failure-path (`?auth=error`) redirect.
- Any new npm package. Context only, zero new dependencies.
- Any Vietnamese string or `vi.json` entry.

## If you hit a spec ambiguity

Stop and ask Lead (not Echo) — this preempts the same way the original sub-slice A
dispatch did. If the `clarify` tool is unavailable in this session, stop, write down the
exact question in the PR body under a "Needs Lead input" heading, and do NOT guess at
UX behavior that isn't specified here.

## Reporting

Same PR #184 (new commits on `feat/d26-signin-popup-ux`), OR if for tooling reasons a
fresh commit workflow is easier, still target the same branch — do not open a second PR
for this fix. Update the PR body (not just add a comment) to describe the bug-fix
commits, matching the existing PR body's structure. Report to Lead when done, mentioning
explicitly: gate results (paste actual output), the manual-verification status (honest
disclosure per above), and any deviations from this spec.
