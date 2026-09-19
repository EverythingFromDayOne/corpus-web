/**
 * First regression tests for `apps/api/src/config/env-schema.ts` — closes D57.
 *
 * Scope: the env-schema contract that protects against the literal-`***`
 * regression and the `UrlOnlySchema` zod-strip bug, both fixed by commit
 * `9cdd712` on `fix/database-url-masked-password` (merged as PR #187).
 *
 * Conventions:
 * - Runner: `node --test` (built into Node 24). No new devDeps.
 * - Path: sibling `test/` directory, NOT co-located. The active repo
 *   convention is `apps/web/test/`, `packages/mdx-components/test/`,
 *   `packages/content-schema/test/`. The `.cursor/rules/50-api-nestjs.mdc:63`
 *   "Co-located `*.spec.ts`" rule is stale (zero existing tests follow it)
 *   and is being updated separately.
 *
 * Test isolation:
 * - `loadEnv()` reads from `source` (defaults to `process.env`) and calls
 *   `loadDotEnv()` on first invocation, which mutates `process.env` with a
 *   `skip-existing` policy. We pre-populate `process.env` with only our
 *   test values before each case so dotenv can't override, then restore
 *   the original `process.env` after. The `dotenvLoaded` module-level flag
 *   is irrelevant when we pass an explicit `source` to `loadEnv()` for
 *   the URL-only case.
 * - We do NOT delete real `.env` files — the test process has no `.env`
 *   in CI and locally none is present on the dev box. If a future CI
 *   environment ever introduces a `.env`, the `withEnv()` helper will
 *   still override it for any key it sets (`skip-existing` semantics).
 *
 * DO NOT (per Huy's dispatch brief):
 * - Touch `env-schema.ts` logic.
 * - Wire `toMaskedDatabaseUrl()` to a call site.
 * - Add vitest, jest, or any test devDep.
 * - Add `toMaskedDatabaseUrl` tests.
 * - Add a `start:dev` CI gate.
 * - Include VPS runtime claims in PR body.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadEnv, toDatabaseUrl } from '../../src/config/env-schema.js';

/**
 * Run `fn` with `process.env` containing exactly the keys in `values`
 * (plus whatever the host environment has that does NOT start with the
 * relevant prefixes — we strip the relevant prefixes to keep dotenv from
 * overriding our synthetic values via its `skip-existing` policy).
 *
 * Restores `process.env` to its prior shape afterwards, even if `fn`
 * throws. Returns whatever `fn` returns so `await` chains compose.
 */
async function withEnv<T>(
  values: Record<string, string>,
  fn: () => Promise<T> | T,
): Promise<T> {
  const STRIPPED_PREFIXES = [
    'POSTGRES_',
    'DATABASE_URL',
    'SESSION_',
    'GOOGLE_',
    'WEB_ORIGIN',
    'PORT',
    'NODE_ENV',
    'LOG_LEVEL',
  ];
  const saved = { ...process.env };
  for (const k of Object.keys(process.env)) {
    if (STRIPPED_PREFIXES.some((p) => k === p || k.startsWith(p))) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, values);
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(process.env)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

const SESSION_DEFAULTS = {
  SESSION_COOKIE_NAME: 'corpus.sid',
  SESSION_COOKIE_SECURE: 'false',
  SESSION_COOKIE_DOMAIN: '',
  SESSION_TTL_SECONDS: '2592000',
  WEB_ORIGIN: 'http://localhost:3000',
};

// Case 1 — component form returns the real password, not the literal `***`
// regression from before commit `9cdd712`.
test('toDatabaseUrl component form returns real password (regression guard for 9cdd712)', async () => {
  await withEnv(
    {
      ...SESSION_DEFAULTS,
      POSTGRES_HOST: 'db.example.com',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'corpus',
      POSTGRES_PASSWORD: 's3cret-actual-value',
      POSTGRES_DB: 'corpus_api',
    },
    async () => {
      const env = await loadEnv();
      const url = toDatabaseUrl(env);
      const parsed = new URL(url);
      // Strict equality with the input — NOT a literal-`***` absence
      // check, which would pass for any non-`***` string and miss the
      // dead-bug class entirely (e.g. a typo'd `${pswd}` returning the
      // literal value "undefined" would also pass `!url.includes('***')`).
      assert.strictEqual(decodeURIComponent(parsed.password), 's3cret-actual-value');
    },
  );
});

// Case 2 — DATABASE_URL set is returned verbatim, unmodified. Guards
// against accidental component-form fallback when URL is the source of
// truth.
test('toDatabaseUrl URL form returns env DATABASE_URL verbatim', async () => {
  const urlInput = 'postgres://corpus:s3cret@db.example.com:5432/corpus_api';
  await withEnv(
    {
      ...SESSION_DEFAULTS,
      DATABASE_URL: urlInput,
    },
    async () => {
      const env = await loadEnv();
      const url = toDatabaseUrl(env);
      assert.strictEqual(url, urlInput);
    },
  );
});

// Case 3 — UrlOnlySchema fix from `9cdd712`. Previously zod's strip mode
// silently dropped `DATABASE_URL` because `UrlOnlySchema` did not declare
// it, so the API booted with an all-undefined URL on URL-form configs.
// This case asserts that `DATABASE_URL` survives the schema parse.
test('loadEnv with only DATABASE_URL preserves DATABASE_URL (UrlOnlySchema fix from 9cdd712)', async () => {
  await withEnv(
    {
      ...SESSION_DEFAULTS,
      DATABASE_URL: 'postgres://corpus:s3cret@db.example.com:5432/corpus_api',
    },
    async () => {
      const env = await loadEnv();
      assert.strictEqual(
        (env as { DATABASE_URL?: string }).DATABASE_URL,
        'postgres://corpus:s3cret@db.example.com:5432/corpus_api',
      );
    },
  );
});

// Case 4 — URL-special characters in the password round-trip correctly
// through `encodeURIComponent`. This is the scenario most likely to break
// next: a future change to the URL-builder that drops the
// `encodeURIComponent` wrap on `e.POSTGRES_PASSWORD` would silently break
// for any password containing `:` / `/` / `@` / `?` / `#` / `+` / `=` /
// `!` / `%` / `&`. We assert both the round-trip AND that the returned
// URL string is parseable as a `URL` with no decoding error.
test('toDatabaseUrl component form encodes URL-special characters in password (encodeURIComponent round-trip)', async () => {
  const trickyPassword = "p@ss:wo?rd#1/a+b=c!d%e&f";
  await withEnv(
    {
      ...SESSION_DEFAULTS,
      POSTGRES_HOST: 'db.example.com',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'corpus',
      POSTGRES_PASSWORD: trickyPassword,
      POSTGRES_DB: 'corpus_api',
    },
    async () => {
      const env = await loadEnv();
      const url = toDatabaseUrl(env);
      // Must round-trip through encodeURIComponent -> URL parser.
      const parsed = new URL(url);
      assert.strictEqual(decodeURIComponent(parsed.password), trickyPassword);
    },
  );
});
