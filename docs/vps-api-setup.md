# VPS API setup — Phase B evidence

Point-in-time record of the Phase B deployment of `apps/api` to VPS Contabo
@ `46.250.225.5`. This file is **evidence**, not a how-to.

Every row below is marked with its verification status:

- **[verified]** — observed directly in this session's terminal output
- **[unverified]** — plausible, from earlier sessions or operator recollection; NOT
  re-confirmed in this session. Do not cite as evidence without re-running.

Branch under which the fix was captured: `fix/database-url-masked-password`,
based on `develop @ 53e4b8e` (the merge commit of PR #186 from
`feat/phase-b-pm2-deploy`, so the Phase B code slice IS included in the base).

Session window: 2026-09-18 21:09 CEST → 2026-09-19 07:25 CEST.
Note on timestamps: PM2 logs are CEST (VPS local), Postgres container logs are
UTC (offset +2h), Mac logs are ICT (UTC+7).

---

## ⚠ VPS working-tree state at session close — READ FIRST

The VPS is **not** on `develop` and **not** clean:

- Checked out: `fix/database-url-masked-password` (commits `9cdd712`, `a764e10`)
- One stash entry: `WIP on develop: 53e4b8e` — the hand-edited copy of the same
  fix, kept as a rollback net

After the PR merges, the operator must run:

```bash
cd ~/apps/corpus-web
git checkout develop && git pull
rm -rf apps/api/dist apps/api/tsconfig.tsbuildinfo && pnpm --filter api build
pm2 restart corpus-api && sleep 6 && curl -s localhost:3001/healthz/ready
git stash drop
git branch -d fix/database-url-masked-password
```

Until that runs, a `git pull` on the VPS will conflict.

---

## Host

| Field | Value | Status |
|---|---|---|
| Provider | Contabo | [unverified] |
| Public IPv4 | `46.250.225.5` | [verified] |
| Hostname | `vmi3570186` | [verified] shell prompt |
| OS | Ubuntu 24.04 LTS x86_64 | [unverified] |
| User | `huy` | [verified] shell prompt |
| Repo path | `/home/huy/apps/corpus-web/` | [verified] |
| Base commit | `53e4b8e` (merge of PR #186) | [verified] `git log --oneline` |
| Default branch | `develop` (not `main`) | [verified] `git stash` output |
| Node | v24.21.0 | [unverified] |
| pnpm | 10.33.0 | [verified] `Done in 4.3s using pnpm v10.33.0` |
| PM2 | 7.0.4 | [unverified] |
| Docker | 29.8.0 | [unverified] |
| systemd | yes | [verified] `pm2 startup` → `Init System found: systemd` |

---

## Postgres container

| Field | Value | Status |
|---|---|---|
| Container name | `corpus-api-db` | [verified] |
| Image | `postgres:16.4-alpine` | [verified] `docker ps` |
| Status | Up, healthy | [verified] `docker ps` |
| Server version | PostgreSQL 16.4 on x86_64-pc-linux-musl | [verified] container log |
| Docker bridge | container `172.18.0.2`, gateway `172.18.0.1` | [unverified] |
| Volume | `corpus_api_pg_data` | [unverified] |
| Host bind | `127.0.0.1:5432->5432/tcp` | [verified] `docker ps` PORTS column |
| Restart policy | `unless-stopped` | [verified] `docker inspect -f '{{.HostConfig.RestartPolicy.Name}}'` |
| Database | `corpus_api` | [verified] `pg.Pool` probe + successful connect |
| Application user | `corpus` | [verified] |
| Password | 64 hex, head `2ee7ff` | [verified] probe `len=64 head=2ee7ff` |
| Password verifier | SCRAM | [verified] **indirectly**: connects successfully under a `scram-sha-256` hba rule, which is impossible with an md5 verifier |
| `pg_hba.conf` line 1 | `host all all 172.18.0.0/16 scram-sha-256` | [verified] `docker exec ... head -3` |
| Internet exposure | closed | [verified] `nc -vz 46.250.225.5 5432` from Mac **hangs** (filtered, not refused) |

**Pre-existing exposure (resolved 2026-09-18):** `docker-compose.yml` bound
`"5432:5432"`, publishing Postgres on `0.0.0.0` — i.e. on the public IP. UFW did
not block it because Docker inserts DNAT rules ahead of the UFW chain. Fixed in
`a764e10` by binding `127.0.0.1`.

---

## API process (PM2)

| Field | Value | Status |
|---|---|---|
| App name | `corpus-api` | [verified] |
| Mode | `fork`, `instances: 1` | [verified] `pm2 list` mode column |
| `cwd` | `/home/huy/apps/corpus-web` (repo root) | [verified] `pm2 jlist` |
| `script` | `apps/api/dist/main.js` | [verified] |
| `node_args` | **none** | [verified] `grep -A2 node_args ecosystem.config.cjs` → no output |
| `env:` inline block | **none** | [verified] removed earlier in session |
| `wait_ready` | `true` | [verified] PM2 warns `waiting for app to be ready` on start |
| `kill_timeout` | `10000` ms | [unverified] |
| `max_memory_restart` | `512M` | [unverified] |
| RAM at close | ~146 MB | [verified] `pm2 list` |
| Boot persistence | systemd unit installed, **reboot-verified** | [verified] see reboot section |

### ⚠ How env actually reaches the process — this changed during the session

The final, working configuration has **neither** `node_args: ['--env-file=...']`
**nor** `process.loadEnvFile()` in `main.ts`. Both were present mid-session and
both were removed:

- `--env-file` was lost when `sed -i "/probe-pg.cjs/d"` deleted the whole
  `node_args` line (the probe path and `--env-file` shared one line). The
  deletion was not intended, but the health check stayed green, which proved
  `--env-file` was not load-bearing.
- `process.loadEnvFile('/home/huy/apps/corpus-web/.env')` was reverted from
  `main.ts` (`git checkout`) because it hardcoded an absolute path that would
  break on Mac and in Phase C containers. Rebuild + restart after the revert
  kept the health check green.

**The only remaining env loader is `apps/api/src/config/dotenv.ts`, which
resolves `.env` relative to `process.cwd()`.** It works solely because PM2's
`cwd` is the repo root, where `.env` lives.

This is load-bearing and fragile: change `cwd` to `apps/api` and the app boots
with no env at all. `apps/api/.env` does not exist. See D-2.

---

## Health-check endpoints

### `/healthz/ready` [verified]

```
$ curl -s localhost:3001/healthz/ready
{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
```

Postgres reachable under `scram-sha-256`. Returned 503 with
`database: down` for the entire duration of the bug.

### `/me` [verified]

```
$ curl -si localhost:3001/me | head -1
HTTP/1.1 401 Unauthorized
```

401 (not 404) proves `AuthModule` is registered and Google OAuth credentials are
present in `.env` — the API is not in auth-disabled mode. Confirmed on **both**
VPS (`tsc` → `dist`) and Mac (`tsx/esm` + `node --watch`). The Mac result also
re-confirms the D26 A.3 `@Inject()` fix still holds under esbuild transpile,
where a regression would surface as `500 Cannot read properties of undefined`.

### `/healthz/live` [unverified]

Not exercised in this session.

---

## Reboot test

Two reboots. The first one failed by design and is worth recording.

**Reboot 1 (~07:07 CEST)** — `pm2 startup` prints a `sudo env PATH=...` command
but does **not** install anything itself. The operator ran `sudo reboot` in the
same command block, before running that printed command. Result after boot:

| Component | Result |
|---|---|
| Docker + `corpus-api-db` | Up, healthy within ~1 min — `unless-stopped` worked [verified] |
| PM2 | daemon not running, process list empty [verified] |

**Reboot 2 (~07:15 CEST)** — after running the printed
`sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u huy --hp /home/huy`
followed by `pm2 resurrect`:

| Component | Result |
|---|---|
| Docker + `corpus-api-db` | Up, healthy [verified] |
| PM2 + `corpus-api` | online, no operator intervention [verified] |
| `/healthz/ready` | `database: up` [verified] |

Boot ordering note: the PM2 systemd unit has no dependency on `docker.service`,
so the API may start before Postgres is accepting connections and log
`Retrying (n)...` for a few seconds. TypeORM retry absorbs this. Reboot 2 came
up clean, so no `After=docker.service` was added.

---

## Bug found and fixed

### Root cause — `toDatabaseUrl()` emitted the literal `***` as the password

**File:** `apps/api/src/config/env-schema.ts`

```ts
const mask = encodeURIComponent('***');
return `postgres://${user}:${mask}@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`;
```

The comment above the function claimed the URL was for logs and error paths
only, and that `data-source.ts` built the real connection string separately.
That comment was false. `apps/api/src/db/data-source.ts:33` passes
`url: toDatabaseUrl(env)` straight into TypeORM, and it is the **only** call
site. Every connection therefore authenticated with a 3-character password and
was rejected with `28P01 password authentication failed`.

`POSTGRES_PASSWORD` (64 hex) was correct in `.env` and correct in `process.env`
the whole time. It simply never reached the driver.

### Why it stayed hidden until Phase B

While `pg_hba.conf` had a `trust` rule covering the connection's source subnet,
Postgres never checked the password, so `***` was accepted and every health
check was green. The bug became visible only when the rule was tightened to
`scram-sha-256`. Any green health check taken under `trust` was meaningless.

### Secondary bug — `UrlOnlySchema` silently dropped `DATABASE_URL`

`UrlOnlySchema` did not declare `DATABASE_URL`, and zod's default strip mode
removes undeclared keys from `result.data`. A config using only `DATABASE_URL`
(no `POSTGRES_*`) would parse successfully, lose the value, fall through to the
component branch, and build
`postgres://undefined:undefined@undefined:undefined/undefined`.

Latent — no environment has used the URL-only form — but the file's own comments
advertise it as supported. Fixed by declaring `DATABASE_URL: z.string().url()`.

### Fix commits (branch `fix/database-url-masked-password`, base `develop @ 53e4b8e`)

| SHA | Title | Files |
|---|---|---|
| `9cdd712` | `fix(api): emit real password in toDatabaseUrl; move masking to its own fn` | `apps/api/src/config/env-schema.ts` only |
| `a764e10` | `fix(api): bind postgres host port to 127.0.0.1` | `docker-compose.yml` only |

Diffstat: 11 insertions, 7 deletions in `env-schema.ts`; 1 line in
`docker-compose.yml`. `dist/` is gitignored and not part of either commit.

`a764e10` is unrelated to the password bug in cause; it ships in the same branch
because it was discovered in the same session and closes a live exposure.

### Diagnostic technique that closed the case

A `pg.Pool` wrapper injected via `--require`, in a file outside the repo, with
no source edit:

```js
const pw = s => ((s || '').match(/:\/\/[^:]+:([^@]*)@/) || [])[1];
const pgPath = require.resolve('pg', { paths: ['/home/huy/apps/corpus-web/apps/api'] });
const pg = require(pgPath);
const OrigPool = pg.Pool;
class Pool extends OrigPool {
  constructor(o = {}) {
    const p = o.password, cs = o.connectionString;
    console.log('[pg.Pool]', JSON.stringify({
      host: o.host, port: o.port, user: o.user, database: o.database,
      password: typeof p === 'string' ? `len=${p.length} head=${p.slice(0, 6)}` : String(p),
      urlPwdLen: pw(cs)?.length, urlPwdHead: pw(cs)?.slice(0, 6),
      urlHost: cs ? String(cs).split('@')[1]?.split('/')[0] : undefined,
      db: cs ? String(cs).split('/').pop() : undefined,
    }));
    super(o);
  }
}
pg.Pool = Pool;
```

Before the fix:

```
[pg.Pool] {"password":"undefined","urlPwdLen":3,"urlPwdHead":"***",
           "urlHost":"localhost:5432","db":"corpus_api"}
```

`urlPwdLen: 3` is the line that ended the investigation.

After the fix:

```
[pg.Pool] {"host":"localhost","port":5432,"user":"corpus","database":"corpus_api",
           "password":"len=64 head=2ee7ff"}
```

Note the shape change: post-fix TypeORM hands `pg` discrete
`host/port/user/database/password` fields rather than a `connectionString`.

The probe lived at `~/apps/probe-pg.cjs` (deliberately **not** `/tmp`, which
systemd-tmpfiles clears on reboot — a probe path baked into `pm2 save` would
have killed the API on the next boot with `Cannot find module`). Removed after
verification; not committed.

A masking regex in an earlier revision of the probe hid the very digit that
mattered. If a probe masks anything, it must still print the length.

---

## Hypotheses excluded (with evidence)

| Hypothesis | Excluded by | Status |
|---|---|---|
| Password in `.env` wrong / not ALTERed | direct `pg` connect with `process.env.POSTGRES_PASSWORD` → `OK len 64 2ee7ffe9aad2` | [verified] |
| Verifier is md5, not SCRAM | `docker logs` shows only `DETAIL: Connection matched … line 1`, never `DETAIL: User "corpus" does not have a valid SCRAM secret` — Postgres always logs that line for the md5-verifier-vs-scram-hba case | [verified] |
| CRLF / duplicate `POSTGRES_PASSWORD` lines in `.env` | `grep -n … \| cat -A` → one password line, LF endings, no duplicates | [verified] |
| `DATABASE_URL` active in `.env` | line 27 is `#`-commented; `node --env-file=… -e 'console.log(process.env.DATABASE_URL)'` → `undefined`; the line was then deleted outright and the symptom did not change | [verified] |
| Old password (32 hex) baked into `dist/` | `grep -c 'afb8cb9d5cac' dist/main.js` → `0` | [verified] |
| Env leaked from SSH shell | `tr '\0' '\n' < /proc/<pid>/environ \| grep -E '^(DATABASE_URL\|POSTGRES_)'` → empty | [verified] |
| PM2 not applying `node_args` | `pm2 jlist` showed them correctly; `/proc/<pid>/cmdline` did not, because PM2 overwrites `process.title` | [verified] |
| Wrong host / port | probe shows `host: localhost, port: 5432`, matching the container binding, and the container logs a matching `FATAL` for each attempt | [verified] |
| Stale build serving old code | `rm -rf dist tsconfig.tsbuildinfo` + rebuild, then `grep -n 'POSTGRES_PASSWORD' dist/config/env-schema.js` → match at line 177 | [verified] |
| Process started before `.env` was last modified | **not tested** — the `ps -o lstart=` check was proposed but never run. `.env` mtime was `Sep 18 21:09`. Do not cite this as excluded | [unverified] |

---

## Debug gotchas codified

### 1. PM2 overwrites `process.title`, so `/proc/<pid>/cmdline` is not argv

`ProcessContainer.js` sets `process.title = process.env.PROCESS_TITLE || 'node ' + pm2_env.pm_exec_path`.
On Linux, assigning `process.title` overwrites the argv memory region, so
`/proc/<pid>/cmdline` reads back that synthesized string. The tell: in cluster
mode the real exec is `ProcessContainer.js`, so seeing `main.js` there proves
the rewrite happened. Ground truth is `pm2 jlist` → `pm2_env.node_args`.

This cost the most time in the session — it produced convincing-looking evidence
for a conclusion that was false.

### 2. PM2 cluster mode wraps the worker; `node_args` must be an Array

`lib/God/ClusterMode.js`:

```js
if (env_copy.node_args && Array.isArray(env_copy.node_args)) {
  cluster.settings.execArgv = env_copy.node_args;
}
```

A string `node_args` is silently ignored. The docs say either type is accepted;
the source only honors arrays.

### 3. In cluster mode, `--require` runs *before* PM2's env is unpacked

Node processes `execArgv` before the entry script. PM2 serialises the app env
into `process.env.pm2_env` as a JSON blob and `ProcessContainer.js` unpacks it
at startup — **after** `--require` has already run. So a `--require` script sees
the raw JSON blob, not the individual variables. Its stdout also predates
PM2's log redirection, so the output lands in `~/.pm2/pm2.log`, not the app log.
(Upstream PR #6121 proposes a fix; open as of this session.)

Fork mode has none of this. For debugging, fork mode is honest — the probe
output in this session landed in `corpus-api-out.log` as expected.

### 4. `pm2 restart` reuses cached env

`pm2 restart` does not re-read `.env` or the ecosystem file. After changing
either: `pm2 delete && pm2 start`. Env inherited from the shell lives on the
**daemon**, which `pm2 delete` does not touch — that needs `pm2 kill`, then a
fresh `pm2 start` from a shell where the stale variables are unset.

`pm2 save` snapshots env at save time into `~/.pm2/dump.pm2` in plaintext.

### 5. `/proc/<pid>/environ` does not show `--env-file` variables

Variables loaded by `--env-file` are set after exec, so they never appear in
`/proc/<pid>/environ`. That makes the file a clean discriminator: anything
present there was **inherited from the shell**. An empty result is positive
evidence of no leak, not an inconclusive one.

### 6. `node --env-file` does not overwrite existing env

Documented Node behaviour, and the same rule `dotenv.ts` implements. A stale
`export` in the calling shell makes `--env-file` a silent no-op for that key.

### 7. Docker port mapping rewrites the source IP to the bridge gateway

A connection to `127.0.0.1:5432` on the host arrives inside the container with
source `172.18.0.1` (the bridge gateway / userland proxy). A `pg_hba` rule keyed
on `127.0.0.1/32` therefore never matches host→container traffic, and the
connection falls through to whatever catch-all sits below.

### 8. UFW does not protect Docker-published ports

Docker's DNAT rules are inserted ahead of UFW's chain. The only reliable
restriction is the bind address in the port mapping: `"127.0.0.1:5432:5432"`.

### 9. `pg_ctl reload` fails as root in the container

Use `SELECT pg_reload_conf();` from `psql`. [unverified — from an earlier session]

### 10. zod strip mode drops undeclared keys silently

Cause of the secondary bug. If a config form is advertised as supported, every
key it accepts must be declared in that branch's schema.

### 11. Postgres authenticates before it checks the database exists

`28P01` means the credentials were rejected; a missing database would be
`3D000`. Useful for ruling out a wrong `POSTGRES_DB` without touching config.

### 12. `docker logs <pg-container>` tells the truth when the app does not

The server-side `FATAL` + `DETAIL:` pair names the matched `pg_hba` line and the
protocol result. This should be the **first** command in any Postgres auth
investigation, not the last — it was reached late in this session.

---

## Decisions

### D-1. PM2 fork mode, single instance

Fork over cluster: single instance is sufficient for Phase B, and fork removes
the `ProcessContainer` layer that hid `--require` output and faked
`/proc/<pid>/cmdline`. Cluster mode is also unsafe until the session store moves
out of process memory — with `instances > 1` and `MemoryStore`, requests land on
workers that do not hold the session, producing intermittent 401s.

### D-2. `cwd` is the repo root

`dotenv.ts` resolves `.env` from `process.cwd()`, and `.env` lives at the repo
root. With `cwd: apps/api` the app boots with no env. This is currently the
**entire** env path — see the warning in the PM2 section.

Follow-up worth opening: make the env path explicit rather than cwd-dependent,
e.g. resolve upward from `import.meta.url`, or read an `ENV_FILE` variable. The
current setup is one config edit away from a silent repeat of this class of bug.

### D-3. No inline `env:` block in the ecosystem file

It duplicates the password into `~/.pm2/dump.pm2` in plaintext, and it makes
`pm2 restart` serve stale values forever.

### D-4. No `node_args` in the ecosystem file

**Outcome of an accident, then kept deliberately.** `--env-file` was removed by
the `sed` that stripped the probe, and the app stayed healthy — proving
`dotenv.ts` alone is sufficient given D-2. Re-adding `--env-file` is harmless
but redundant; picking exactly one loader is the point.

`process.loadEnvFile()` in `main.ts` was reverted and is **not** the production
env path. Any document or prompt stating otherwise is out of date.

### D-5. Password rotation

Rotated 2026-09-18 21:09 CEST. The previous 32-hex value leaked in plaintext in
chat and is REVOKED. **The current 64-hex value has also appeared in plaintext
in session notes and chat** — rotate once more before anything external can
reach the API, so the production value exists only on the VPS.

Procedure: `SET password_encryption = 'scram-sha-256';` then
`ALTER USER corpus WITH PASSWORD '<new>';` inside the container, update
`POSTGRES_PASSWORD` in `.env`, then `pm2 delete && pm2 start && pm2 save`, then
`curl /healthz/ready`. Restart (not reload) is required because the pool caches
credentials.

### D-6. TLS via Cloudflare Tunnel

OAuth needs HTTPS on three independent counts: Google rejects `http://` redirect
URIs on public domains, browsers block mixed content from the Vercel HTTPS
origin, and the session cookie cannot carry `Secure` over HTTP. Tunnel over
Caddy because it needs no inbound port at all, which matters specifically on a
host where Docker bypasses UFW.

Accepted costs: dependency on Cloudflare uptime, an extra daemon, and the loss
of direct `curl` access to the origin from outside — keep `curl localhost:3001`
on the VPS as the origin-side reference when debugging.

The "hide the VPS IP" argument is weak: `api.nxhhuy.tech` has had a public
A-record for a while and passive-DNS services retain that permanently.

### D-7. Pre-OAuth checklist (not done — blocks the round-trip)

- `app.set('trust proxy', 1)` in `main.ts`, so `express-session` honors
  `X-Forwarded-Proto: https` from the edge
- `SESSION_COOKIE_DOMAIN=.nxhhuy.tech` on the VPS
- `GOOGLE_CALLBACK_URL=https://api.nxhhuy.tech/auth/google/callback`, exact match
  in Google Console
- Apex and `api.` share an eTLD+1, so `SameSite=Lax` suffices; `None` is not
  needed

---

## Open items at session close

### Merge-time

| Item | Notes |
|---|---|
| VPS back onto `develop` + `git stash drop` | see the warning at the top |
| `toMaskedDatabaseUrl()` has no caller | it was added but never wired in. Either route the logging/error paths through it or the masking intent is still unimplemented |
| Tests for `toDatabaseUrl` | three cases: component form returns the real password; `DATABASE_URL` form returns it verbatim; `loadEnv()` with only `DATABASE_URL` does not strip it. `apps/api` has zero test files, so this is also the test-runner bootstrap |
| `.env.example` still contains `# DATABASE_URL=postgres://corpus:***@localhost:5432/corpus_api` | that `***` placeholder is what made the real bug look like redacted output for hours. Delete it, or write it without a password-shaped placeholder |

### Blocking OAuth round-trip

Cloudflare Tunnel → `trust proxy` + cookie domain + callback URL → final
password rotation → end-to-end Google login test.

### Carry-forward

Webhook auto-deploy listener; nightly `pg_dump` → R2; PR #179 (OAuth) and
PR #180 (TypeORM drift) awaiting a merge call; Phase C Dockerize; `docs/DEBT.md`
rows D57/D58/D59 marked closed but still filed under Open.

---

## Pattern — silent fallback is the recurring failure mode

Four layers in one incident, each returning something plausible instead of
failing loudly:

1. **`pg_hba.conf`** — the intended `127.0.0.1/32` rule never matched, because
   Docker rewrites the source IP. Traffic fell through to the catch-all.
2. **`dotenv.ts`** — skips any key already present in `process.env`, with no log
   line. (The precedence itself is correct and must stay for Phase C; the
   silence is the problem.)
3. **zod strip mode** — drops undeclared keys from the parse result without
   warning.
4. **`toDatabaseUrl()`** — returned a URL that was syntactically valid, parsed
   cleanly, and connected to a real server, but carried the wrong password.

Each is defensible alone. Stacked, they moved the failure four layers downstream
of its cause and turned a one-line fix into a multi-hour hunt, with the first
three hours spent proving correct things about the env layer.

> **Config resolution must fail loudly, or a test must assert the final value.
> "It booted" is not evidence of correctness — and under `trust`, neither is a
> green health check.**

---

## Files referenced

In-repo:
- `apps/api/src/config/env-schema.ts` — bug location; fixed in `9cdd712`
- `apps/api/src/db/data-source.ts:33` — the single `toDatabaseUrl()` call site
- `apps/api/src/config/dotenv.ts` — unchanged; currently the only env loader
- `apps/api/src/main.ts` — unchanged (the `loadEnvFile` experiment was reverted)
- `docker-compose.yml` — fixed in `a764e10`
- `.env.example` — still carries the `***` placeholder line

VPS-side, not in the repo:
- `/home/huy/apps/corpus-web/.env` — `POSTGRES_PASSWORD` 64 hex; the commented
  `DATABASE_URL` line was deleted during debugging
- `/home/huy/apps/corpus-web/apps/api/ecosystem.config.cjs` — gitignored,
  per-machine; exists in exactly one place, worth copying into deploy notes
- `/home/huy/.pm2/logs/corpus-api-{out,error}.log`, `/home/huy/.pm2/pm2.log`
- `/home/huy/.pm2/dump.pm2` — saved with the probe already removed
- `/var/lib/postgresql/data/pg_hba.conf` (in container) — line 1 is the
  `172.18.0.0/16 scram-sha-256` rule

---

## Verification receipts at session close

| Receipt | Value | Status |
|---|---|---|
| `curl -s localhost:3001/healthz/ready` | `{"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}` | [verified] |
| `curl -si localhost:3001/me \| head -1` | `HTTP/1.1 401 Unauthorized` | [verified] |
| `pm2 list` | `corpus-api` online, fork, ~146 MB | [verified] |
| `docker ps` | `corpus-api-db` Up healthy, `127.0.0.1:5432->5432/tcp` | [verified] |
| `docker exec … head -1 pg_hba.conf` | `host all all 172.18.0.0/16 scram-sha-256` | [verified] |
| `[pg.Pool]` probe | `password: len=64 head=2ee7ff` | [verified] |
| Reboot 2 | API + DB auto-start, health green, no intervention | [verified] |
| Branch test on VPS pre-merge | `fix/database-url-masked-password` checked out, `pnpm install --frozen-lockfile` → lockfile up to date, rebuild, restart → both endpoints green | [verified] |
| Mac test (`tsx/esm`) | app boots clean, all routes mapped, `/healthz/ready` up, `/me` 401 | [verified] |
| `curl localhost:3001/healthz/live` | not run | [unverified] |
| `nc -vz 46.250.225.5 5432` | hangs (filtered) | [verified, 2026-09-18] |
