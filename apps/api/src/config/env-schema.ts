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
 */
const ComponentFormSchema = z.object({
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_DB: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url().optional(),
});

const UrlOnlySchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const Schema = z.union([ComponentFormSchema, UrlOnlySchema]);

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
  const password = encodeURIComponent(e.POSTGRES_PASSWORD);
  return `postgres://${user}:${password}@${e.POSTGRES_HOST}:${e.POSTGRES_PORT}/${e.POSTGRES_DB}`;
}
