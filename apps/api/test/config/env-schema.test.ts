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
 * - `loadEnv()` is pure: it parses the `source` argument (default
 *   `process.env`) and does NOT touch the file system or mutate
 *   `process.env`. Callers that want dotenv-populate-then-parse use
 *   `loadAppEnv()` instead, which is what `main.ts` and the runtime
 *   call sites do. Tests call `loadEnv()` directly because the
 *   regression guards we care about are about `loadEnv`'s parse
 *   contract, not about dotenv.
 * - We pre-populate `process.env` with only our test values before
 *   each case via `withEnv()`. After D67, `loadEnv` does not pull
 *   anything from disk, so the absence of a `.env` in CI is no longer
 *   load-bearing — but the `withEnv()` helper still strips the
 *   relevant prefixes to keep any future refactor that re-introduces
 *   a dotenv path inside `loadEnv` honest.
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
      // Belt-and-braces: catches the regression class that the
      // placeholder string leaked through the schema at commit
      // 9cdd712's predecessor. A literal-`***`-presence check
      // would be tautological for the equality case above (the
      // input is not `***`), but a `-presence` check is exactly
      // what we want to fail with a readable message if a future
      // refactor reintroduces the placeholder.
      assert.ok(!url.includes('***'), 'env-schema returned the *** placeholder instead of the real password');
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

// Case 5 — D67 contract guard. After the loadEnv/loadDotEnv split,
// `loadEnv` must be pure: it parses `process.env` only and never reads
// from disk. The original bug class (process.loadEnvFile silently
// populating a stripped DATABASE_URL from .env while component-form
// POSTGRES_PASSWORD is set in process.env) cannot recur if `loadEnv`
// never touches disk.
//
// Test shape:
//   1. process.env has component-form POSTGRES_* values set, with NO
//      DATABASE_URL.
//   2. A `.env`-shaped in-memory fixture sits on disk at a path we can
//      reach via process.loadEnvFile.
//   3. We monkey-patch process.loadEnvFile to record calls; if `loadEnv`
//      reads the file (a regression), we catch it via the call counter.
//   4. We assert: component-form wins (toDatabaseUrl returns the URL
//      derived from POSTGRES_*) AND loadEnvFile was called 0 times.
//
// The contract: callers that want dotenv-populate-then-parse use
// `loadAppEnv()`, not `loadEnv`. This test is the regression guard for
// `loadEnv`'s purity.
test('loadEnv is pure: component form wins and disk is never read (D67 contract guard)', async () => {
  const fakeDotenvPath = `/tmp/d67-purity-test-${process.pid}-${Date.now()}.env`;
  // The fake .env on disk carries a DATABASE_URL that would override
  // the component-form values IF loadEnv read the file (the pre-D67
  // bug class). It also carries a different POSTGRES_PASSWORD, which
  // loadEnvFile would NOT overwrite (it honors precedence on existing
  // keys), but it documents the file contents for any reader tracing
  // the test.
  const fakeDotenvContents = [
    '# synthetic .env — DO NOT load via loadEnv',
    'DATABASE_URL=postgres://corpus:file-only-password@db.example.com:5432/corpus_api',
    'POSTGRES_PASSWORD=file-only-password',
    '',
  ].join('\n');
  await import('node:fs/promises').then((fs) => fs.writeFile(fakeDotenvPath, fakeDotenvContents));

  // Monkey-patch process.loadEnvFile: if `loadEnv` reaches for the
  // disk, we record it. After D67, this MUST stay at 0.
  const originalLoadEnvFile = (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile;
  let loadEnvFileCalls = 0;
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile = (p?: string) => {
    loadEnvFileCalls += 1;
    // If something in `loadEnv` ever does start reading .env, surface
    // the path in the assertion failure so the regression is debuggable.
    throw new Error(`loadEnv must not read disk; process.loadEnvFile called with ${p}`);
  };

  try {
    await withEnv(
      {
        ...SESSION_DEFAULTS,
        POSTGRES_HOST: 'db.example.com',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'corpus',
        POSTGRES_PASSWORD: 'process-env-password',
        POSTGRES_DB: 'corpus_api',
        // Deliberately NO DATABASE_URL in process.env — the whole point.
      },
      async () => {
        const env = await loadEnv();
        const url = toDatabaseUrl(env);
        // Component form wins: the password in the URL must come from
        // process.env.POSTGRES_PASSWORD, not from the fake .env's
        // DATABASE_URL line. If `loadEnv` had read the file (the
        // pre-D67 bug), DATABASE_URL would have been populated from
        // .env and toDatabaseUrl would short-circuit via the URL form.
        const parsed = new URL(url);
        assert.strictEqual(decodeURIComponent(parsed.password), 'process-env-password');
        // Belt-and-braces: the URL must NOT contain the file's value.
        assert.ok(!url.includes('file-only-password'), 'env-schema returned the file-only-password from .env');
        // Purity assertion: loadEnv must not have touched disk.
        assert.strictEqual(loadEnvFileCalls, 0, `loadEnv called process.loadEnvFile ${loadEnvFileCalls} time(s); it must not read disk`);
      },
    );
  } finally {
    if (originalLoadEnvFile === undefined) {
      delete (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile;
    } else {
      (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile = originalLoadEnvFile;
    }
    await import('node:fs/promises').then((fs) => fs.unlink(fakeDotenvPath).catch(() => undefined));
  }
});
