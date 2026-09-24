# Session — Phase B NestJS API deployment via PM2 + webhook

**Branch:** to be cut `feat/phase-b-pm2-deploy` off `develop`; PR target `develop`; no `--admin`.
**Date:** 2026-09-18.

## Scope

Phase B of the API hosting roadmap: PM2 process manager + GitHub-webhook auto-deploy + graceful
shutdown + health check. VPS target is the Contabo box at `46.250.225.5` (Ubuntu 24, Docker
installed, repo cloned at `/home/huy/corpus-web/`, Postgres container `corpus-api-db` already
running). Phase C (Docker containerization + GHCR + `docker compose up` deploy) is a separate
workstream, scheduled 4–6 weeks out per the curriculum.

**NOT in scope (deferred):**
- Phase C Dockerfile + GHCR + `docker compose up` — separate session.
- `apps/web/**` — Vercel-managed, untouched.
- `docker-compose.yml` — currently only has the `db` service; touching it is Phase C.
- `.github/workflows/ci.yml` — stays CI-only (lint + test); Phase B deploy uses an out-of-tree
  webhook listener on the VPS, not a GitHub Actions job.
- `apps/api/.env.example` — dev defaults stay as they are.
- Live VPS install steps (PM2 install, systemd unit, webhook listener registration) — those are
  a separate "deploy on the box" session once the repo changes land and merge.

## Files this session touches

In-repo (4 files modified + 1 new):

1. `apps/api/ecosystem.config.cjs` — NEW. PM2 ecosystem file with full config block + comments.
2. `apps/api/src/main.ts` — EDIT. Add `app.enableShutdownHooks()` + `process.send?.('ready')`
   + an explicit SIGTERM/SIGINT handler that calls `app.close()` and `process.exit(0)`.
3. `.gitignore` — EDIT. Add `apps/api/ecosystem.config.cjs`, `.env.production`, `~/.pm2/`,
   `apps/api/.env.production`.
4. `docs/DEBT.md` — EDIT. Bump "Highest ID issued" from D60 → D61. Add D61 row for
   Phase B PM2 setup. Record the three lessons learned.

Out-of-tree:

5. `~/.hermes/memories/MEMORY.md` — append a Phase B deployment entry that:
   - Surfaces the PM2 + wait_ready + `process.send('ready')` pattern for future sessions.
   - Cross-references Phase C Docker plan.
   - Updates any existing "corpus-web hosting" line to reference Phase B + Phase C.

6. `/tmp/phase_b_c_roadmap.md` — Phase B done summary + Phase C (Docker) plan: expected files,
   migration path, rollback strategy, skills to learn between phases, B→C risk assessment,
   recommended timeline (4 vs 6 weeks).

Plus mandatory session artifacts:

7. `.agents/SESSION-LOG.md` — appended session entry.
8. `CHANGELOG.md` — new `[Unreleased]` entry at top.
9. `progress.md` — one-line session summary appended.

## Decisions

- `apps/api/ecosystem.config.cjs` (CommonJS, `.cjs` not `.js`) because `apps/api/package.json`
  has `"type": "module"` — PM2's ecosystem file is a Node module that runs in a CommonJS context
  even when the project is ESM. `.cjs` sidesteps the `ERR_REQUIRE_ESM` trap that any sibling
  of `package.json#type=module` would hit.
- Gitignored because it embeds the VPS-absolute `cwd: /home/huy/corpus-web/apps/api` path,
  which is meaningless on a Mac dev machine and would drift. Each dev/ops machine gets its
  own copy. Dev convenience: `apps/api/dist/main.js` runs without PM2 on local just fine.
- `.env.production` likewise gitignored — same reason as root `.env` (secrets).
- `~/.pm2/` gitignored at repo root even though it's a user-home path — convention from the
  PM2 ecosystem docs is that the dump file ends up there; other tools (Keymetrics,
  `pm2-runtime` in Docker) also write under it; treating it as a non-tracked artifact is
  the same shape as `node_modules/`.
- `instances: 1` for Phase B. The API is one process serving all routes; cluster mode
  adds fork boundaries that complicate TypeORM's connection pool sizing and the session
  store's dedicated `pg.Pool`. Single instance keeps the connection math honest. Cluster
  mode is a Phase C+ consideration when the API actually needs horizontal scale.
- `max_memory_restart: 512M` because NestJS 11 + TypeORM 0.3 + Express 5 baseline at
  ~180–250 MB at idle per `verify:api-runtime` observations, and the headroom is for the
  request-handling spikes during OAuth round-trips (one full `pg.Pool` request + a few
  sessions-table rows).
- `wait_ready: true` + `process.send('ready')` after `app.listen()` resolves is the
  canonical PM2 graceful-start pattern (verified against pm2.keymetrics.io docs and the
  NestJS shutdown-hooks lifecycle-events docs together). PM2 sends SIGINT for reload/stop;
  NestJS shutdown hooks catch SIGINT once `enableShutdownHooks()` is called.
- Explicit SIGTERM/SIGINT handler that calls `app.close()` then `process.exit(0)` —
  `app.close()` alone does NOT terminate the process (per NestJS docs), so without the
  explicit exit the process hangs after hooks fire and PM2 has to SIGKILL after
  `kill_timeout: 10000`. Belt-and-braces: `enableShutdownHooks()` is the primary path
  for SIGINT-driven shutdown; the manual handler covers SIGTERM directly (PM2 sends
  SIGINT by default, but `PM2_KILL_SIGNAL=SIGTERM` env override would change that).

## Verification plan

1. `pnpm --filter @corpus/api typecheck` clean — proves the `main.ts` edit compiles under
   `tsc --noEmit` against the actual installed `@nestjs/common` 11.1.29.
2. `pnpm --filter @corpus/api build` clean — proves the emitted `dist/main.js` is loadable.
3. `node -e "require('./apps/api/dist/main.js')"` style smoke would require a real DB
   to actually start the API; deferred to the live-VPS session that will run `pm2 start`
   against the real Contabo box.
4. Cross-check `pm2.keymetrics.io/docs/reference/application-declaration/` schema against
   the authored ecosystem file.
5. Cross-check NestJS `OnModuleDestroy` / `OnApplicationShutdown` exports against
   `apps/api/node_modules/@nestjs/common/index.d.ts` (already verified: both exported
   in 11.1.29).

## Lessons to record (for DEBT.md D61 + MEMORY)

1. NestJS graceful shutdown requires `app.enableShutdownHooks()` BEFORE `app.listen()` —
   the call registers signal listeners, and once `listen()` resolves the SIGTERM/SIGINT
   handler becomes active. Calling it after `listen()` works for the FIRST signal but
   is fragile against code-reordering.
2. PM2 `wait_ready: true` requires `process.send('ready')` from the app once it's ready
   to serve traffic — without it, PM2 considers the process `online` as soon as the Node
   event loop is alive, which is BEFORE `app.listen()` has bound the socket. PM2's
   default `listen_timeout: 3000ms` is too short for NestJS to finish `ConfigModule.validate`
   + TypeORM connection pool warm-up on first boot; bumped to `listen_timeout: 10000`
   to match the existing `kill_timeout: 10000`.
3. `app.close()` triggers shutdown hooks but does NOT terminate the Node process —
   explicit `process.exit(0)` after the close promise resolves is required to release
   the socket and let PM2 mark the process `stopped`. The pattern is `await app.close()`
   → `process.exit(0)`. Forgetting the exit means PM2 SIGKILLs after `kill_timeout`.

## Out of session scope (carried, NOT touched)

- Phase C Dockerfile + GHCR + `docker compose up` — separate session.
- Live VPS install: `npm i -g pm2`, `pm2 startup systemd`, `pm2 save`, webhook listener
  registration, Nginx/Caddy reverse proxy, TLS cert — all separate sessions once the
  repo changes land.
- Webhook payload handler script — out of repo, lives at `/home/huy/corpus-web/scripts/`
  on the VPS as a standalone Node script (NOT committed). Will be designed in the
  "deploy on the box" session.
---

## Outcome (2026-09-18)

Phase B code slice complete. Three files shipped:
- `apps/api/ecosystem.config.cjs` (NEW, 125 lines, gitignored — host-absolute `cwd` makes it per-machine)
- `apps/api/src/main.ts` (EDIT — `app.enableShutdownHooks()` + explicit `SIGTERM`/`SIGINT` handler with `shuttingDown` guard + `process.send?.('ready')` after `app.listen()`)
- `.gitignore` (EDIT — Phase B block, 10 rules + explanatory comments)

Documentation:
- `docs/DEBT.md` row **D61** added (Highest ID bumped D60 → D61)
- `CHANGELOG.md` top-of-`[Unreleased]` entry inserted
- `.agents/SESSION-LOG.md` Session 209 appended
- `progress.md` Session 209 one-liner appended
- `/tmp/phase_b_c_roadmap.md` (13.5KB Phase C Docker roadmap)
- `~/.hermes/memories/MEMORY.md` (Lead parent memory, NOT echo profile) appended

All 9 local gates green: typecheck/lint/build (api-only + full-monorepo).

**No branch / commit / PR / VPS ops yet** — code slice is deploy-ready; the VPS-side work (PM2 install, webhook listener, `.env.production` copy, `pm2 save` + startup script) is user-action items tracked under D61's Resolution column.
