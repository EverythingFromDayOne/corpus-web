#!/usr/bin/env node
/**
 * verify-api-runtime.mjs
 *
 * Extends `hermes verify` coverage to the apps/api runtime. The saved
 * `hermes verify` recipe points at `apps/web` (port 3000) — proven by the
 * fact that session 191's `hermes verify --save --json` returned
 * `readiness: null` and `start: "pnpm dev"`. Green meant only that the
 * web app's build/typecheck/lint/test pipeline passed; it said nothing
 * about whether the api starts, connects to Postgres, or that the
 * health endpoints from PR #177 return 200.
 *
 * This script is the missing leg. It is *not* a replacement for
 * `hermes verify` (which still owns web) — it runs alongside it as an
 * additional out-of-band probe, exercised by:
 *
 *   - `pnpm verify:api-runtime` (root, this script directly)
 *   - any future composite `pnpm verify:all` wrapper
 *
 * Lifecycle:
 *
 *   1. Pre-flight: docker reachable, .env exists (cp from .env.example
 *      if missing — committed example uses [REDACTED] placeholders that
 *      fail boot, so we only copy if the file is fully absent).
 *   2. Build: `pnpm --filter @corpus/api build` (turbo).
 *   3. Postgres up: `docker compose up -d db` (the api's own compose at
 *      repo root), wait for `pg_isready`.
 *   4. Migration round-trip: `pnpm --filter @corpus/api migration:run`
 *      then `migration:revert` then `migration:run` — proves the
 *      migration table works against the live DB, not just compiles.
 *   5. API up: start `node apps/api/dist/main.js` in the background,
 *      capture PID, poll `/healthz/live` for HTTP 200 (no DB touch —
 *      succeeds even if step 3 was skipped; here we want it with DB
 *      up so the next probe is meaningful).
 *   6. Readiness: poll `/healthz/ready` for HTTP 200 with `database:up`
 *      in the body — proves TypeORM actually connected.
 *   7. Teardown: kill the API, `docker compose stop db` (volume kept —
 *      a deliberate reset is `docker compose down -v`, not `stop`).
 *
 * Exits 0 on full green, 1 on any failure. Prints one phase per line
 * so the output is greppable in CI logs.
 *
 * D53 row in docs/DEBT.md records the gap; this script + the companion
 * `apps/api/.hermes/environment.json` manifest close it without an
 * upstream Hermes CLI change. Single-port recipe schema is preserved —
 * `hermes verify apps/api` now works against the api manifest the same
 * way `hermes verify` works against the root web manifest.
 */
import { execFile, execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const PHASE = {
  PREFlight: 'preflight',
  Build: 'build',
  PostgresUp: 'postgres-up',
  Migration: 'migration-roundtrip',
  ApiStart: 'api-start',
  Liveness: 'healthz/live',
  Readiness: 'healthz/ready',
  Teardown: 'teardown',
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function log(phase, status, message) {
  const tag = `${status === 'PASS' ? colors.green : status === 'FAIL' ? colors.red : colors.yellow}${status.padEnd(4)}${colors.reset}`;
  console.log(`${tag}  ${colors.cyan}${phase.padEnd(20)}${colors.reset}  ${message}`);
}

async function runPhase(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    log(name, 'PASS', `${detail ?? ''}  ${colors.dim}(${((Date.now() - t0) / 1000).toFixed(1)}s)${colors.reset}`);
    return true;
  } catch (err) {
    log(name, 'FAIL', `${err.message ?? err}  ${colors.dim}(${((Date.now() - t0) / 1000).toFixed(1)}s)${colors.reset}`);
    if (err.stderr) console.error(colors.dim + err.stderr + colors.reset);
    return false;
  }
}

function loadDotEnv() {
  // The API has its own dotenv loader at apps/api/src/config/dotenv.ts,
  // but Node won't pick it up automatically here. We mirror the minimum
  // surface: read .env from the repo root and export each KEY=VALUE pair
  // into the current process so child processes inherit it.
  const envPath = join(ROOT, '.env');
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2];
    // Strip surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}

function ensureEnv() {
  const envPath = join(ROOT, '.env');
  const examplePath = join(ROOT, '.env.example');
  if (!existsSync(envPath)) {
    if (!existsSync(examplePath)) {
      throw new Error('.env and .env.example both missing — cannot bootstrap');
    }
    copyFileSync(examplePath, envPath);
    console.log(`${colors.dim}  copied .env.example -> .env (local dev only, gitignored)${colors.reset}`);
  }
}

async function dockerReachable() {
  try {
    await execFileP('docker', ['info'], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function postgresUp() {
  // Bring up only the `db` service (the compose file has no other
  // service, but specifying it keeps this script robust if one is
  // added later). `up -d` is idempotent — if the container is already
  // running, this is a no-op.
  await execFileP('docker', ['compose', 'up', '-d', 'db'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: process.env,
  });

  // We probe via `docker exec <container> pg_isready` rather than the
  // host's `pg_isready` because the host may not have libpq installed
  // (Postgres clients are not a baseline dep on macOS dev machines).
  // The container has `pg_isready` natively — it's how compose's
  // healthcheck probes the same thing.
  const user = process.env.POSTGRES_USER;
  const db = process.env.POSTGRES_DB;
  if (!user || !db) throw new Error('.env is missing POSTGRES_USER or POSTGRES_DB');

  const container = process.env.POSTGRES_CONTAINER ?? 'corpus-api-db';
  const deadline = Date.now() + 60_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      await execFileP('docker', ['exec', container, 'pg_isready', '-U', user, '-d', db], {
        stdio: 'pipe',
      });
      return;
    } catch (err) {
      lastError = err.stderr ?? err.message;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`pg_isready in container ${container} timed out after 60s — last: ${lastError ?? 'unknown'}`);
}

async function waitForHttp(url, { expect, timeoutMs, label }) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      const body = await res.text();
      if (expect(res, body)) {
        return { status: res.status, body };
      }
      lastError = `HTTP ${res.status}: ${body.slice(0, 120)}`;
    } catch (err) {
      lastError = err.message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} timed out after ${timeoutMs / 1000}s — last: ${lastError ?? 'unknown'}`);
}

function startApiInBackground() {
  const mainPath = join(ROOT, 'apps/api/dist/main.js');
  if (!existsSync(mainPath)) {
    throw new Error(`${mainPath} not found — build phase must run first`);
  }
  const proc = spawn('node', [mainPath], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  let stdoutBuf = '';
  let stderrBuf = '';
  proc.stdout.on('data', (chunk) => { stdoutBuf += chunk.toString(); });
  proc.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`${colors.dim}  api exited code=${code} before teardown${colors.reset}`);
      if (stdoutBuf) console.error(colors.dim + stdoutBuf + colors.reset);
      if (stderrBuf) console.error(colors.dim + stderrBuf + colors.reset);
    }
  });
  return proc;
}

async function main() {
  loadDotEnv();
  ensureEnv();
  loadDotEnv(); // re-read after potential copy

  console.log(`${colors.cyan}=== verify:api-runtime ===${colors.reset}`);
  console.log(`${colors.dim}  root: ${ROOT}${colors.reset}`);
  console.log(`${colors.dim}  api port: ${process.env.PORT ?? '3001'} (from .env PORT, default 3001)${colors.reset}`);
  console.log('');

  let apiProc = null;
  let dbBroughtUp = false;
  let allOk = true;

  // Phase 1: preflight (docker reachable + .env present)
  allOk = (await runPhase(PHASE.PREFlight, async () => {
    if (!(await dockerReachable())) {
      throw new Error('docker not reachable — start Docker Desktop / colima and retry');
    }
    return 'docker ok, .env ok';
  })) && allOk;
  if (!allOk) return finish(allOk);

  // Phase 2: build
  allOk = (await runPhase(PHASE.Build, async () => {
    await execFileP('pnpm', ['--filter', '@corpus/api', 'build'], {
      cwd: ROOT,
      stdio: 'pipe',
      env: process.env,
    });
    return 'apps/api compiled';
  })) && allOk;
  if (!allOk) return finish(allOk);

  // Phase 3: Postgres up
  allOk = (await runPhase(PHASE.PostgresUp, async () => {
    await postgresUp();
    dbBroughtUp = true;
    return `pg_isready ok inside container ${process.env.POSTGRES_CONTAINER ?? 'corpus-api-db'}`;
  })) && allOk;
  if (!allOk) return finish(allOk, { apiProc, dbBroughtUp });

  // Phase 4: migration round-trip (run → revert → run)
  allOk = (await runPhase(PHASE.Migration, async () => {
    await execFileP('pnpm', ['--filter', '@corpus/api', 'migration:run'], {
      cwd: ROOT, stdio: 'pipe', env: process.env,
    });
    await execFileP('pnpm', ['--filter', '@corpus/api', 'migration:revert'], {
      cwd: ROOT, stdio: 'pipe', env: process.env,
    });
    await execFileP('pnpm', ['--filter', '@corpus/api', 'migration:run'], {
      cwd: ROOT, stdio: 'pipe', env: process.env,
    });
    return 'run → revert → run ok';
  })) && allOk;
  if (!allOk) return finish(allOk, { apiProc, dbBroughtUp });

  // Phase 5: API start
  allOk = (await runPhase(PHASE.ApiStart, async () => {
    apiProc = startApiInBackground();
    // Give Nest a moment to bind the socket before the first poll
    await new Promise((r) => setTimeout(r, 1500));
    if (apiProc.exitCode !== null) {
      throw new Error(`api exited immediately (code ${apiProc.exitCode})`);
    }
    return `pid ${apiProc.pid}`;
  })) && allOk;
  if (!allOk) return finish(allOk, { apiProc, dbBroughtUp });

  const port = process.env.PORT ?? '3001';
  const base = `http://127.0.0.1:${port}`;

  // Phase 6: /healthz/live (no DB touch — succeeds with DB up too, but
  // its presence here is to prove the route handler is wired; the DB
  // up case is verified by the next phase)
  allOk = (await runPhase(PHASE.Liveness, async () => {
    const { status } = await waitForHttp(`${base}/healthz/live`, {
      expect: (res) => res.status === 200,
      timeoutMs: 30_000,
      label: 'GET /healthz/live',
    });
    return `HTTP ${status}`;
  })) && allOk;

  // Phase 7: /healthz/ready (with DB up — proves TypeORM connected)
  allOk = (await runPhase(PHASE.Readiness, async () => {
    const { status, body } = await waitForHttp(`${base}/healthz/ready`, {
      // Terminus returns 200 + a payload like:
      //   {"status":"ok","info":{"database":{"status":"up"}},"error":{},"details":{"database":{"status":"up"}}}
      // We assert HTTP 200 (the route handler responded) AND that the
      // nested database.status is "up" (TypeORM actually connected).
      // The "ok" top-level status means the whole readiness check passed.
      expect: (res, body) => res.status === 200
        && /"status"\s*:\s*"ok"/.test(body)
        && /"database"\s*:\s*\{\s*"status"\s*:\s*"up"/.test(body),
      timeoutMs: 30_000,
      label: 'GET /healthz/ready',
    });
    return `HTTP ${status} — database:up`;
  })) && allOk;

  return finish(allOk, { apiProc, dbBroughtUp });
}

async function finish(ok, { apiProc = null, dbBroughtUp = false } = {}) {
  // Teardown
  await runPhase(PHASE.Teardown, async () => {
    if (apiProc && apiProc.exitCode === null) {
      apiProc.kill('SIGTERM');
      // Give it 3s to exit cleanly, then SIGKILL
      const exited = await Promise.race([
        new Promise((r) => apiProc.once('exit', () => r(true))),
        new Promise((r) => setTimeout(() => r(false), 3000)),
      ]);
      if (!exited && apiProc.exitCode === null) {
        apiProc.kill('SIGKILL');
      }
    }
    if (dbBroughtUp) {
      try {
        await execFileP('docker', ['compose', 'stop', 'db'], {
          cwd: ROOT, stdio: 'pipe', env: process.env,
        });
      } catch (err) {
        // Don't fail teardown over a stop error — the volume is preserved
        console.error(`${colors.dim}  docker compose stop db failed (non-fatal): ${err.message}${colors.reset}`);
      }
    }
    return 'clean';
  });

  console.log('');
  console.log(ok
    ? `${colors.green}=== PASS: api runtime green ===${colors.reset}`
    : `${colors.red}=== FAIL: api runtime not green ===${colors.reset}`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(`${colors.red}unexpected error: ${err.message}${colors.reset}`);
  if (err.stack) console.error(err.stack);
  process.exit(2);
});
