# D26-avatar-logout-b — sign-in avatar + logout dropdown (D26 sub-slice B)

## Context

D26 sub-slice A (sign-in popup UX + `/me`/`/auth/logout` backend contracts) is merged to `develop` at `b7fe049` (PR #184). Backend needs **zero changes** — this batch is frontend-only: render the already-working `/me` identity and give the user a way to sign out.

Branch: `feat/d26-avatar-logout` off `develop` HEAD. PR to `develop`, no `--admin`.

## Backend contracts (already live, do not touch `apps/api`)

`GET /me` (`apps/api/src/modules/auth/me.controller.ts`) — guarded by `SessionAuthGuard`:
- 200 → `{ email: string|null, name: string|null, avatarUrl: string|null, locale: string|null }`
- 401 → unauthenticated (no body assumptions — treat any non-200 as signed-out)

`GET /auth/logout` (`apps/api/src/modules/auth/auth.controller.ts` lines 145-157) — destroys session server-side, clears cookie, then a **303 redirect** back to `WEB_ORIGIN`. A plain `<a href={\`${apiUrl}/auth/logout\`}>` is the contractually correct control — GET, no CSRF form, no JS fetch needed. Do not build a POST form for this.

`avatarUrl` can legitimately be `null` (Google account with no photo) — the fallback-avatar case is real and must be handled, not an edge case to skip.

## Constraints (apply to ALL items)

- Tailwind utility classes + the existing `globals.css` custom-class convention (see `.topbar-signin*` in `apps/web/app/globals.css` lines 795-859) — this codebase mixes both; follow whichever pattern the file you're editing already uses. No raw hex, reuse existing `--color-*`/`--text-*` tokens only. No new CSS custom properties.
- i18n: new keys go under the existing `"topbar"` block in `apps/web/messages/en.json` (see lines 11-17 for current shape/style). **English only — do NOT touch `vi.json`.** `vi` is not a shipped locale; adding to it is a stop-and-ask, not this batch's job.
- Zero new npm dependencies. Click-outside/Escape-to-close is buildable with `useEffect` + `useRef` + native DOM listeners — no headless-UI/radix/etc.
- No `<dialog>` element — that's reserved for full-takeover surfaces in this codebase (see `apps/web/components/chrome/search-dialog.tsx`). This is a small anchored popover, use a plain `absolute`-positioned `<div>` under `position: relative` on the trigger.
- `role="menu"` / `menuitem` semantics, keyboard support (Escape closes, focus returns to trigger on close) — this codebase's a11y bar is real (D18 closed clean 2026-08-29), do not regress it.
- Workflow: feature branch off `develop` → PR to `develop` → no `--admin`. One commit per item below.
- Do NOT touch `content/*` submodules, `docs/DEBT.md`, `.agents/SESSION-LOG.md`, or `CHANGELOG.md` — those are the dispatching agent's job on review, not yours.
- Out of scope, do not build: profile page, refresh tokens, RBAC, `POST /progress/migrate` (slice C). If you find yourself wanting any of these, stop — it's not this batch.

## Preemption — read first

Do NOT use the `clarify` tool under any circumstances. Every decision needed is in this spec or in the codebase files named below. If you find yourself wanting to ask, re-read this spec and the referenced files first — the answer is almost certainly already decided.

## Item 1 — Hoist `/me` fetch into `SignInContext`

**Effort:** ~20 min. **Risk:** Low.

**Pattern:** `apps/web/components/chrome/sign-in-context.tsx`'s `SignInProvider` currently only tracks the in-flight `processing` boolean (see the file's own docstring for full history — read it before editing, it explains why popup state stays local while boolean-ish state is hoisted). Add a `me` slice to the same provider:

```ts
type MeState = { status: 'loading' } | { status: 'signed-out' } | { status: 'signed-in'; user: MeResponse };

type MeResponse = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string | null;
};
```

Add `me: MeState` and a `refetchMe: () => void` to `SignInContextValue`. On provider mount, `fetch(\`${apiUrl}/me\`, { credentials: 'include' })` once: 200 → `{status: 'signed-in', user}`, anything else (401, network error) → `{status: 'signed-out'}`. `refetchMe` re-runs the same fetch (needed so a fresh sign-in flips `me` from `signed-out` to `signed-in` without a full page reload — call it from the existing postMessage success handler in the same `useEffect`, right where it currently calls `revertRef.current?.()`/`setProcessing(false)`).

This is the answer to the flicker risk flagged in the original ask: because `SignInProvider` mounts once at `apps/web/app/[locale]/layout.tsx` (not per-`<SiteHeader>`-remount), the `/me` fetch happens once per locale-tree lifetime, not once per route change. `<SignInButton>` and the new avatar component both read `me` from context — neither fetches independently.

Import `apiUrl` from `@/lib/config` (same import `sign-in-button.tsx` already uses).

**Verification:** `pnpm --filter @corpus/web typecheck`

## Item 2 — New `UserMenu` component (avatar + dropdown)

**Effort:** ~45 min. **Risk:** Med.

**Files:** NEW `apps/web/components/chrome/user-menu.tsx`

**Pattern:**
- `'use client'` component, reads `{ me }` from `useSignIn()` (extended in Item 1).
- Renders `null` while `me.status === 'loading'` (avoid a layout flash/pop-in — matches the "no flicker" goal).
- Renders nothing (let `site-header.tsx` fall through to `<SignInButton>`) when `me.status === 'signed-out'`.
- When `me.status === 'signed-in'`: renders a `<button>` trigger showing the avatar — `<img src={user.avatarUrl}>` when set, else a circular initial-letter fallback (`user.name?.[0] ?? user.email?.[0] ?? '?'`, uppercased). Clicking toggles an open/closed boolean; clicking outside the whole component OR pressing Escape closes it (native `useEffect` with a `mousedown` document listener checking a wrapper `ref`, plus a `keydown` listener for `Escape` — follow the ref-based pattern already used for popup/timer cleanup in `sign-in-button.tsx` for style consistency, though the mechanism here is different).
- Dropdown panel (`role="menu"`, `aria-label` from a new i18n key, only rendered when open): shows `user.name` and `user.email` as static text (not menu items), then a `role="menuitem"` plain `<a href={\`${apiUrl}/auth/logout\`}>{t(messages, 'topbar.signOutLabel')}</a>`.
- Trigger button: `aria-haspopup="menu"`, `aria-expanded={open}`, `aria-label` from the new `topbar.signedInAriaLabel` i18n key (interpolate the user's name/email the same way `topbar.pillCtaAriaLabel` interpolates `{title}` — see `apps/web/messages/en.json` line 13 and its usage at `site-header.tsx` line 48 for the exact interpolation call shape via `t(messages, key, { ... })`).
- Avatar image: plain `<img>`, NOT `next/image` — `next.config.mjs` has no `remotePatterns`/`domains` configured for Google's avatar CDN host, and adding one is out of scope for this batch (would need a stop-and-ask on the exact host allowlist). A plain `<img>` with a fixed size (e.g. `h-8 w-8 rounded-full object-cover`) is correct here.

**i18n keys** (add to `apps/web/messages/en.json` under the existing `"topbar"` block, alongside `signIn`/`signInAriaLabel`/`signInProcessing`):
```json
{
  "topbar": {
    "signedInAriaLabel": "Account menu for {name}",
    "signOutLabel": "Sign out",
    "avatarFallbackAlt": "Account"
  }
}
```
Use `signedInAriaLabel` with `{ name: user.name ?? user.email ?? '' }` interpolation. Use `avatarFallbackAlt` as the `alt` text on the `<img>` (or omit `alt` entirely and rely on the button's own `aria-label` if you judge the image is decorative — your call, either is defensible, just be consistent).

**Verification:** `pnpm --filter @corpus/web typecheck`

## Item 3 — Wire into `SiteHeader`

**Effort:** ~10 min. **Risk:** Low.

**Files:** MODIFIED `apps/web/components/chrome/site-header.tsx`

**Current code** (site-header.tsx:41-44):
```tsx
<div className="topbar-tools">
  <SearchTrigger messages={messages} />
  <SignInButton messages={messages} />
```

**New code:** Import `UserMenu` from `./user-menu`. Replace the bare `<SignInButton messages={messages} />` with a small conditional based on `useSignIn().me.status` — OR (preferred, keeps `site-header.tsx` a server-shaped component and pushes the client logic down) render `<UserMenu messages={messages} />` unconditionally right where `<SignInButton>` sits, and have `UserMenu` itself decide (per Item 2) to render nothing when signed-out, falling through visually to `<SignInButton>` also rendering... **but that means both would render at once when signed-out.** The correct shape: create one small client wrapper (either inline in `site-header.tsx` if it can stay a client component already, or a tiny new sub-component) that reads `me.status` from `useSignIn()` and renders exactly one of: nothing (loading), `<SignInButton>` (signed-out), `<UserMenu>` (signed-in). Check whether `site-header.tsx` is currently a Server or Client Component (it has no `'use client'` directive at the top — it is currently a Server Component) before deciding where this conditional lives; `useSignIn()` is a hook and requires a Client Component, so the conditional must live in a client boundary, e.g. inside `UserMenu` itself by widening its render contract to also own the signed-out fallback, or a new tiny `<AuthSlot messages={messages} />` client component that internally renders `<SignInButton>` or `<UserMenu>`. Pick whichever keeps `site-header.tsx` untouched at the `'use client'` boundary — that's your call, just don't end up with both mounted at once or duplicate `/me` fetches.

**Verification:** `pnpm --filter @corpus/web typecheck` and `pnpm --filter @corpus/web build`

## Item 4 — Dropdown styling

**Effort:** ~20 min. **Risk:** Low.

**Files:** MODIFIED `apps/web/app/globals.css`

Add a `.user-menu*` rule block near the existing `.topbar-signin*` section (lines ~795-859) following the same custom-property/token reuse convention already established there (read that section first — do not invent new color tokens, reuse whatever `--color-*`/`--text-*`/border tokens the `.topbar-signin*` rules already reference). Needs: trigger button reset (no default button chrome), avatar circle sizing/clip, dropdown panel positioning (`position: absolute`, right-aligned under the trigger, above other topbar content — check existing z-index usage in this file for `.signin-popup` or similar and match it so the menu isn't clipped/hidden), panel background/border/shadow consistent with any existing popup/panel surface in this file (`.signin-popup` is the closest precedent — reuse its surface treatment, don't invent a new one).

**Verification:** visual — no automated check for CSS; typecheck/build passing is the gate.

## Workflow

1. Read `AGENTS.md`, `.agents/summary.md`, this prompt, and the 4 source files named above in full before writing any code (`sign-in-context.tsx`, `sign-in-button.tsx`, `site-header.tsx`, `me.controller.ts`) — several have long docstrings explaining non-obvious prior bugs; do not re-introduce them.
2. Load skills: `github-pr-workflow`, `simplify-code`, `requesting-code-review`.
3. Cut branch `feat/d26-avatar-logout` off `develop`. Implement items 1-4 in order (each depends on the previous). Typecheck after each. One commit per item.
4. Final verification: `pnpm --filter @corpus/web typecheck`, `pnpm --filter @corpus/web build`, `pnpm verify:frontmatter` (should be unaffected — confirms you haven't touched content).
5. Push, open PR to `develop` (no `--admin`), write a short report to `/tmp/d26-avatar-logout-b-report.txt` covering: commits, what each item does, any deviation from this spec and why, and explicitly confirm `vi.json` was NOT touched and no new deps were added.

## Hard prohibitions

- Push to `main`/`develop` directly.
- Use `--admin` on the PR.
- Edit `content/*` submodules, `docs/DEBT.md`, `.agents/SESSION-LOG.md`, `CHANGELOG.md`, or `apps/api/**`.
- Add npm deps.
- Touch `vi.json` or add any Vietnamese string.
- Use `next/image` for the avatar (no `remotePatterns` configured — see Item 2 note).
- Build a POST/CSRF form for logout — it's a plain GET link.
- Combine multiple items in one commit.
- Use the `clarify` tool.

## Completion criteria

- [ ] 4 items, 4 commits (or close to it)
- [ ] `pnpm --filter @corpus/web typecheck` and `build` both green
- [ ] `vi.json` untouched (`git diff --stat` shows no `vi.json` line)
- [ ] No new entries in any `package.json` `dependencies`/`devDependencies`
- [ ] Branch pushed, PR open to `develop`, report written to `/tmp/d26-avatar-logout-b-report.txt`
