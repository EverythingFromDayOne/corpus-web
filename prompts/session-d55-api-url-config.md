# Session prompt — D55: centralize NEXT_PUBLIC_API_URL per ADR-0004

## Context

Huy decided (sessions 197/199; see `docs/adr/0004-api-url-per-env-var.md`) to configure
`NEXT_PUBLIC_API_URL` **per Vercel environment** (Production / Preview / Development),
not via a Next.js rewrites proxy. Reasoning is fully written up in the ADR — read it first.

This work is tracked as **D55** in `docs/DEBT.md`. It lands on the SAME branch as
PR #183 (`docs/adr-0004-api-url-d55`), which currently carries only the ADR + D55 debt
row + doc updates. Do not open a new branch or PR — commit directly onto this branch;
the existing PR #183 will pick up your commits automatically.

## Scope (exactly this, nothing more)

1. Create `apps/web/lib/config.ts` exporting a single typed helper, e.g.:
   ```ts
   export const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? '';
   ```
   (Match existing code style in `apps/web/lib/*.ts` — check `site.ts` or `routes.ts`
   for the project's conventions on typing/exports before you add this.)

2. Update `apps/web/components/chrome/sign-in-button.tsx` to import `apiUrl` from
   `@/lib/config` instead of reading `process.env['NEXT_PUBLIC_API_URL']` directly.
   This is currently the ONLY file in `apps/web` reading that env var directly
   (confirmed via `grep -rln "NEXT_PUBLIC_API_URL" apps/web --include="*.ts" --include="*.tsx"`
   — only `sign-in-button.tsx` matched, so this audit step is small).

3. Audit for hardcoded `https://api.nxhhuy.tech` (or similar hardcoded backend host)
   strings anywhere in `apps/web` and `packages/api-client` source (not `.next/`
   build output, not `node_modules`). Replace any found with the `apiUrl` import.
   Confirmed at dispatch time: none found in source — if your audit still finds none,
   say so explicitly in your report rather than silently skipping this step.

4. Do NOT touch Vercel dashboard env-var config yourself — that's an infra action
   outside repo scope. Just leave a one-line note in your PR/report confirming Huy
   (or whoever has Vercel access) still needs to set `NEXT_PUBLIC_API_URL` per
   Production/Preview/Development scope in the Vercel dashboard.

## Out of scope — do not touch

- `packages/api-client` internals beyond the hardcoded-URL audit (no refactor).
- Any other env var.
- `apps/api` (backend) — this is a frontend-only doc/config task.
- Do not open a new PR. Do not touch `docs/DEBT.md`, `docs/adr/`, `CHANGELOG.md`,
  `.agents/SESSION-LOG.md`, `.agents/summary.md`, `progress.md` beyond what your
  own commit's doc-flip requires per the `corpus-commit` skill gate (SESSION-LOG +
  CHANGELOG + progress.md entries for YOUR commit only — do not re-edit the
  ADR-0004 / D55 entries already on this branch).

## Gates (per `corpus-commit` skill)

- `pnpm lint && pnpm typecheck && pnpm build` must pass.
- `pnpm agents:check` must be clean.
- Follow the AGENTS.md first-action protocol before starting.

## Branch / PR

- Branch: `docs/adr-0004-api-url-d55` (checkout, do not create new)
- This IS PR #183 — your commit lands on top of the existing ADR-0004 + D55 commit.
- Do not force-push over existing history; `git pull --rebase` if needed to catch
  any drift, otherwise just commit on top.

## Report back

Report completion to Echo (`<@U0C1KJL9PC1>`, Hermes-Assistant) in `#corpus-web-v2`,
per the reporting protocol recorded in `corpus-web-context/references/reporting-protocol.md`.
Include: files touched, diff summary, gate results (lint/typecheck/build/agents:check),
and the Vercel-dashboard-config reminder note.
