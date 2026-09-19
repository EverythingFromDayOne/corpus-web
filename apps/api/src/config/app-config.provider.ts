import type { Provider } from '@nestjs/common';
import { loadEnv, type AppEnv } from './env-schema.js';

/**
 * `APP_CONFIG` — DI symbol for the validated, frozen env snapshot.
 *
 * The factory calls `loadEnv()` directly (which is pure after D67 — no
 * disk reads, no `process.env` mutation). NestJS DI evaluates `useFactory`
 * once per provider resolution, but a `useValue` would lock the value at
 * module-registration time. We want boot-time freshness (in case tests
 * mutate `process.env` before `loadEnv` is called for the first time),
 * so `useFactory: () => loadEnv()` is the right shape — Nest caches the
 * result of the factory across re-injections within a single application
 * instance, so consumers see one stable snapshot for the life of the
 * process.
 *
 * Why not `@Inject(ConfigService)` (the Nest-native ConfigModule)?
 *   - `ConfigService` is a generic getter; we want one frozen snapshot,
 *     not a getter that re-reads on every call.
 *   - `loadEnv()` has already done zod validation by the time the
 *     factory runs (Nest evaluates providers after `ConfigModule.validate`),
 *     so consumers don't need to re-validate.
 *   - The whole point of D68 is to remove the per-request `loadEnv()`
 *     cost from `auth.controller.ts`. Adding a getter that re-reads
 *     would re-introduce the same per-request work under a different
 *     name.
 *
 * Consumers:
 *   - `auth.controller.ts` (D68): injected in the constructor, replaces
 *     the two `loadAppEnv()` calls at the previous lines 86, 148.
 *
 * Test shape: `useFactory` is called exactly once across N controller
 * instantiations (regression guard against per-request resolution creep
 * — see `apps/api/test/config/app-config.test.ts`).
 */
export const APP_CONFIG = Symbol('APP_CONFIG');

export const appConfigProvider: Provider = {
  provide: APP_CONFIG,
  useFactory: async (): Promise<AppEnv> => await loadEnv(),
};
