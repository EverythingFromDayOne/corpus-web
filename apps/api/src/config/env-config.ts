import { loadEnv } from './env-schema.js';

/**
 * Validate and return env. Used by `AppModule` as a ConfigModule `validate`
 * hook so a missing value or malformed DATABASE_URL crashes boot, not the
 * first request. Async because `loadEnv` may need to read `.env` first
 * (ConfigModule awaits the validate hook automatically).
 */
export async function validateEnv(rawEnv: Record<string, unknown>) {
  return await loadEnv(rawEnv as NodeJS.ProcessEnv);
}
