import { z } from 'zod';
import { defaultEnvCandidates, loadDotEnv } from './dotenv.js';

/**
 * Schema for process.env values that the API needs at boot. Validated
 * synchronously in `loadEnv()` so a missing or malformed value throws at
 * process start, not at first query.
 *
 * Two Postgres connection shapes are supported:
 *   - Full URL: DATABASE_URL set directly. Wins if present.
 *   - Component form: POSTGRES_HOST / POSTGRES_PORT / POSTGRES_USER /
 *     POSTGRES_PASSWORD / POSTGRES_DB. The components are the source of
 *     truth shared with docker-compose.yml.
 *
 * Why not only one? The component form lets compose env interpolation work
 * straight, and a developer pointing at an external Postgres only edits one
 * line. The URL form is what production platforms (Fly, Heroku) hand you.
 * Either is fine; the union keeps both valid. Whichever branch parses first
 * is accepted.
 *
 * Google OAuth + session vars are appended to the env contract in this
 * session (D26 first slice — Google OAuth login). They are independent of
 * the database form and live on top of either branch.
 */

// --- Postgres -------------------------------------------------------------

const PostgresComponentSchema = z.object({
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
});

// Note: a URL-only Postgres form is intentionally NOT modeled as a
// separate zod object — it is detected by the presence of DATABASE_URL
// rather than by a structured schema. See `loadEnv()` below.

// --- Google OAuth ---------------------------------------------------------

/**
 * Google OAuth 2.0 credentials. The three values are required together; if
 * any one is missing we treat the API as auth-disabled at boot and refuse
 * to expose any auth route. This keeps local development honest — if you
 * start the API without a Google client, the `/auth/google` route does not
 * exist and the protected `GET /me` always returns 401.
 *
 * The `GOOGLE_CALLBACK_URL` must match what is configured on the Google
 * Cloud OAuth consent screen exactly. Local-dev convention is
 * `http://localhost:3001/auth/google/callback`.
 */
const GoogleOAuthSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),
});

// --- Session + CORS -------------------------------------------------------

/**
 * Session cookie config. Defaults match what the docs and the
 * `.cursor/rules/50-api-nestjs.mdc` "Auth" section call out:
 *
 *   - `SESSION_COOKIE_NAME` defaults to `corpus.sid` (a free, non-tracking
 *     name — `connect.sid` is Express's default and is widely fingerprint-
 *     recognised by browsers, so we don't reuse it).
 *   - `SESSION_COOKIE_SECURE` defaults to `true` — set to `false` ONLY for
 *     local-dev over plain HTTP. The cookie refuses to be set if Secure is
 *     true and the request is non-HTTPS, which would silently break login.
 *   - `SESSION_COOKIE_DOMAIN` is empty by default, which means the browser
 *     pins the cookie to the exact host that set it. In production set
 *     this to `.nxhhuy.tech` so apex + `api.` share the session; the
 *     `.cursor/rules/50-api-nestjs.mdc` rule references this.
 *   - `SESSION_TTL_SECONDS` defaults to 30 days, in seconds. Stored on the
 *     `sessions.expires_at` column; a sliding renewal refreshes on each
 *     authenticated request inside the AuthGuard.
 *
 * `WEB_ORIGIN` is the comma-separated CORS allowlist. Local dev is just
 * `http://localhost:3000`. Production would be `https://nxhhuy.tech`.
 */
const SessionCookieSchema = z.object({
  SESSION_COOKIE_NAME: z.string().min(1).default('corpus.sid'),
  SESSION_COOKIE_SECURE: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  SESSION_COOKIE_DOMAIN: z.string().default(''),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 30),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  /**
   * Dev fallback used by `apps/api/src/config/session.ts` when no
   * `SESSION_SECRET` is exported. Production deployments MUST set
   * this to a high-entropy random value. The fallback exists so
   * `pnpm start:dev` works without ceremony; the verify-recipe's
   * environment probe asserts `SESSION_SECRET` is set outside dev.
   */
  SESSION_SECRET: z.string().min(16).optional(),
});

// --- Composition ----------------------------------------------------------

const ComponentFormSchema = PostgresComponentSchema.merge(
  SessionCookieSchema,
).extend({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url().optional(),
}).and(GoogleOAuthSchema.partial());

const UrlOnlySchema = SessionCookieSchema.extend({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
}).and(GoogleOAuthSchema.partial());

/**
 * Auth-disabled shape: no Google creds present. The API still boots
 * (healthchecks still work; the auth module is not registered), but any
 * reference to `/auth/google` or `/me` would 404 — `AuthModule` is
 * conditionally wired in `app.module.ts` based on whether the Google
 * vars validated.
 */
const Schema = z.union([
  ComponentFormSchema,
  UrlOnlySchema,
]);

export type AppEnv = z.infer<typeof ComponentFormSchema> | z.infer<typeof UrlOnlySchema>;

/** Has a `.env` already been loaded for this process? */
let dotenvLoaded = false;

/**
 * Load `.env` candidates on first call, then parse and freeze env. Throws
 * on validation failure — Nest's `ConfigModule` runs this synchronously at
 * module init, and the CLI scripts run it before opening a socket, so a
 * bad env fails the process before any I/O.
 */
export async function loadEnv(source: NodeJS.ProcessEnv = process.env): Promise<AppEnv> {
  if (!dotenvLoaded) {
    await loadDotEnv(defaultEnvCandidates());
    dotenvLoaded = true;
  }
  const result = Schema.safeParse(source);
  if (!result.success) {
    const hasComponents =
      !!source['POSTGRES_HOST'] &&
      !!source['POSTGRES_PORT'] &&
      !!source['POSTGRES_USER'] &&
      !!source['POSTGRES_PASSWORD'] &&
      !!source['POSTGRES_DB'];
    const hasUrl = !!source['DATABASE_URL'];
    if (!hasComponents && !hasUrl) {
      throw new Error(
        `Invalid environment configuration: no database connection provided.\n` +
          `Provide one of:\n` +
          `  - POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB\n` +
          `    (docker-compose component form — preferred for local dev), or\n` +
          `  - DATABASE_URL (connection-string form — preferred for hosted\n` +
          `    platforms that hand you a URL).`,
      );
    }
    // Has one form but values are wrong.
    const missing: string[] = [];
    if (!source['POSTGRES_HOST']) missing.push('POSTGRES_HOST');
    if (!source['POSTGRES_PORT']) missing.push('POSTGRES_PORT');
    if (!source['POSTGRES_USER']) missing.push('POSTGRES_USER');
    if (!source['POSTGRES_PASSWORD']) missing.push('POSTGRES_PASSWORD');
    if (!source['POSTGRES_DB']) missing.push('POSTGRES_DB');
    if (!source['DATABASE_URL']) missing.push('DATABASE_URL');
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid environment configuration. Missing or wrong-type: ${missing.length ? missing.join(', ') : '(unspecified)'}.\n` +
        `${issues}`,
    );
  }
  return Object.freeze(result.data) as AppEnv;
}

/**
 * Resolve the canonical DATABASE_URL. The TypeORM DataSource and the Nest
 * TypeOrmModule both call into here, so the URL is one source of truth.
 */
export function toDatabaseUrl(env: AppEnv): string {
  if ((env as { DATABASE_URL?: string }).DATABASE_URL) {
    return (env as { DATABASE_URL: string }).DATABASE_URL;
  }
  const e = env as z.infer<typeof ComponentFormSchema>;
  const user = encodeURIComponent(e.POSTGRES_USER);
  // Mask the password in the URL string used for logs and the TypeORM
  // DataSource error path. We never want the cleartext password in a
  // log line, and we never want it as a fallback if the URL field is
  // missing — see the postgres `url` option in `data-source.ts` for
  // the real connection string the DataSource builds.
  const mask = encodeURIComponent('***');
  return `postgres://${user}:${mask}@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`;
}

/**
 * Whether the Google OAuth env block validated. Used by `app.module.ts`
 * to decide whether to register `AuthModule`. If false, the API boots in
 * "auth-disabled" mode: `/healthz/*` works, every other route returns
 * 404, and no Google client is contacted.
 */
export function isAuthEnabled(env: AppEnv): boolean {
  return Boolean(
    (env as { GOOGLE_CLIENT_ID?: string }).GOOGLE_CLIENT_ID &&
      (env as { GOOGLE_CLIENT_SECRET?: string }).GOOGLE_CLIENT_SECRET &&
      (env as { GOOGLE_CALLBACK_URL?: string }).GOOGLE_CALLBACK_URL,
  );
}

/**
 * The cookie domain is empty by default, which means the browser pins the
 * cookie to the exact host that set it. In production we'd pass `.nxhhuy.tech`
 * so apex + `api.` share the session. The env value passes through
 * unchanged so an empty string is honored (the relevant express-session
 * option treats empty as "do not set Domain").
 */
export function getSessionCookieDomain(env: AppEnv): string | undefined {
  const d = (env as { SESSION_COOKIE_DOMAIN?: string }).SESSION_COOKIE_DOMAIN;
  return d && d.length > 0 ? d : undefined;
}
