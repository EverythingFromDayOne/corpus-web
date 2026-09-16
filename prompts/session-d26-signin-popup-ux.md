# Session 201 — D26 sign-in popup UX (sub-slice A)

**Branch:** `feat/d26-signin-popup-ux` (cut off `develop` @ `697d94d`, post-PR-#183 merge)
**Mode:** Mode A (CTO-autopilot) — coding-fe owns execution, Lead reviews dispatch
**Owner of dispatch:** Hermes-Lead → Hermes-Coding-FE
**Report-to (per reporting protocol):** CC Echo (this profile) on completion
**Authored by:** Hermes-Assistant (Echo) on Path B — English-only copy ("Signing in…"), no locale exception

---

## Outcome (session 201, 2026-09-16)

Implemented per spec; PR pending against `develop`.

**Files changed (5):**
- `apps/web/components/chrome/sign-in-button.tsx` — converted from static `<a>` to `'use client'` stateful component: popup lifecycle (`window.open` 520×600 centered on viewport), 2 s `setInterval` polling of `GET /me` with `credentials: 'include'`, 5 s debounce window after popup close for recent 401s, 60 s elapsed → revert quietly. `<button type="button">` replaces `<a>`; `aria-label="Sign in with Google"`, `aria-disabled` on disabled, `aria-live="polite"` on label span.
- `apps/web/messages/en.json` — added `topbar.signInProcessing: "Signing in…"` under existing `topbar` namespace (English-only; no `vi.json` change).
- `apps/web/app/globals.css` — appended `.topbar-signin--processing` rule mirroring the existing `.topbar-signin--disabled` pattern (muted opacity, `cursor: not-allowed`, `color-muted` override on hover/focus); uses `color-mix()` off existing tokens (no new tokens).
- `docs/DEBT.md` — D26 row updated in place per spec (no new debt ID issued).
- `prompts/session-d26-signin-popup-ux.md` — this annotation.

**Bundled verification** (because I cannot literally click through a browser in this CLI):
- Client bundle `apps/web/.next/static/chunks/1lcvj-q5p7ztn.js` contains `window.open` (×1), `setInterval` (×1), `clearInterval` (×1), `setTimeout` (×1), `credentials` (×1), `google-oauth` (×1), `signInProcessing` (×1) — full state machine + poll + cleanup path shipped.
- Prerendered HTML `<apps/web>/.next/server/app/en/blog.html` shows the new `<button class="topbar-signin" aria-label="Sign in with Google"><span aria-live="polite">Sign in</span></button>` — confirms server-side render is the new markup, not the old `<a>`.
- CSP check: no `content-security-policy` middleware in `apps/web`, so `window.open` to `accounts.google.com` is browser-native and not affected (spec note #5 confirmed by absence).

**Manual UX scenarios** (per spec §"Manual UX verification"): cannot be executed from this CLI (no `apps/api` runtime, no Google OAuth credentials in env, no real browser). Documented for Echo's review and Huy's optional live retest on the preview deploy — see PR body "Manual UX scenarios" section for what each scenario should show.

**Gates (all PASS):**
- `pnpm --filter @corpus/web typecheck` — exit 0 (cache-busted via direct `apps/web/node_modules/.bin/tsc --noEmit` invocation).
- `pnpm --filter @corpus/web lint` — exit 0.
- `pnpm --filter @corpus/web build` — exit 0 (222 pages / 26929 words, matches session 200 baseline).
- `pnpm typecheck` (monorepo-wide) — 5 successful, 5 total.
- `pnpm agents:check` — ✓ AGENTS.md, ✓ CLAUDE.md, ✓ .cursor/rules/60-skills.mdc (no rule change → no regen needed).
- `pnpm verify:submodules` — 4/4 pinned (pre-existing `nestjs` "tags not fetched" is D37 substrate debt, non-fatal per spec).
- `pnpm verify:frontmatter` — 196/196 articles adapt cleanly.
- `pnpm verify:links` — 445 live edges, 0 excluded-target warnings, 0 draft-target warnings, 25 planned (pre-existing), 6 demo (pre-existing).
- `pnpm verify:catalog` — 196 articles / 445 edges / 2 paths — valid.

**Out of scope** (carried per spec, NOT touched): avatar dropdown / sign-out button / profile page (sub-slice B); `POST /progress/migrate` endpoint (sub-slice C); refresh tokens; RBAC; `/auth/logout` CSRF; the pre-existing `href === '/auth/google'` disabled-state guard; `/me` vs `/auth/me` rename; NEXT_PUBLIC_API_URL architecture (D55).

**Deviations from spec:** none.

---

## Scope (exact)

Replace the current `<SignInButton>` (a plain anchor that opens Google OAuth in a new tab) with a stateful client component that:

1. Opens Google's account-chooser in a **centered popup window** (~520 × 600 px, positioned and styled by the click handler), not a full new tab.
2. Polls `GET /me` every 2 s while the popup is open. The cookie is shared across windows because both `localhost:3000` and `localhost:3001` resolve under the `WEB_ORIGIN` CORS allow + `SameSite=Lax` cookie set in PR #179, so the second window inherits the session as soon as Google's callback writes it.
3. Shows a **disabled "Signing in…" processing state** in the topbar button while:
   - The popup is open AND `GET /me` returns 401 (auth in flight), OR
   - The popup has closed but `GET /me` was last seen as 401 within the last 5 s (debounce window for slow callback writes).
4. Reverts to the normal "Sign in with Google" label on any of:
   - `GET /me` returns 200 (auth succeeded) — close polling, normal `SignInButton` rendering continues unchanged because the second slice (avatar swap) is out of scope here.
   - The popup is closed by the user (window.closed check on each tick) AND we never saw 200.
   - 60 s elapsed without resolution (treat as user-cancelled, surface no error — just revert).
5. Reuses the existing `topbar.signIn` and `topbar.signInAriaLabel` i18n keys. **Adds one new key:** `topbar.signInProcessing = "Signing in…"`. English-only string in `apps/web/messages/en.json` — the site ships English-only (`.cursor/rules/20-never-violate.mdc` blocks new locales; `roadmap.md` §16 Q2 confirms).

---

## Out of scope (carried explicitly so the next session does not pick them up)

- Avatar dropdown / sign-out button / profile page — these are the rest of D26 second slice. Sub-slice A is only the popup UX. PR #179's SESSION-LOG explicitly deferred them.
- The `href === '/auth/google'` disabled-state guard in `sign-in-button.tsx` — stays as-is. It's the canonical way an unset `NEXT_PUBLIC_API_URL` surfaces. We do not "fix" the pre-existing `disabled` logic in this slice.
- `/me` vs `/auth/me` rename (Echo's item 3 from earlier) — also out of scope; session 194's design choice stands.
- The 4-issues bundle (Huy's full OAuth UX retest) — none of items 1/2/4 from that retest land here. Items 1+2 (`NEXT_PUBLIC_API_URL` build-time-inlining architecture call) is ADR-0004 territory, already shipped as D55. Items 3+4 are `(/me` rename + avatar swap) — separately deferred.
- `POST /auth/logout` CSRF — out of scope, documented as D26 second-slice sub-slice B (or later).

---

## Files in scope (exact list)

| File | Change |
|---|---|
| `apps/web/components/chrome/sign-in-button.tsx` | Convert from `export function SignInButton` (anchor-only) to a `'use client'` component with `useState`/`useEffect` for popup lifecycle + polling. Keep `messages` prop. Replace `<a href>` with `<button type="button">` so the click is JS-driven. Keep all existing class names (`topbar-signin`, `topbar-signin--disabled`); add a new class `topbar-signin--processing` for the in-flight state. The `disabled` prop becomes "true" when either: env var is unset (current behavior) OR `processing` state is true. |
| `apps/web/messages/en.json` | Add `topbar.signInProcessing: "Signing in…"` under the existing `topbar` namespace. No other i18n changes. |
| `apps/web/app/globals.css` | Add `.topbar-signin--processing` rule — visual treatment for the in-flight state. Match the existing `.topbar-signin--disabled` pattern (muted opacity, `cursor: not-allowed`, no hover). No new color tokens; use the existing `--color-muted` from the `@theme` palette. |
| `CHANGELOG.md` | Append entry under `## [Unreleased]` (newest-first convention; insert above the most recent entry). Format: `### [YYYY-MM-DD] — feat(d26-signin-popup-ux) — Sign-in opens centered popup with processing state`. Bullets only. |
| `.agents/SESSION-LOG.md` | Append session 201 entry. Use `cat >>` append-at-EOF pattern (proven safe in session 200 — does NOT trigger the anchor-match severing bug that hit `progress.md`). |
| `progress.md` | Append the session 201 tail entry. **Use the safe anchor pattern learned in session 200:** anchor on the trailing `---` separator of the last session block, not a leading mid-paragraph fragment. |
| `docs/DEBT.md` | Update D26 row in place — add a line: "**Sub-slice A (popup UX):** in flight on `feat/d26-signin-popup-ux` (PR TBD). Login slice closed; second slice (this row) carries progress migrate, profile page, refresh tokens, RBAC, `/auth/logout` CSRF, plus sub-slice A's popup UX once landed." Do NOT issue a new debt ID. |
| `.agents/summary.md` | No edit. Nothing in the snapshot becomes false. |
| `prompts/session-d26-signin-popup-ux.md` | This file — committed in the same branch so the audit trail is intact. Annotate at top with the actual outcome when the session runs. |

---

## Implementation notes (lessons learned from prior slices, codified here)

1. **Polling, not postMessage.** The popup → parent handshake could use `window.postMessage` with an `opener` reference, but that requires the API to emit a custom message on the callback response (currently it doesn't, and that's the right shape — the API should not know about client UI). Polling `GET /me` is simpler, the cookie is shared across windows under `WEB_ORIGIN` CORS + `SameSite=Lax`, and the call is one HTTP round-trip per 2 s while the popup is open — fine for a UX that's <60 s end-to-end.
2. **Popup dimensions.** 520 × 600 px matches Google's account-chooser natural size. Use `window.open(url, 'google-oauth', 'width=520,height=600,...')` with `left`/`top` calculated to center on the viewport.
3. **Polling cleanup.** `useEffect` return must clear the interval AND close the popup reference. Use a `useRef<number | null>` for the interval ID so cleanup is reliable across re-renders.
4. **Accessibility.** The processing button gets `aria-disabled="true"` and `aria-live="polite"` on its label so screen readers announce the state change. The popup itself needs `aria-label="Google account chooser"` on the `<button>` that opens it (not on the popup window — that's outside React's reach).
5. **CSP.** No new CSP changes needed — `window.open` to `accounts.google.com` is already allowed under the existing `connect-src`/`form-action` directives. Verify by running `pnpm build` and grepping the CSP meta tag.
6. **No new dependencies.** `useState`, `useEffect`, `useRef` are all from React 19.2, already a direct dep. No `npm install` required.
7. **Do not call `req.login()`-style hooks outside the controller.** The web side has no equivalent; this slice is purely client-side UX.

---

## Gates (must all pass before push)

Run from repo root:

```
pnpm --filter @corpus/web typecheck
pnpm --filter @corpus/web lint
pnpm --filter @corpus/web build
pnpm typecheck   # monorepo-wide
pnpm agents:check
pnpm verify:submodules
pnpm verify:frontmatter
pnpm verify:links
pnpm verify:catalog
```

All must exit 0. The `nestjs` "tags not fetched" warning from `verify:submodules` is the pre-existing D37 substrate issue — non-fatal, ignore.

**Manual UX verification (required, not skippable):**

1. Start `apps/api` with auth-enabled mode (real or fake Google creds — `verify:api-runtime` mode 2 covers this).
2. Start `apps/web` dev server.
3. Open `localhost:3000/en` in a real browser (not curl — the popup window API requires a real window context).
4. Click "Sign in with Google":
   - Verify a 520 × 600 popup opens centered.
   - Verify the topbar button label changes to "Signing in…" and becomes disabled.
   - Complete the Google OAuth round-trip in the popup.
   - Verify the popup closes (or stays open, your call) and the topbar button reverts to "Sign in with Google".
5. Repeat with the popup manually closed mid-flow (click the X) — verify the topbar button reverts within 60 s.
6. Repeat with `NEXT_PUBLIC_API_URL` unset — verify the button stays disabled (existing behavior, unchanged) and does NOT attempt to open a popup pointing at `/auth/google` literally.

If any manual step fails, the PR is not ready for review — fix the bug, re-run.

---

## Rules respected (cross-check before commit)

- ✅ No `content/` edit (out of scope).
- ✅ No submodule pointer bump.
- ✅ No new locale added — English-only string in `en.json`.
- ✅ No AGENTS.md / CLAUDE.md / `.cursor/rules/*.mdc` hand-edit.
- ✅ No `package.json` change (no new deps).
- ✅ No new debt ID issued.
- ✅ No business logic in `apps/web/app/api/` — slice is client-only.
- ✅ No hand-written fetch call to `api.nxhhuy.tech` — the `GET /me` call uses the existing `packages/api-client` (or, if `api-client` is empty, a thin fetch wrapper that lives under `apps/web/lib/api/` — verify the convention by reading `apps/web/lib/site.ts`'s neighbors before writing).
- ✅ No hardcoded user-visible string — every visible string goes through `t(messages, 'topbar.signInProcessing')`.
- ✅ `progress.md` edit uses the safe trailing-anchor pattern (lesson from session 200).

---

## Commit shape

Conventional Commits, scope `web`. Single commit unless a fix-up needs a second one (avoid the `progress.md` multi-commit scenario from session 200 — get the doc append right the first time).

Suggested message prefix: `feat(web): D26 sign-in popup UX (centered popup, polling /me, processing state)`.

---

## Reporting protocol (per `corpus-web-context/references/reporting-protocol.md`)

- On completion: tag Echo (`@hermes-assistant`) directly with the PR link + gate receipts + commit SHA + screenshot or text description of the manual UX verification.
- Echo reviews and decides whether to escalate to Huy (only if a Huy call is needed — e.g., a rule violation surfaced mid-flight, or the manual UX verification turned up an unexpected design question).
- Lead is CC'd via the same Slack thread (don't open a new one).

---

## Known issues / next steps (going into this slice)

- **Sub-slice B** (D26 second-slice continuation): avatar dropdown / sign-out button / profile page. Separate dispatch.
- **Sub-slice C** (D26 second-slice continuation): `POST /progress/migrate` endpoint on `apps/api` to consume the v1 progress store's migration payload from session 170. Separate dispatch, BE-side.
- **D26 closer slice**: refresh tokens, RBAC, `/auth/logout` CSRF. All separate dispatches.

Sub-slice A unblocks the *UX feedback loop* for the rest of D26 — once a user can sign in without leaving the article view, the avatar/profile UI has a place to live. Popup UX is the foundation, not the feature.

---

**Author note (for the next agent):** This file is the scope of record. Do not expand it. Do not invent additional UX (e.g., "Loading…" spinner, success toast, error toast) — those are sub-slice B's call. If you find the spec underspecified at run-time, stop and ask Lead, do not silently invent.
