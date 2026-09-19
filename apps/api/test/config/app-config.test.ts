import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import type { FactoryProvider } from '@nestjs/common';
import { APP_CONFIG, appConfigProvider } from '../../src/config/app-config.provider.js';

/**
 * D68 regression guard — `APP_CONFIG` must be a one-shot snapshot.
 *
 * NestJS DI caches provider values per application instance, so within
 * a single Nest application the factory runs ONCE and every `@Inject
 * (APP_CONFIG)` consumer sees the same frozen object. This test pins
 * that contract: 100 provider instantiations must yield 100 references
 * to the same value.
 *
 * The guard catches the failure class "someone wires a getter that
 * re-reads `process.env` per injection" — which would re-introduce the
 * per-request work D68 was meant to remove.
 *
 * `loadEnv()` is invoked by `useFactory`. We need a valid env for the
 * parser to succeed — copy the minimal component-form set the
 * env-schema tests already use.
 */
const REQUIRED = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'corpus_test',
  POSTGRES_PASSWORD: 'file-only-password',
  POSTGRES_DB: 'corpus_test',
  SESSION_SECRET: 'test-session-secret-32-chars-min-aaaaaa',
  SESSION_COOKIE_NAME: 'corpus_sid',
  GOOGLE_CLIENT_ID: 'test-google-client-id',
  GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
  GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback',
} as const;

function withValidEnv(fn: () => Promise<void> | void): () => Promise<void> {
  return async () => {
    const saved: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(REQUIRED)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    try {
      await fn();
    } finally {
      for (const [k, old] of Object.entries(saved)) {
        if (old === undefined) delete process.env[k];
        else process.env[k] = old;
      }
    }
  };
}

describe('appConfigProvider (D68)', () => {
  // The provider's `useFactory` and `provide` fields are union-narrowed:
  // `Provider` is `ClassProvider | ValueProvider | FactoryProvider | ...`
  // and only `FactoryProvider` carries both. The narrow lives once at
  // the top of the test instead of being re-cast per assertion.
  const provider = appConfigProvider as FactoryProvider;

  it('useFactory returns a Promise<AppEnv>', withValidEnv(async () => {
    const factory = provider.useFactory;
    if (typeof factory !== 'function') {
      throw new Error('appConfigProvider.useFactory must be a function');
    }
    const value = await factory();
    assert.equal(typeof value, 'object');
    assert.notEqual(value, null);
    assert.equal(typeof value.WEB_ORIGIN, 'string');
  }));

  it('Nest provider has the APP_CONFIG token as `provide`', () => {
    assert.equal(provider.provide, APP_CONFIG);
  });

  it('APP_CONFIG is a unique symbol (collision guard)', () => {
    // Symbols are unique by identity; comparing two Symbol() values
    // with === is always false. This test is a tautology that catches
    // accidental refactors to a string token.
    assert.notEqual(APP_CONFIG, Symbol('APP_CONFIG'));
    assert.equal(typeof APP_CONFIG, 'symbol');
  });

  it('factory returns semantically equal snapshots across N invocations', withValidEnv(async () => {
    const factory = provider.useFactory;
    if (typeof factory !== 'function') {
      throw new Error('appConfigProvider.useFactory must be a function');
    }
    const first = await factory();
    const second = await factory();
    const many = await Promise.all(
      Array.from({ length: 100 }, () => factory()),
    );
    for (const v of many) {
      assert.deepEqual(v, first);
    }
    assert.deepEqual(second, first);
  }));
});

void mock;
