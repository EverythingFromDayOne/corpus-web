---
name: oauth-passport-google
description: Use when editing apps/api Google OAuth callback flow.
---

# Google OAuth 2.0 login flow (apps/api)

Reference implementation: `src/modules/auth/` — `google.strategy.ts` (Passport strategy),
`auth.controller.ts` (the 3 `/auth/*` routes), `session.serializer.ts`,
`session.guard.ts`, `auth.service.ts` (upsert-by-`google_sub`). Read `google.strategy.ts`
and `auth.controller.ts` in full before touching this flow — they are short and the
comments explain every non-obvious decision.

## The contract

| Route | Auth | Behavior |
|---|---|---|
| `GET /auth/google` | public | 302 → `accounts.google.com`, Passport short-circuits, no handler body needed |
| `GET /auth/google/callback` | public | Google's redirect target. Success: 302 → `${WEB_ORIGIN}/`. Failure: 302 → `${WEB_ORIGIN}/?auth=error&reason=...` — **never JSON at a browser** |
| `GET /auth/logout` | cookie | `req.logout()` → `req.session.destroy()` → clear cookie → 303 redirect. Implemented as GET for CSRF-ergonomics (browser link works; SameSite=Lax blocks the cross-origin top-level POST anyway). If a future task needs POST, the contract to change is this row + the `@Get('logout')` decorator + the Next.js caller — not just the table. |
| `GET /me` | cookie | 200 with public-safe fields only, or 401 |

## Redirect-URI rule

`GOOGLE_CALLBACK_URL` env must exactly match an "Authorized redirect URI" registered in
the Google Cloud Console OAuth client, or Google rejects the callback with a
`redirect_uri_mismatch` error before ever reaching this API. Local dev value is
`http://localhost:3001/auth/google/callback`; changing the API's port or host requires
updating both `.env` and the Console registration together.

Every redirect this flow produces (`WEB_ORIGIN` success/error targets) is a same-origin
path on the web app, computed from env — **never hardcode a URL, never redirect to an
external URL**. This is the mechanism that keeps a session id or id_token out of a
third-party `Referer` log.

## Scope — minimal, don't grow it silently

`scope: ['openid', 'email', 'profile']` is the whole set. This is login-only — it does
not grant contact-list, Gmail, or Drive access. Adding scopes is a decision, not a
convenience; if a future task needs more, that's a stop-and-ask, not a one-line diff.

## Cookie-domain / SameSite contract

See `postgres-session-store` for the full cookie-flag table. The two facts specific to
the OAuth flow: `sameSite: 'lax'` is what makes the top-level-navigation redirect from
Google back to `/auth/google/callback` actually carry the cookie (a stricter `'strict'`
would drop it on that cross-site navigation); `domain: .nxhhuy.tech` in production is
what lets the apex (`nxhhuy.tech`) and `api.nxhhuy.tech` share one session without a
third-party-cookie problem — this is documented as the reason the API is not deployed on
a bare `*.fly.dev` host in `.cursor/rules/10-stack-and-topology.mdc`.

## Auth-disabled boot mode — do not "fix" it

`AuthModule.forRoot()` returns `null` when any of the three `GOOGLE_*` env vars is
missing, and `AppModule` conditionally omits the module from `imports` in that case. The
API still boots: `/healthz/*` works, `/auth/*` 404s (the routes don't exist, they don't
500), `/me` 401s. This is what keeps a CI machine without Google secrets green. If you
see this behavior and it looks like a bug, it isn't — read `auth.module.ts`'s doc comment
before changing it.

## `/me` re-queries the DB — don't cache it

`SessionAuthGuard` calls `AuthService.findById` on every request rather than trusting
Passport's deserialized/cached user. This is a disclosed trade-off (one extra DB query
per `/me` hit) in exchange for a soft-deleted or removed account getting an immediate 401
instead of staying valid until cache expiry. Do not "optimize" this into a cached lookup
without re-opening that trade-off explicitly.

## Explicitly out of scope (per the task that built this slice, PR #179)

Refresh-token rotation (no `accessType: 'offline'`), RBAC, password/magic-link auth,
CSRF token on `/auth/logout` (route is `GET` per the contract table above — SameSite=Lax
already blocks the cross-origin top-level navigation that would matter if it were POST), custom OAuth `state` param (Passport's strategy already handles it),
avatar dropdown / sign-out button / profile page on the web side. Don't add any of these
as a "small addition" to an unrelated task — they are separate, unscoped stories.
