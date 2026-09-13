---
name: postgres-session-store
description: Use when wiring session store in apps/api against Postgres.
---

# express-session + connect-pg-simple against local Postgres

Reference implementation: `apps/api/src/config/session.ts`, mounted in `main.ts` via
`app.use(sessionMiddleware)` — registered BEFORE Passport, because Passport reads
`req.session.passport` on every request and that slot needs to exist first.

## Two pools, not one

The session store gets its **own** `pg.Pool`, separate from TypeORM's DataSource pool.
This is deliberate, not an oversight: the session table is a write-heavy, short-row hot
path; sharing TypeORM's pool means a session write burst can starve an entity query.
When wiring a new consumer of Postgres in this API, default to reusing the TypeORM
DataSource — the session store is the one deliberate exception, and the reason is
documented inline in `session.ts`. Don't add a third pool without the same kind of
justification.

## `connect-pg-simple` is CJS in an ESM app

`apps/api` is ESM. `connect-pg-simple`'s default import gets the CJS function export
(the constructor) — call it as `connectPgSimple(session)`, not
`new connectPgSimple.default(...)` or similar. The package ships no types; the repo
carries a 10-line ambient declaration at `apps/api/src/types/connect-pg-simple.d.ts` to
make it callable under `tsc`. If you hit a missing-types error on a `connect-pg-simple`
import elsewhere, extend that file — don't add a second ambient declaration.

## Cookie flags — do not change without a reason

| Flag | Value | Why |
|---|---|---|
| `httpOnly` | `true` | JS in the browser cannot read the cookie — the main XSS mitigation |
| `secure` | `env.SESSION_COOKIE_SECURE` (default `true`, dev `.env.example` sets `false`) | plain HTTP on `localhost` in dev; every deployed environment must be `true` |
| `sameSite` | `'lax'` (hardcoded, not env-driven) | top-level nav carries the cookie, cross-site POST does not — matches `.cursor/rules/50-api-nestjs.mdc` |
| `domain` | `env.SESSION_COOKIE_DOMAIN` (empty in dev, `.nxhhuy.tech` in prod) | empty pins the cookie to the exact host that set it; `.nxhhuy.tech` shares it between apex and `api.` subdomain |
| `maxAge` | `SESSION_TTL_SECONDS * 1000`, default 30 days | sliding — `express-session` resets expiry on every authenticated request (`resave: false`, `saveUninitialized: false` still allow the touch-based renewal Passport triggers) |

`resave: false, saveUninitialized: false` means an anonymous browser visiting
`/auth/google` does NOT create a session row until the OAuth dance actually completes —
don't "fix" an apparently-missing session row for an anonymous visitor, that's correct.

## Table creation is lazy

`createTableIfMissing: true` means `corpus_session` is created on first session write,
not by a migration. This is the one piece of schema in this API that is NOT
migration-managed — don't write a migration for `corpus_session`, and don't be alarmed
that `\d corpus_session` returns nothing until the first real login happens. Verify via
`psql -c "SELECT to_regclass('public.corpus_session')"` after a login, not before.

## Local container setup

The Postgres container is `docker-compose.yml` at repo root, service `db`, image
`postgres:16.4-alpine` (pinned tag — never `:latest`), healthcheck `pg_isready`. Bring it
up with `docker compose up -d db` before running the API locally; `.env.example`
documents the `POSTGRES_*` values that must match the compose file's interpolation.
