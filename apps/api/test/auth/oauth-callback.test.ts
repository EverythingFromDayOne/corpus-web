import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response } from 'express';
import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { loadEnv } from '../../src/config/env-schema.js';

/**
 * PR #198 regression — passport sequencing.
 *
 * Passport 0.7.0 calls `req.session.regenerate()` unconditionally inside
 * `req.login()` (see `node_modules/passport/lib/sessionmanager.js:28`).
 * The regenerate destroys the keys on `req.session` BEFORE the rest of
 * the callback runs. Our `googleCallback` handler reads
 * `req.session.returnTo` to pick the post-login origin; if a future
 * refactor moves `req.login()` above that read, the read sees
 * `undefined` and `resolveReturnOrigin` falls back to the first
 * allowlist entry (`https://nxhhuy.tech`). A develop login would then
 * silently land on production.
 *
 * The fix-in-hand: line 126 reads `req.session.returnTo`, line 132
 * resolves `origin` into a local closure, then line 154-159 calls
 * `req.login()`. After regenerate, the local `origin` is unaffected;
 * the redirect on line 175 uses the local string. Safe as written.
 *
 * This test fails loud if a future edit moves `req.login()` to the top
 * of the handler. The fakeReq simulates Passport's regenerate by
 * deleting `fakeReq.session.returnTo` synchronously inside `login()`,
 * then calling the callback. If the handler reads `session.returnTo`
 * after `login()`, the candidate becomes the Referer (or nothing), and
 * the redirect falls back to `https://nxhhuy.tech/auth/google/callback`,
 * which fails the `startsWith('https://develop.nxhhuy.tech/')` check.
 *
 * No supertest (D63). No new devDeps. `node:test` + `assert/strict` +
 * a direct `new AuthController(env)` instance — the controller is a
 * pure function of `(req, res, appConfig)` for this path.
 */

const ALLOWLIST = 'https://nxhhuy.tech,https://develop.nxhhuy.tech';

async function makeConfig(): Promise<Awaited<ReturnType<typeof loadEnv>>> {
  return loadEnv({
    POSTGRES_HOST: 'localhost',
    POSTGRES_PORT: '5432',
    POSTGRES_USER: 'corpus',
    POSTGRES_PASSWORD: 'pw',
    POSTGRES_DB: 'corpus_api',
    SESSION_COOKIE_NAME: 'corpus.sid',
    SESSION_COOKIE_SECURE: 'true',
    SESSION_COOKIE_DOMAIN: '.nxhhuy.tech',
    SESSION_TTL_SECONDS: '2592000',
    WEB_ORIGIN: ALLOWLIST,
  });
}

describe('oauth callback handler — passport sequencing (PR #198 regression)', () => {
  it('captures session.returnTo into a local origin BEFORE req.login() fires', async () => {
    const appConfig = await makeConfig();
    const controller = new AuthController(appConfig);

    const captured = { status: 0, target: '' };
    const sessionReturnTo = 'https://develop.nxhhuy.tech';
    // `returnTo` is typed optional because the regression we test for
    // is precisely that this property may be deleted before line 126 reads it.
    const sessionRef: { returnTo?: string } = { returnTo: sessionReturnTo };

    const fakeReq = {
      user: { id: 'fake-uuid' },
      session: sessionRef,
      headers: {
        // Deliberately different from session.returnTo: ensures the
        // assertion passes only because session.returnTo was honoured,
        // not because the Referer fallback happened to match.
        referer: 'https://nxhhuy.tech/elsewhere',
      },
      query: {},
      login: (_u: unknown, cb: (err: Error | null) => void): void => {
        // Simulate Passport 0.7.0 `SessionManager.prototype.logIn`:
        //   req.session.regenerate(...) at sessionmanager.js:28
        //   destroys the keys on req.session. By the time the
        //   callback fires, `req.session.returnTo` is gone.
        delete sessionRef.returnTo;
        cb(null);
      },
    } as unknown as Request;

    const fakeRes = {
      redirect: (status: number, target: string): void => {
        captured.status = status;
        captured.target = target;
      },
    } as unknown as Response;

    await controller.googleCallback(fakeReq, fakeRes);

    // The handler resolved `origin` from session.returnTo (line 132),
    // then ran req.login() (line 154-159) which destroyed session.returnTo,
    // then redirected (line 175) using the local `origin` closure. If a
    // future refactor moves `req.login()` above the origin read, the
    // read sees undefined and `origin` falls back to the first
    // allowlist entry — `https://nxhhuy.tech/auth/google/callback` —
    // and this assertion fails.
    assert.equal(captured.status, 302, 'success callback must redirect 302');
    assert.ok(
      captured.target.startsWith('https://develop.nxhhuy.tech/auth/google/callback'),
      `expected redirect to develop origin (from session.returnTo), got: ${captured.target}`,
    );
    assert.ok(
      !captured.target.startsWith('https://nxhhuy.tech/auth/google/callback'),
      'redirect must NOT fall back to the production allowlist first entry',
    );
  });

  it('falls back to the first allowlist entry when session.returnTo is missing and Referer is missing', async () => {
    // Sibling test: the regression test above proves the handler reads
    // session.returnTo before req.login(). This one proves the fallback
    // path is exercised correctly when the input is empty — guard
    // against a future refactor that hard-codes the develop origin.
    const appConfig = await makeConfig();
    const controller = new AuthController(appConfig);

    const captured = { status: 0, target: '' };

    const fakeReq = {
      user: { id: 'fake-uuid' },
      session: {}, // no returnTo
      headers: {}, // no referer
      query: {},
      login: (_u: unknown, cb: (err: Error | null) => void): void => {
        cb(null);
      },
    } as unknown as Request;

    const fakeRes = {
      redirect: (status: number, target: string): void => {
        captured.status = status;
        captured.target = target;
      },
    } as unknown as Response;

    await controller.googleCallback(fakeReq, fakeRes);

    assert.equal(captured.status, 302);
    assert.ok(
      captured.target.startsWith('https://nxhhuy.tech/auth/google/callback'),
      `expected fallback to first allowlist entry, got: ${captured.target}`,
    );
  });
});
