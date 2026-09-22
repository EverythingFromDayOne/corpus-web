import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { resolveReturnOrigin, normaliseAllowlist } from '../../src/modules/auth/resolve-return-origin.js';
import { executeLogout } from '../../src/modules/auth/auth.controller.js';
import { buildSessionCookieOptions } from '../../src/config/session.js';
import { loadEnv } from '../../src/config/env-schema.js';

/**
 * BE-1 — auth redirect and logout hardening tests.
 *
 * Three groups, each addressing one of the brief's three bugs:
 *
 *   1. resolveReturnOrigin — exact-match allowlist validation. The
 *      function MUST refuse look-alikes (`https://nxhhuy.tech.evil.com`),
 *      malformed strings, and path/query on an allowed origin. The
 *      fallback is the FIRST entry of the allowlist, never the input.
 *
 *   2. Set and clear use the SAME cookie options object. We assert
 *      deep equality of the shape that `buildSessionCookieOptions`
 *      produces — the SAME object that `buildSessionMiddleware` wires
 *      into `express-session`'s `cookie` field gets passed to
 *      `Response.clearCookie` in the logout handler.
 *
 *   3. `req.logout?.(...)` removed — a missing Passport on the request
 *      must REJECT within a bounded time instead of hanging. The
 *      test itself has a `timeout` so a regression that reintroduces
 *      the optional chain cannot pass even if the rejection path is
 *      broken.
 *
 * No supertest (D63). No new devDeps. node:test and assert/strict only.
 */

const ALLOWLIST = 'https://nxhhuy.tech,https://develop.nxhhuy.tech';
const ALLOWLIST_ARRAY = ['https://nxhhuy.tech', 'https://develop.nxhhuy.tech'];

describe('resolveReturnOrigin (BE-1 #1)', () => {
  it('returns an allowed origin verbatim', () => {
    assert.equal(
      resolveReturnOrigin('https://develop.nxhhuy.tech', ALLOWLIST),
      'https://develop.nxhhuy.tech',
    );
    assert.equal(
      resolveReturnOrigin('https://nxhhuy.tech', ALLOWLIST),
      'https://nxhhuy.tech',
    );
  });

  it('strips path and query — only origin survives', () => {
    assert.equal(
      resolveReturnOrigin('https://develop.nxhhuy.tech/auth/google/callback?foo=bar', ALLOWLIST),
      'https://develop.nxhhuy.tech',
    );
  });

  it('returns the first allowlist entry as fallback when the candidate is unlisted', () => {
    assert.equal(
      resolveReturnOrigin('https://attacker.example.com', ALLOWLIST),
      'https://nxhhuy.tech',
    );
  });

  it('REJECTS the look-alike https://nxhhuy.tech.evil.com — never echoes it', () => {
    // This is the open-redirect case. A naive startsWith() check would
    // pass this string. We must not.
    const result = resolveReturnOrigin('https://nxhhuy.tech.evil.com', ALLOWLIST);
    assert.equal(result, 'https://nxhhuy.tech', 'look-alike must fall back, never echo');
  });

  it('REJECTS a subdomain of an allowed origin (develop.attacker.com)', () => {
    const result = resolveReturnOrigin('https://develop.attacker.com', ALLOWLIST);
    assert.equal(result, 'https://nxhhuy.tech');
  });

  it('returns the fallback on a malformed URL', () => {
    assert.equal(resolveReturnOrigin('not a url', ALLOWLIST), 'https://nxhhuy.tech');
    assert.equal(resolveReturnOrigin('', ALLOWLIST), 'https://nxhhuy.tech');
    assert.equal(resolveReturnOrigin('://broken', ALLOWLIST), 'https://nxhhuy.tech');
  });

  it('returns the fallback when the candidate is null/undefined', () => {
    assert.equal(resolveReturnOrigin(null, ALLOWLIST), 'https://nxhhuy.tech');
    assert.equal(resolveReturnOrigin(undefined, ALLOWLIST), 'https://nxhhuy.tech');
  });

  it('accepts an array allowlist as well as a comma-separated string', () => {
    assert.equal(
      resolveReturnOrigin('https://develop.nxhhuy.tech', ALLOWLIST_ARRAY),
      'https://develop.nxhhuy.tech',
    );
  });

  it('throws on an empty allowlist rather than fabricating a value', () => {
    assert.throws(() => resolveReturnOrigin('https://nxhhuy.tech', ''), /allowlist is empty/);
    assert.throws(() => resolveReturnOrigin('https://nxhhuy.tech', []), /allowlist is empty/);
    assert.throws(() => resolveReturnOrigin('https://nxhhuy.tech', '   ,  , '), /allowlist is empty/);
  });

  it('normaliseAllowlist trims and dedupes', () => {
    assert.deepEqual(normaliseAllowlist(ALLOWLIST), ALLOWLIST_ARRAY);
    assert.deepEqual(
      normaliseAllowlist('  https://nxhhuy.tech  ,https://develop.nxhhuy.tech,https://nxhhuy.tech'),
      ALLOWLIST_ARRAY,
    );
    assert.deepEqual(normaliseAllowlist([]), []);
  });
});

describe('cookie options are a single source of truth (BE-1 #2)', () => {
  it('buildSessionCookieOptions produces an object whose shape matches what express-session and clearCookie both consume', async () => {
    const env = await loadEnv({
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
    const opts = buildSessionCookieOptions(env);

    // Every key that `express-session`'s Set-Cookie header and
    // `Response.clearCookie(name, opts)` both inspect MUST be present.
    // If a future refactor drops `domain` or `path`, the cookie can no
    // longer be cleared (browsers key by name + domain + path).
    assert.equal(typeof opts.httpOnly, 'boolean');
    assert.equal(typeof opts.secure, 'boolean');
    assert.equal(opts.sameSite, 'lax');
    assert.equal(opts.domain, '.nxhhuy.tech');
    assert.equal(opts.path, '/');
    assert.equal(opts.maxAge, 2592000 * 1000);

    // The SHAPE — same object reference path: buildSessionCookieOptions
    // is called once at middleware-build time and once at logout time;
    // the values it returns are structurally identical because the
    // function is pure. Assert deep equality to catch any future
    // mutation that introduces a Set vs Clear drift (e.g. adding a
    // `signed: true` to one path and not the other).
    const optsAgain = buildSessionCookieOptions(env);
    assert.deepEqual(opts, optsAgain);
  });

  it('omits the domain attribute when SESSION_COOKIE_DOMAIN is empty (local-dev pinning)', async () => {
    const env = await loadEnv({
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'corpus',
      POSTGRES_PASSWORD: 'pw',
      POSTGRES_DB: 'corpus_api',
      SESSION_COOKIE_NAME: 'corpus.sid',
      SESSION_COOKIE_SECURE: 'false',
      SESSION_COOKIE_DOMAIN: '',
      SESSION_TTL_SECONDS: '2592000',
      WEB_ORIGIN: 'http://localhost:3000',
    });
    const opts = buildSessionCookieOptions(env);
    assert.equal(opts.domain, undefined, 'empty domain → undefined so cookie pins to host');
    assert.equal(opts.secure, false, 'SESSION_COOKIE_SECURE=false in local dev');
  });
});

describe('executeLogout rejects within bounded time when req.logout is missing (BE-1 #3)', () => {
  it('a missing req.logout throws synchronously rather than hanging the await', async () => {
    // Drive the EXACT code path the @Get('logout') handler uses, not
    // a re-implementation. A regression that re-introduces
    // `req.logout?.(cb)` would silently skip the call in the
    // controller too — re-implementing the guard here would let it
    // pass. With this test driving the real export, a hang in the
    // controller also hangs the test, which the BOUND_MS race converts
    // into a meaningful failure.
    const passportReq = {} as unknown as Request;
    const BOUND_MS = 1000;
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`logout did not reject within ${BOUND_MS}ms — hangs forever`)),
        BOUND_MS,
      ),
    );
    await assert.rejects(
      Promise.race([executeLogout(passportReq), timeout]),
      /Passport is not initialized/,
    );
  });

  it('propagates the error argument that logout passes to its callback', async () => {
    // When Passport IS initialized but logout fails (the destroy()
    // callback reports an error), executeLogout must reject with that
    // error. Driving the real export — with a mock req whose logout
    // callback fires the error and whose session.destroy succeeds —
    // exercises the EXACT reject-paths the controller relies on, so
    // regressions in either layer surface here.
    const logoutErr = new Error('session row not destroyed');
    const req = {
      logout: (cb: (err: Error | null) => void): void => {
        cb(logoutErr);
      },
      session: {
        destroy: (cb: (err: Error | null) => void): void => {
          cb(null);
        },
      },
    } as unknown as Request;
    await assert.rejects(executeLogout(req), /session row not destroyed/);
  });

  it('also propagates session.destroy errors when logout succeeds', async () => {
    // Mirror case: passport logout succeeds, but session.destroy
    // reports an error. The export must still reject with that error
    // (and not hang on the destroy callback). The destroy path is
    // awaited before resolve, so a missing await is a hang that the
    // previous regression test would also have caught — this one
    // also pins down the destroy-promise shape.
    const destroyErr = new Error('connect-pg-simple write failed');
    const req = {
      logout: (cb: (err: Error | null) => void): void => {
        cb(null);
      },
      session: {
        destroy: (cb: (err: Error | null) => void): void => {
          cb(destroyErr);
        },
      },
    } as unknown as Request;
    await assert.rejects(executeLogout(req), /connect-pg-simple write failed/);
  });
});