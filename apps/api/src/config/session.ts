import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pkg from 'pg';
import type { CookieOptions, RequestHandler } from 'express';
import { loadAppEnv, type AppEnv } from './env-schema.js';

const { Pool } = pkg;

/**
 * Build the cookie options for `express-session` SET and for
 * `Response.clearCookie`. ONE source of truth — both call sites pass
 * this object back in, so the cookie NAME + DOMAIN + PATH + SECURE
 * attributes can never drift between setting and clearing.
 *
 * Why a function: the options depend on `AppEnv` (typed), and the
 * caller passes its frozen snapshot. Pure: same input → same output.
 * No I/O.
 *
 * Why `httpOnly: true`, `sameSite: 'lax'`, etc.: see the class-level
 * docstring below; the canonical list lives there. This function only
 * decides WHICH path / domain / ttl / secure flag to bake in based on
 * the env.
 */
export function buildSessionCookieOptions(env: AppEnv): CookieOptions {
  const cookieDomain = env.SESSION_COOKIE_DOMAIN;
  const cookieDomainOrUndef =
    cookieDomain && cookieDomain.length > 0 ? cookieDomain : undefined;
  // We build a base object that satisfies BOTH the express-session
  // cookie shape (used by the middleware to Set-Cookie on login) and
  // the express-serve-static-core shape (used by Response.clearCookie
  // on logout). The two libraries have slightly different
  // declarations: express-session allows `expires: Date | null`,
  // express does not. We never set `expires` (the browser tracks it
  // via `maxAge`), so omitting it keeps both signatures satisfied.
  return {
    httpOnly: true,
    secure: env.SESSION_COOKIE_SECURE,
    sameSite: 'lax',
    domain: cookieDomainOrUndef,
    maxAge: env.SESSION_TTL_SECONDS * 1000,
    path: '/',
  };
}

/**
 * Build the `express-session` middleware configured for our Postgres
 * session store.
 *
 * `connect-pg-simple` is a CJS module. Our app is ESM. The default
 * import gets the CJS function export, which is the constructor.
 *
 * The store uses a NEW pg `Pool` so it is independent of TypeORM's
 * DataSource pool. This is deliberate — the session table is a
 * write-heavy, short-row hot path, and the TypeORM pool is tuned
 * for the module work it does. Sharing a pool would mean a session
 * request can starve an entity query. Two pools, two budgets.
 *
 * Cookie attributes:
 *   - `httpOnly: true` — JS in the browser cannot read the cookie.
 *     This is the single biggest mitigation against session theft
 *     via XSS.
 *   - `secure: env.SESSION_COOKIE_SECURE` — defaults to true; the
 *     dev `.env.example` flips it to false for local HTTP.
 *   - `sameSite: 'lax'` — required by the prompt and by the
 *     `.cursor/rules/50-api-nestjs.mdc` Auth section. Top-level
 *     navigations (e.g., user clicks "Sign in") carry the cookie;
 *     cross-site POSTs do not.
 *   - `domain: env.SESSION_COOKIE_DOMAIN` — empty by default, which
 *     means the browser pins the cookie to the exact host that set
 *     it. Production would set `.nxhhuy.tech` so apex + `api.`
 *     share the session.
 *   - `maxAge: SESSION_TTL_SECONDS * 1000` — sliding renewal handled
 *     by express-session: every authenticated request resets the
 *     expiry.
 *
 * `resave: false`, `saveUninitialized: false` — we don't write a
 * session row until `req.session.touch` is called (which Passport
 * does on successful login). An anonymous browser visiting
 * `/auth/google` does NOT create a session row until the OAuth dance
 * completes.
 */
export async function buildSessionMiddleware(): Promise<RequestHandler> {
  // Read directly from process.env so we don't depend on the AppEnv
  // union's narrowing. The env schema has already validated these by
  // the time this is called; the worst case is the URL-only branch
  // doesn't have POSTGRES_HOST — we read each one via nullish
  // coalescing to the URL form if needed.
  const env = await loadAppEnv();
  const dbUrl = process.env['DATABASE_URL'];

  let pgConfig: { host: string; port: number; user: string; password: string; database: string };
  if (dbUrl) {
    const u = new URL(dbUrl);
    pgConfig = {
      host: u.hostname,
      port: Number(u.port || 5432),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ''),
    };
  } else {
    pgConfig = {
      host: process.env['POSTGRES_HOST'] ?? 'localhost',
      port: Number(process.env['POSTGRES_PORT'] ?? 5432),
      user: process.env['POSTGRES_USER'] ?? 'corpus',
      password: process.env['POSTGRES_PASSWORD'] ?? '',
      database: process.env['POSTGRES_DB'] ?? 'corpus_api',
    };
  }

  const PgStore = connectPgSimple(session);
  const pool = new Pool(pgConfig);

  const cookieName = env.SESSION_COOKIE_NAME;
  const cookieOptions = buildSessionCookieOptions(env);

  return session({
    name: cookieName,
    // Dev secret. Production must override SESSION_SECRET — see
    // the TODO at the bottom of this file. We use a deterministic
    // dev fallback so `pnpm start:dev` works without setting it.
    secret: process.env['SESSION_SECRET'] ?? `dev-secret-${pgConfig.database}-${cookieName}`,
    resave: false,
    saveUninitialized: false,
    cookie: cookieOptions,
    store: new PgStore({
      pool,
      tableName: 'corpus_session',
      // Schema is owned by the migration directory (D70). The
      // `1700000002000-CreateCorpusSession.ts` migration creates
      // `corpus_session` with the canonical DDL matching the live
      // VPS schema (measured via `pg_dump --schema-only
      // --table=corpus_session`). The migration is applied
      // manually via `pnpm --filter @corpus/api migration:run`
      // from the operator's terminal post-deploy — see D71 for why
      // boot-time migration (`MigrationOnBootstrap`) was rejected.
      // The runtime no longer mutates the schema.
      createTableIfMissing: false,
      schemaName: 'public',
    }),
  });
}
