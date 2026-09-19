# Session 210 — `fix/database-url-masked-password` follow-ups

**Owner:** coding-be (this is `apps/api` work; FE not involved)
**Base branch:** `develop @ 53e4b8e` (merge of PR #186, Phase B scaffold)
**Working branch for this session:** Deliverables 0–1 stay on `fix/database-url-masked-password` (D0 is a 3rd commit on that branch); Deliverables 2–5 start fresh branches from `develop`
**Skills to load before coding:** `corpus-web-context`, `nestjs-module-scaffold` (for the test runner wiring shape)
**Reasoning level:** high — multi-file, multi-PR, security-sensitive (D5 password rotation is live, not in scope here)

---

## ⚠ CRITICAL — read this before doing anything else

**`9cdd712` does NOT fix the bug it claims to fix.** Lead's parent-thread review ("`9cdd712` (+11/-7, single file `env-schema.ts`): root cause correctly identified at the source") was wrong. Coding-BE's diff (verified against `git show 9cdd712:apps/api/src/config/env-schema.ts` lines 188–196) caught the regression:

```ts
const password = encodeURIComponent(e.POSTGRES_PASSWORD);   // dead local
return `postgres://${user}:***@${...}`;                       // literal *** in template
```

The variable `password` is computed and discarded. The template literal still emits `***`. `toMaskedDatabaseUrl()` then `.replace(/:\\/\\/([^:@/]+):[^@]*@/, '://$1:***@')` matches `***` as the "password" segment and rewrites it to `***` — a no-op redundancy. TypeORM would still authenticate `user:***@host`. The VPS went green because of the **password rotation + `pg_hba.conf` `scram-sha-256` tightening** in the same session, not because of `9cdd712`. The evidence file's `[pg.Pool]` probe showing `password: len=64...e7ff` must have come from the URL-form branch (`if (env.DATABASE_URL) return env.DATABASE_URL`), where `.env`'s `DATABASE_URL=` is returned as-is — i.e. production `.env` is using `DATABASE_URL` not `POSTGRES_PASSWORD`, and the component-form branch has never been exercised end-to-end against the live DB.

**This means `9cdd712` is a "looks fixed, isn't fixed" commit.** The intended fix is a one-character change (`:${password}` instead of `:` + literal `***`), plus deleting the dead local, plus deleting the now-stale comment block above the function (it claims the URL is only for logs, which the function's caller no longer agrees with).

**Deliverable 0 — the third commit on `fix/database-url-masked-password` — is the real fix.** It must land BEFORE any of the test PRs (D1, D2) can prove correctness, and BEFORE any masking-wiring follow-up. The test PRs assume `${password}` is already substituted; without D0, the tests will assert against the buggy code and pass the bug.

Lead retracts the "two commits are clean and ready" verdict. This is **blocker #1 for merge** of `fix/database-url-masked-password`.

---

## Context (corrected)

PR #186 (Phase B PM2 deploy code slice) is merged into `develop @ 53e4b8e`. On top of that, the user opened branch `fix/database-url-masked-password` with two commits:

- `9cdd712` — fix(api): emit real password in toDatabaseUrl; move masking to its own fn (+11/-7, `apps/api/src/config/env-schema.ts` only). **Does NOT actually substitute the password** — see ⚠ CRITICAL above. The variable is declared but the template literal is unchanged. The secondary `UrlOnlySchema.DATABASE_URL: z.string().url()` add IS correct (closes the latent zod-strip bug).
- `a764e10` — fix(api): bind postgres host port to 127.0.0.1 (1 line, `docker-compose.yml`). `5432:5432` was publishing Postgres on `0.0.0.0`; UFW didn't block it because Docker DNAT runs ahead of UFW. Verified closed: `nc -vz 46.250.225.5 5432` hangs (filtered) post-fix. **This commit IS correct and shippable as-is.**

Evidence file at `docs/vps-api-setup.md` (569 lines, audit format, every row tagged `[verified]` or `[unverified]`). The 4-layer silent fallback is documented in the file: pg_hba trust → dotenv skip-existing → zod strip → `toDatabaseUrl` parseable-but-wrong. **Read that file end-to-end before scoping** — it has a "⚠ READ FIRST" block at the top.

---

## Out of scope (do NOT touch)

- The actual `9cdd712` (except to fix it via Deliverable 0) and `a764e10` commits — they stay on the user's VPS branch.
- VPS operations (password rotation, webhook listener install, `pm2 save`).
- Cloudflare Tunnel setup (D-6 in the evidence file, non-blocking per user).
- The masking-intent wiring (`toMaskedDatabaseUrl()` callers) — separate decision the user will take later; do NOT wire it speculatively in this session.
- `apps/web/**`, `content/**`, `packages/ui/**`, `packages/content-schema/**`.
- AGENTS.md / CLAUDE.md / `.cursor/rules/*` regeneration.

---

## Deliverables (in order)

### Deliverable 0 — third commit on `fix/database-url-masked-password` (THE REAL FIX)

Branch: stays on `fix/database-url-masked-password` (NOT a new branch — this is the third commit on the user's existing branch, sitting on top of `9cdd712`). Commit message: `fix(api): actually substitute POSTGRES_PASSWORD in toDatabaseUrl template`.

Files: `apps/api/src/config/env-schema.ts` only.

Changes:
1. **Substitute the variable in the template.** Replace:
   ```ts
   const password = encodeURIComponent(e.POSTGRES_PASSWORD);
   return `postgres://${user}:***@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`;
   ```
   with:
   ```ts
   const password = encodeURIComponent(e.POSTGRES_PASSWORD);
   return `postgres://${user}:${password}@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`;
   ```
   The single character change is `${password}` instead of literal `***`.

2. **Delete the now-stale comment block** above the function (lines 184–193 in the post-`9cdd712` file). The comment claims the URL is only for logs and the real connection string comes from somewhere else — that was false pre-`9cdd712` and is still false post-`9cdd712`. The function's own doc-comment (`/** Resolve the canonical DATABASE_URL. ... */`) is the correct description; keep it.

3. **Optional but recommended:** add a defensive assertion that catches the regression if a future edit reintroduces it. Two options:
   - **(a) Hard fail at runtime**: after computing `password`, check `password !== '***'` (or `password.length > 0` — `***` is 3 chars but a real password should be much longer; a length check is less brittle). If `password === '***'`, throw a `ConfigurationError`. Loud-fail principle from the evidence file's "Patterns codified".
   - **(b) Doc-only**: write a comment near the function warning future maintainers "do not change `:${password}` to a literal — this function is the only call site for the canonical connection string."

   Recommend (a). The evidence file's principle "config resolution must fail loud, or a test must assert the final value" is the project's stated stance; a runtime assertion enforces it without requiring a test runner.

4. **Add a `node --test` smoke** at `apps/api/src/config/__tests__/env-schema.smoke.test.mjs` (or `.test.mjs`) that asserts:
   - `toDatabaseUrl()` with a `ComponentFormSchema` env returns a URL whose `password` segment (decoded from the URL) equals the input `POSTGRES_PASSWORD` exactly — NOT `***`.
   - `toMaskedDatabaseUrl()` with the same input returns a URL whose `password` segment is `***`.
   - `toDatabaseUrl()` with a `UrlOnlySchema` env (only `DATABASE_URL` set) returns that `DATABASE_URL` unchanged.

   Use Node 24's built-in `node:test` (`import { test } from 'node:test'; import assert from 'node:assert/strict';`) — zero new dependencies. Run via `node --test apps/api/src/config/__tests__/*.test.mjs`. Add a script `test:smoke` to `apps/api/package.json` running that command. This is the smoke BE recommended; it proves Deliverable 0's substitution works without depending on the vitest bootstrap PR.

   **Note on the `.test.mjs` filename**: the smoke is `.mjs` (plain JS, not TS) so it doesn't need a TS runner. The vitest bootstrap PR (D1) handles the TS test files separately.

   **Note on import path**: `toDatabaseUrl` is exported from `apps/api/src/config/env-schema.ts`. The smoke imports it via the compiled JS path — either compile `apps/api` first (`pnpm --filter @corpus/api build`, then import from `dist/config/env-schema.js`), or use `tsx`/`ts-node`-free approach. The simplest: import the TS source through `tsx`'s `--import` flag (the api already uses `tsx/esm` for `start:dev`), so the smoke's run command is `node --import tsx/esm --test apps/api/src/config/__tests__/env-schema.smoke.test.mjs` — `tsx` is already a `devDependencies` dep on `apps/api`, zero new packages.

   **Wait — the `tsx` dep**: verify `tsx` is in `apps/api/package.json` devDependencies before relying on it. If it's only a transitive dep, add it explicitly (a 0-byte "add to devDependencies" change, not a "new dep" — same package is already in the tree).

Acceptance:
- `pnpm --filter @corpus/api test:smoke` exits 0 with 3 assertions passing.
- `pnpm --filter @corpus/api typecheck` passes.
- `pnpm --filter @corpus/api lint` passes.
- All 9 root gates still green.
- The diff vs `9cdd712` is small: ~3 lines added (`${password}` substitution, defensive assertion if option (a), test file) and ~10 lines deleted (the dead `password` local, the stale comment block, the `mask` rename artifacts). Net diff: small + focused.
- `pnpm agents:check` still green (no rule files touched).

Docs:
- Amend the PR (the user's existing PR for `fix/database-url-masked-password`) with the new commit. If the PR has already been opened, push the commit to the same branch; the PR will auto-update. If the PR hasn't been opened yet, open it with all 3 commits in one PR.
- PR body update: add a section "Critical correction on `9cdd712`" explaining that the original commit declared a `password` local but didn't substitute it into the template, that the substitution only landed in the third commit, and that the VPS green was driven by password rotation + `pg_hba.conf` tightening in the same session, not by the original commit. **Do NOT silently amend the prior commit** — the user has the VPS running that exact SHA in `git log`, and the post-merge sequence in `docs/vps-api-setup.md`'s header is keyed on the existing SHA chain.

### Deliverable 1 — `apps/api` vitest bootstrap PR

`apps/api` currently has zero `.spec.ts` / `.test.ts` files and no `vitest` / `jest` config (confirmed via `cat apps/api/package.json`). Per the user's instruction: "split into a separate PR per AGENTS.md — don't block this fix on vitest bootstrap." So **this PR is just the test runner wiring**, no tests yet.

Branch: `feat/apps-api-vitest-bootstrap` (off `develop`)
Files:
- `apps/api/package.json` — add `vitest`, `@vitest/coverage-v8` to `devDependencies`; add scripts `test`, `test:run` (vitest run), `test:coverage`. Match the version range used in `apps/web/package.json` (already on vitest) for consistency. If `apps/web/package.json` pins an exact version, mirror the constraint.
- `apps/api/vitest.config.ts` (NEW) — minimal config: `environment: 'node'`, `include: ['src/**/*.spec.ts']`, single-thread (the api runtime depends on a single Postgres connection in `verify:api-runtime`; parallel tests would compete for the same env). Coverage thresholds not configured in this PR — that's a separate decision.
- `apps/api/tsconfig.json` (REVIEW ONLY — do not change unless required) — make sure `vitest` types resolve. If the existing `tsconfig.json` excludes `**/*.spec.ts`, that's fine; vitest reads its own `tsconfig` via the config file.
- `.gitignore` (REVIEW ONLY) — verify `coverage/` is ignored (likely already covered by the existing pattern).

Acceptance:
- `pnpm --filter @corpus/api test:run` exits 0 with zero tests run (vitest reports "No test files found").
- `pnpm --filter @corpus/api typecheck` still passes.
- `pnpm --filter @corpus/api lint` still passes (eslint config may need `vitest/globals` typed — check `apps/web/eslint.config.*` for the pattern; if the existing api eslint setup doesn't typecheck test files, that's fine, vitest tests will be typechecked by `tsc --noEmit` separately).
- All 9 root gates still green: `pnpm typecheck`, `pnpm lint`, `pnpm build` (the api build, the web build, the lib builds), `pnpm test` (web side, still 113/113), `pnpm agents:check`, `pnpm verify:submodules`, `pnpm verify:frontmatter`, `pnpm verify:links`, `pnpm verify:catalog`, `pnpm verify:api-runtime`.

Docs:
- Open the PR against `develop`. Title: `chore(api): bootstrap vitest in apps/api`. Body: link to D57 (this is the test-runner half of D57's recommendation) and to Session 210.
- Do NOT add a debt row in this PR; the bootstrap itself isn't a defect, it's infrastructure for D57's "no test caught this" gap.

### Deliverable 2 — `apps/api` env-schema test file PR (depends on D1 being merged first)

Branch: `test/apps-api-env-schema` (off `develop`, after D1 lands)
Files: ONE test file only, per the user's "split per AGENTS.md" rule.

`apps/api/src/config/__tests__/env-schema.spec.ts` (NEW) — three test cases per the user's spec:

1. **`toDatabaseUrl()` component form** — pass an `AppEnv` populated with `POSTGRES_*` fields (no `DATABASE_URL`); assert the returned URL contains the *real* `POSTGRES_PASSWORD` URL-encoded (not `***`), and matches the expected `postgres://<user>:<password>@<host>:<port>/<db>` shape exactly.
2. **`toDatabaseUrl()` URL form** — pass an `AppEnv` with only `DATABASE_URL` set (the `UrlOnlySchema` path); assert the returned URL is the input `DATABASE_URL` unchanged (or with whatever normalization `toDatabaseUrl` performs on that branch — match what the code actually does, not what the doc comment claims).
3. **`loadEnv()` with only `DATABASE_URL`** — exercise the `loadEnv()` / dotenv path with an env object containing only `DATABASE_URL` (no `POSTGRES_*`); assert the result has `DATABASE_URL` populated and `POSTGRES_*` undefined. **This is the test that would have caught the zod-strip bug**: pre-fix, the URL would silently disappear. To exercise this test, you may need to write a test helper that calls into the env-loading code without booting Nest — check `apps/api/src/config/env-schema.ts` for the actual public surface; if only `loadEnv` is exported and it requires a full env file, mock the filesystem. If the only way to exercise the URL-only path is to spin up the whole app, document that in the test's comment and skip the case with a `test.skip('requires full bootstrap, see D57')` note — the test file is still useful for cases 1 + 2.

Acceptance:
- `pnpm --filter @corpus/api test:run` exits 0 with 3 tests passing (or 2 passing + 1 skipped, if the bootstrap issue above applies).
- `pnpm --filter @corpus/api test` (watch mode) runs interactively.
- All 9 root gates still green.

Docs:
- Open the PR against `develop`. Title: `test(api): cover toDatabaseUrl component/URL forms and loadEnv DATABASE_URL path`. Body: link to D57, to Session 210, and reference the bug class from the evidence file.
- Do NOT wire `toMaskedDatabaseUrl()` callers in this PR — separate decision.

### Deliverable 3 — `.env.example` placeholder fix PR

**ID clarification:** The user said "Open D58 PR" but D58 in `docs/DEBT.md` is already closed (provider event bus, sub-entries a/b/c all closed 2026-09-18). The append-only ID rule from `.cursor/rules/00-session-protocol.mdc` forbids reuse. **This PR opens D62** (next available after D61); flag the rename in the PR body so the user can correct if needed.

Branch: `fix/d62-env-example-placeholder` (off `develop`)
Files:
- `.env.example` — remove the `# DATABASE_URL=<postgres://corpus>:***@...` placeholder line, OR rewrite it to a non-misleading shape. The placeholder is what disguised the real bug for hours — any future contributor reading the example alone would be misled the same way. Recommended replacement: either delete the line entirely (DATABASE_URL is one of two supported config paths; if neither `POSTGRES_*` nor `DATABASE_URL` is documented, the example can show `POSTGRES_*` as the only documented path and mention DATABASE_URL is the alternative in a comment), OR replace with `# DATABASE_URL=<postgres://<user>:<password>@<host>:<port>/<db>  # alternative to POSTGRES_* below — see apps/api/src/config/env-schema.ts for both supported shapes`. Pick the cleaner of the two; document the choice in the PR body.
- **Do NOT touch `.env`** (the user's local dev file, secrets, gitignored anyway). The user said "delete on dev machines" in the prompt — that's a local operator action, not a repo change.
- **Do NOT touch `apps/api/.env.example`** unless one exists and has the same line — check first; if it exists and has the same issue, fix it in the same PR (one PR per file family is fine when they're the same defect).

Acceptance:
- `pnpm --filter @corpus/api typecheck` passes.
- `pnpm --filter @corpus/api lint` passes.
- All 9 root gates still green (this is a docs-only change to `.env.example`; should be zero impact).

Docs:
- Open the PR against `develop`. Title: `fix(repo): drop misleading *** placeholder from .env.example (D62)`. Body: link to D62 (new), to D5 (collision note), to Session 210, and to the evidence file.

### Deliverable 4 — Bookkeeping updates (single PR or single batch of commits)

The user requested updates to 5 files: `CHANGELOG.md` (under `[Unreleased]`, after D59), `.agents/SESSION-LOG.md` (Session 210 entry), `docs/DEBT.md` (bump Highest ID → D62, add D62 row, update D57 status), `progress.md` (one-liner after Session 209), `.agents/summary.md` (edit "Last updated:" line 3 + Phase B paragraph at line 9).

**Two notes before doing this:**

(a) **D57 status update:** D57 in `docs/DEBT.md` is in the Open section with no "ROW CLOSED" marker. The vitest bootstrap + test file PRs (Deliverables 1 + 2) close PART of D57 — the test-runner half. The DTO-metadata gap (separate `start:dev` loader decision: zero-dep `tsc -w`+`node --watch dist` vs `@nestjs/cli --builder swc`, new-dep) remains open. So D57 should be updated to: "**Partially closed 2026-09-19** by `feat/apps-api-vitest-bootstrap` (test runner wiring) + `test/apps-api-env-schema` (3 test cases for `toDatabaseUrl` + `loadEnv`). DTO-metadata half remains open — see `start:dev` loader decision above." The D57 row already mentions a lint rule / boot-time invariant check option; that stays open too. **Do not move D57 to the Closed section** — it's partially closed.

(b) **D58/D59 cleanup drift** noted in D61's row: "D57/D58/D59 all carry 'ROW CLOSED' markers but still sit in the Open section." D58 and D59 are already closed; this is bookkeeping drift the user explicitly noted is a separate cleanup task. **Do NOT fix that drift in this PR** — it was explicitly out-of-scope per the D61 row, and it's a 3-row mechanical move. Leave it for a separate cleanup session.

Files:

- **`CHANGELOG.md`** — under `## [Unreleased]`, after the D59 entry, add three bullets:
  - `**PR (apps/api vitest bootstrap)**: bootstrap vitest in apps/api — test runner wiring only, no test files yet; closes the "no test caught D57" half of D57 by giving future sessions a place to land tests.`
  - `**PR (apps/api env-schema tests)**: add `env-schema.spec.ts` covering `toDatabaseUrl()` component form, `toDatabaseUrl()` URL form, and `loadEnv()` with only `DATABASE_URL`; the third case is the test that would have caught the masked-password bug at PR-open time.`
  - `**PR (.env.example placeholder fix, D62)**: drop the misleading `# DATABASE_URL=<postgres://corpus>:***@...` placeholder from `.env.example`; that line is what disguised the real bug for hours by making `***` look like legitimate redaction.`

- **`.agents/SESSION-LOG.md`** — append a `## Session 210` section at the END of the file (it's append-only, never insert mid-file). Lead = coding-be. Window = today (2026-09-19). Include:
  - Trigger: review of `docs/vps-api-setup.md` flagged the missing tests for `toDatabaseUrl()` / `loadEnv()`, the `.env.example` placeholder, and the masking-intent wiring (the latter deferred).
  - Outcome: 3 PRs opened against `develop` (vitest bootstrap, env-schema tests, .env.example placeholder fix); D62 opened (renamed from user-suggested D58 to honor append-only ID rule — D58 is already closed).
  - Invented decision (per AGENTS.md §"Invented decisions"): "split the vitest bootstrap from the test file into separate PRs per the user's instruction, even though a single PR is more atomic — explicit user override." Document this explicitly in the entry so it doesn't get second-guessed later.
  - Carry-forward (per user): D-2 cwd-coupled env path (deferred — documented in evidence file but not opened as a row this session); D-4 env-loader policy without ADR (deferred — same); masking-intent wiring (deferred — separate user decision).
  - Phase B carry-forward (per user): Cloudflare Tunnel, `app.set('trust proxy', 1)`, `SESSION_COOKIE_DOMAIN=.nxhhuy.tech`, `GOOGLE_CALLBACK_URL=https` exact match in Google Console, final password rotation, webhook auto-deploy, `pg_dump` → R2 nightly, PR #179/#180 awaiting decision, Phase C Dockerize.

- **`docs/DEBT.md`** —
  - Bump `**Highest ID issued: D61**` to `**Highest ID issued: D62**`.
  - Append the D62 row at the end of the Open section (rows are append-only; never insert in the middle). Row text:
    - `**Misleading `# DATABASE_URL=<postgres://corpus>:***@...` placeholder in `.env.example` disguised the masked-password bug for hours by making `***` look like legitimate redaction. Closed by \`fix/d62-env-example-placeholder\` (squash-pending) on Session 210: placeholder removed/rewritten in `.env.example` (one-line fix; the alternative fix shape is documented in the PR body). Future contributors reading `.env.example` alone no longer see `***` as a documented config value. ID note: user originally requested "D58 PR" but D58 in this file is already closed (provider event bus, closed 2026-09-18); append-only ID rule from \`00-session-protocol.mdc\` forbids reuse, so this is D62.`
  - Update D57's status in-place: add a `**Partially closed 2026-09-19** by \`feat/apps-api-vitest-bootstrap\` + \`test/apps-api-env-schema\` (Session 210). DTO-metadata half remains open (separate \`start:dev\` loader decision).` line near the top of the row, just under the title.

- **`progress.md`** — find the line that ends the Session 209 entry and add a one-liner: `Session 210 (2026-09-19): apps/api env-schema tests + vitest bootstrap + .env.example placeholder fix (D62). 3 PRs opened against develop; D62 opened; masking-intent wiring deferred.`

- **`.agents/summary.md`** — find the `Last updated:` line at line 3 and replace the date / session reference with the new Session 210 reference. The Phase B paragraph at line 9 should also be touched — find the existing Phase B reference (likely mentions D61 and PR #186 / `feat/phase-b-pm2-deploy`) and append a Session 210 line noting the test/placeholder follow-ups. Keep edits targeted (the file's header explicitly forbids wholesale rewrites).

Acceptance for Deliverable 4:
- All 5 files updated.
- `pnpm agents:build` (if any `.cursor/rules/*.mdc` was touched — none in this PR) and `pnpm agents:check` still green.
- All 9 root gates still green (bookkeeping changes shouldn't break anything; if they do, something's wrong with the row text or anchors).

---

## Order of operations

0. **Deliverable 0 first** — push the `${password}` substitution as a 3rd commit on `fix/database-url-masked-password`. This is **blocker #1 for merge** of that branch. Do NOT start D1/D2/D3/D4 until D0 lands on the branch tip and the smoke passes. If the user has already opened the PR for `fix/database-url-masked-password`, push the commit to that branch; the PR auto-updates.
1. Deliverable 1 (vitest bootstrap) PR — independent of D0's merge, can start as soon as D0 is committed locally. Prerequisite for D2.
2. Deliverable 2 (env-schema tests) PR — depends on D1 merged. The TS test file supersedes the D0 smoke (the smoke stays as a belt-and-braces zero-dep check; the TS file is the proper regression suite).
3. Deliverable 3 (.env.example fix, D62) PR — independent, can land in parallel with D0/D1/D2.
4. Deliverable 4 (bookkeeping) PR — only after D0+D1+D2+D3 have all merged (so the CHANGELOG / SESSION-LOG / DEBT.md rows accurately reflect the merged PR numbers AND the corrected D0 narrative).

If any PR's CI fails, do NOT bypass the protection rule. Stop and report.

---

## Review the two existing commits on `fix/database-url-masked-password`

The user explicitly asked: "Review 2 commits on branch `fix/database-url-masked-password` — both diffs are small (`env-schema.ts` and `docker-compose.yml` only)."

Lead's parent-thread review was **wrong on `9cdd712`** — the commit declared the `password` local but did NOT substitute it into the template. The corrected position is: `9cdd712` is "looks fixed, isn't fixed"; `a764e10` is clean. Deliverable 0 fixes `9cdd712` retroactively via a 3rd commit on the same branch.

When reviewing for Deliverable 0:
- Confirm `git show 9cdd712:apps/api/src/config/env-schema.ts` lines 188–196 match the regression description above (dead `password` local + literal `***` in template). If the file has changed since `9cdd712` (it shouldn't — the branch tip is `a764e10` which only touches `docker-compose.yml`), flag it and stop.
- Confirm the function `toMaskedDatabaseUrl()` still does the regex-rewrite that becomes a no-op when the input already has `***`. The Deliverable 0 fix makes the no-op correctness-correct (real password gets masked), so the regex becomes meaningful again.
- Confirm `a764e10` only touches `docker-compose.yml` (1 line: `"5432:5432"` → `"127.0.0.1:5432:5432"`). If anything else moved in `a764e10`, flag it.

---

## Skills / context to load before coding

- `corpus-web-context` — repo-wide conventions, debt-row append-only rule, session-protocol mechanics.
- `nestjs-module-scaffold` — file-order conventions for `apps/api/src/config/` so the test file lands in the conventional `__tests__/` sibling.
- `github-pr-workflow` — branch-before-merge check, `gh pr merge` vs close, backtick-body quoting.

---

## Final report back to Lead

When all 5 deliverables are open (or done — D0 lands as a 3rd commit on the existing branch, D1/D2/D3 land as PRs, D4 lands after they're merged), report back:
- Final SHA on `fix/database-url-masked-password` after D0 (3 commits total).
- PR numbers and URLs for D1, D2, D3.
- Final state of D4 (PR URL once merged, or "staged locally pending D0/D1/D2/D3 merge").
- Confirmation that `pnpm --filter @corpus/api test:smoke` passes 3/3.
- Any invented decisions made (per AGENTS.md §"Invented decisions") with rationale.
- Any deviations from this prompt with rationale.
- Anything that should escalate to Huy as a new decision.

If you hit a blocker, stop and report — do NOT bypass protections, do NOT invent output, do NOT auto-merge.
