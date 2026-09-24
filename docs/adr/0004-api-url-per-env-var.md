# ADR-0004: Configure NEXT_PUBLIC_API_URL per Vercel environment, not a rewrites proxy

- **Status:** accepted
- **Date:** 2026-09-16
- **Deciders:** Huy (via Echo/Lead Slack relay, `#corpus-web-v2`)

## Context

`apps/web`'s `<SignInButton>` and any future authenticated client calls need to know the
Nest API's origin. Two live gaps forced this decision:

- `apps/web/next.config.*` has no `rewrites()` block and no existing
  `NEXT_PUBLIC_API_URL` plumbing — the env var is read ad hoc
  (`process.env['NEXT_PUBLIC_API_URL'] ?? ''`) directly in `sign-in-button.tsx`, with no
  shared config module.
- `apps/web/.cursor/rules/20-never-violate.mdc` states a same-origin BFF/rewrites-proxy
  preference over exposing `NEXT_PUBLIC_*` API origins per environment — this ADR is the
  explicit, disclosed exception to that default.
- PR #179 (D26 first slice, merged `aed04ee` 2026-09-15) already locked cookie-domain and
  CORS behavior around a direct browser → API origin round-trip
  (`SESSION_COOKIE_DOMAIN`, `WEB_ORIGIN` CORS allowlist, `SameSite=Lax`). A same-origin
  rewrites proxy would sit the Next.js server between the browser and the API, changing
  where the session cookie is actually set and re-deriving the CORS/cookie-domain
  contract from scratch.
- Deployment target is a single fixed VPS running the API (per `roadmap.md` topology) —
  not a multi-backend or multi-region setup where a proxy's origin-hiding value would
  pay for its complexity.

## Options considered

**Option A — Next.js rewrites proxy (same-origin).** `next.config.ts` rewrites
`/api/*` to the VPS origin; browser only ever talks to `nxhhuy.tech`. Buys: no CORS
config, cookies naturally same-origin, hides the backend origin from the client bundle.
Costs: an extra network hop on every request (Vercel edge → VPS), requires re-deriving
the cookie/CORS contract already locked in PR #179 (session cookie would need to move
from `SESSION_COOKIE_DOMAIN=nxhhuy.tech` direct-set to a proxied set-cookie pass-through,
unverified whether `connect-pg-simple` + `express-session` cookies survive a Vercel
rewrite unchanged), and adds a failure mode where the proxy hop itself can go down
independent of the API being reachable — friction against the read-only-if-API-down
contract the site already promises.

**Option B — Per-environment `NEXT_PUBLIC_API_URL` (Vercel env var, direct browser → API).**
Set the var per Vercel scope (Production / Preview / Development), browser calls the API
origin directly, matches the CORS + cookie-domain setup already shipped in PR #179 with
zero rework. Costs: build-time bake means a backend URL change needs a redeploy (not a
runtime env swap); origin is visible in the client bundle (not a real secret — API is
public-facing already).

## Decision

Go with **Option B**. Configure `NEXT_PUBLIC_API_URL` per Vercel scope
(Production/Preview/Development) rather than building a same-origin rewrites proxy.
Centralize all reads through one `apps/web/lib/config.ts` export
(e.g. `export const API_URL = ...`) instead of scattering
`process.env['NEXT_PUBLIC_API_URL']` calls across components, and audit for any
hardcoded `https://api.nxhhuy.tech` strings to replace with that import.

## Consequences

**Easier:** no rework of the PR #179 cookie/CORS contract; no new proxy failure mode
between Vercel and the VPS; simpler mental model (one direct hop, matches current
`localhost:3001` dev fallback already in the code).

**Harder:** a backend URL change (VPS IP/domain swap, future multi-backend split) now
requires a Vercel env change + redeploy rather than a runtime toggle; the API origin is
visible in the client JS bundle (acceptable — it's a public API, not a secret).

**Reversal cost:** moderate. Reversing to Option A later means introducing the rewrites
block, re-deriving the cookie/CORS contract, and re-testing the full OAuth round-trip —
comparable in size to the original PR #179 auth work, not a small patch.

## Revisit when

The API moves off a single fixed VPS to a multi-backend or multi-region topology where
hiding the origin or avoiding a redeploy-per-URL-change starts to matter, or if CORS/cookie
issues recur in production that a same-origin proxy would structurally eliminate.
