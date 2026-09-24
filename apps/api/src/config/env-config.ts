import { loadEnv } from './env-schema.js';

/**
 * Validate and return env. Used by `AppModule` as a ConfigModule `validate`
 * hook so a missing value or malformed DATABASE_URL crashes boot, not the
 * first request. `loadEnv` is pure (does not mutate `process.env` or read
 * from disk), so this hook only parses the env Nest's ConfigModule has
 * already populated via its own `envFilePath` loader. Async shape kept
 * for forward compatibility.
 */
export async function validateEnv(rawEnv: Record<string, unknown>) {
  return await loadEnv(rawEnv as NodeJS.ProcessEnv);
}
