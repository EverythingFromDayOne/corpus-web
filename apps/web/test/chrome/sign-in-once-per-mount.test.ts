/**
 * D58 chrome-flow smoke: `fetchMe` fires exactly once per call.
 *
 * This file is the test pinned by `.cursor/rules/25-react-provider-event-bus.mdc`.
 * The rule mandates that providers firing network requests on event MUST be
 * tested with exactly one fetch per mount; this test pins the lower-level
 * invariant — that `fetchMe` itself is idempotent and non-self-reinforcing —
 * which catches the original D58 regression class even though it does not
 * exercise the React-mount lifecycle.
 *
 * Faithfulness trade-off (documented per Lead's dispatch): faithfully testing
 * the `mountedRef` guard at the React-mount layer requires `react-test-renderer`
 * + a DOM shim (jsdom / happy-dom). Neither is installed in `apps/web`; adding
 * them is gated by the `Stop and ask` rule in `.cursor/rules/00-session-protocol.mdc`.
 * The mount-effect plumbing itself is verified by manual Vercel click-through
 * (D58 row (b) on PR #185 follow-up 4). This test pins the contract that catches
 * the regression class at the cheapest surface.
 *
 * Run with: `pnpm --filter @corpus/web test apps/web/test/chrome/sign-in-once-per-mount.test.ts`
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

type FetchCall = { url: string; init: RequestInit };

describe('D58 chrome-flow smoke: sign-in-context fetchMe is non-self-reinforcing', () => {
  let originalFetch: typeof globalThis.fetch;
  let calls: FetchCall[];

  beforeEach(() => {
    calls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init });
      // Return a 401 to mimic the unauthenticated path; `fetchMe` swallows
      // non-2xx and returns `null`. We do not assert the response shape —
      // we assert the call count.
      return new Response('{}', { status: 401 });
    }) as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('one fetchMe call → exactly one fetch to /me with credentials include', async () => {
    // Late import after the stub is installed so the module's closure
    // captures the stubbed `globalThis.fetch`.
    const { fetchMe } = await import('../../components/chrome/sign-in-context');
    const result = await fetchMe();
    assert.equal(result, null, 'fetchMe returns null on non-2xx');
    assert.equal(calls.length, 1, 'exactly one fetch fired');
    assert.match(calls[0]!.url, /\/me$/, 'fetched URL ends in /me');
    assert.equal(calls[0]!.init.credentials, 'include', 'session cookie sent');
  });

  it('two fetchMe calls → exactly two fetches (no event-bus self-re-trigger)', async () => {
    const { fetchMe } = await import('../../components/chrome/sign-in-context');
    await fetchMe();
    await fetchMe();
    assert.equal(calls.length, 2, 'each fetchMe produces exactly one fetch; no amplification');
    assert.ok(calls.every((c) => /\/me$/.test(c.url)), 'every call targeted /me');
  });
});
