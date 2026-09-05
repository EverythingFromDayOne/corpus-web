/**
 * Tests for apps/web/lib/progress.ts.
 *
 * The module runs under a `'use client'` boundary — the runtime contract
 * is `localStorage` (browser-only) + `crypto.randomUUID` (modern browsers).
 * This file installs an in-memory localStorage shim on `globalThis` so
 * the exported functions can be exercised as pure logic under node:test.
 *
 * Three required scenarios from the session-170 spec:
 *   (a) unversioned-blob upgrade: a pre-versioned localStorage entry
 *       must be upgraded in place (version: 1 written back), not discarded.
 *   (b) activity increment: markSeen / markComplete each increment
 *       `activity[YYYY-MM-DD]` by 1, using local-date (not UTC) for the key.
 *   (c) parse-failure clientId retention: when the stored blob is unparseable
 *       but a clientId-shaped substring is recoverable, retain it; only mint
 *       a new clientId when the key is fully absent.
 *
 * Plus a defensive scenario:
 *   (d) writeProgress must not propagate a quota or SecurityError — it is
 *       called from a scroll handler and currently crashes in private
 *       browsing. After the fix, writeProgress swallows the error.
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import {
  PROGRESS_KEY,
  readProgress,
  writeProgress,
  markSeen,
  markComplete,
  emptyProgress,
} from '../lib/progress.js';

// ----- in-memory localStorage shim -----------------------------------------

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    if (typeof value !== 'string') {
      throw new TypeError('setItem requires a string value');
    }
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  get length(): number {
    return this.store.size;
  }
}

function installStorage(impl: MemoryStorage): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: impl,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  // Fresh, deterministic state for every test.
  installStorage(new MemoryStorage());
  // Crypto needs defineProperty — Node 22 has `crypto` as a getter on the
  // global, plain assignment throws. We want crypto === undefined for
  // these tests so the module-under-test takes the anon-<base36> fallback.
  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  restoreDateNow();
  installStorage(new MemoryStorage());
});

// ----- (a) unversioned-blob upgrade ----------------------------------------

test('readProgress: an unversioned blob upgrades in place to version:1, retaining clientId, completed, seen', () => {
  const storage = new MemoryStorage();
  installStorage(storage);

  const legacy = {
    // note: NO version field — pre-v1 shape
    clientId: 'preserved-client-id-123',
    completed: { 'nextjs/cache-components-model': true },
    seen: { 'nextjs/cache-components-model': ['what-it-is', 'why-the-default-was-inverted'] },
  };
  storage.setItem(PROGRESS_KEY, JSON.stringify(legacy));

  const result = readProgress();

  assert.equal(result.clientId, 'preserved-client-id-123', 'clientId must be retained');
  assert.deepEqual(
    result.completed,
    { 'nextjs/cache-components-model': true },
    'completed map must be retained bit-for-bit',
  );
  assert.deepEqual(
    result.seen,
    { 'nextjs/cache-components-model': ['what-it-is', 'why-the-default-was-inverted'] },
    'seen map must be retained bit-for-bit',
  );
  assert.equal(result.version, 1, 'returned store must carry version:1');

  // CRITICAL: the upgrade must write back to localStorage so subsequent reads
  // find a versioned blob. If readProgress() does not persist, the upgrade
  // is wasted and the next read re-discovers an unversioned blob.
  const persisted = storage.getItem(PROGRESS_KEY);
  assert.ok(persisted, 'upgrade must persist the new blob to localStorage');
  const parsedPersisted = JSON.parse(persisted as string);
  assert.equal(parsedPersisted.version, 1, 'persisted blob must have version:1');
  assert.equal(parsedPersisted.clientId, 'preserved-client-id-123', 'persisted blob must retain clientId');
  assert.deepEqual(
    parsedPersisted.completed,
    { 'nextjs/cache-components-model': true },
    'persisted completed must be intact',
  );
  assert.deepEqual(
    parsedPersisted.seen,
    { 'nextjs/cache-components-model': ['what-it-is', 'why-the-default-was-inverted'] },
    'persisted seen must be intact',
  );
});

// ----- (b) activity increment ----------------------------------------------

/**
 * For tests that need a fixed "now" for the local-date bucket, save the
 * real `Date` constructor and replace `globalThis.Date` with a wrapper that
 * yields the frozen instant whenever called with no arguments. Calls with
 * arguments (`new Date(iso)`) are forwarded to the real constructor so tests
 * can still parse ISO strings.
 */
let savedRealDate: typeof Date | null = null;
let savedGlobalDateDescriptor: PropertyDescriptor | null = null;

function freezeNow(iso: string): void {
  if (savedRealDate === null) {
    savedRealDate = Date;
    savedGlobalDateDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Date') ?? null;
  }
  const fixedMs = new (savedRealDate as typeof Date)(iso).getTime();
  function FrozenDate(this: unknown, ...args: unknown[]) {
    const RealDateCtor = savedRealDate as unknown as new (...a: unknown[]) => Date;
    if (args.length === 0) {
      return new RealDateCtor(fixedMs);
    }
    return new RealDateCtor(...args);
  }
  // Mimic enough of the Date surface for the module-under-test.
  Object.defineProperty(FrozenDate, 'now', {
    value: () => fixedMs,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'Date', {
    value: FrozenDate,
    writable: true,
    configurable: true,
  });
}

function restoreDateNow(): void {
  if (savedRealDate !== null) {
    if (savedGlobalDateDescriptor) {
      Object.defineProperty(globalThis, 'Date', savedGlobalDateDescriptor);
    } else {
      // Fallback: hard-set back to the original Date class.
      Object.defineProperty(globalThis, 'Date', {
        value: savedRealDate,
        writable: true,
        configurable: true,
      });
    }
    savedRealDate = null;
    savedGlobalDateDescriptor = null;
  }
}

test('markSeen: increments activity[today] by 1 using local-date (timezone-independent)', () => {
  // Pin a wall-clock instant and assert the activity key matches what the
  // module-under-test computes from `new Date().getFullYear/getMonth/getDate`
  // for the runner's current timezone. On a UTC runner the local key equals
  // the UTC date; on a non-UTC runner (e.g. +07:00 CI dev machines) it can
  // differ. The behavior we care about is "use local-time methods", not
  // "always differ from UTC".
  const fixedNow = '2026-09-05T22:30:00Z';
  freezeNow(fixedNow);

  // The runner's local-date for the frozen instant:
  const expectedKey = todayLocalKey(new Date(fixedNow));

  const before = readProgress();
  assert.equal(
    (before.activity ?? {})[expectedKey] ?? 0,
    0,
    `fresh activity for ${expectedKey} should be empty before markSeen`,
  );

  const after = markSeen('nextjs/cache-components-model', 'what-it-is');

  assert.ok(after.activity, 'activity map must exist after markSeen');
  assert.equal(
    after.activity[expectedKey],
    1,
    `activity[${expectedKey}] must increment by 1 exactly when the module uses local-time methods`,
  );
  // Counter-anchor: the activity map must NEVER carry a key shaped like a
  // raw millisecond timestamp or a full ISO string. Any other shape would
  // indicate the bucket logic drifted off the YYYY-MM-DD contract.
  for (const k of Object.keys(after.activity)) {
    assert.match(k, /^\d{4}-\d{2}-\d{2}$/, `activity key "${k}" must be YYYY-MM-DD, not raw millis/ISO`);
  }
});

// --- Non-circular boundary test (runs under TZ=Asia/Ho_Chi_Minh) ------------
//
// Contract pinned:
//   At TZ=Asia/Ho_Chi_Minh, instant 2026-09-05T18:30:00Z (which is
//   01:30 local on Sep 6), one call to markSeen must produce an
//   `activity['2026-09-06']` bucket — and must NOT produce an
//   `'2026-09-05'` bucket.
//
// We assert against LITERAL strings — no call to todayLocalKey() or any
// other helper — so the assertion cannot be falsified by the test replicating
// the same calendar arithmetic as the module-under-test. The TZ env var must
// be set in the test script (apps/web/package.json) before process start so
// the runtime clock reads it; setting TZ inside this test would be too late
// for the v8 Date implementation on some Node versions.
test('markSeen: at 01:30 local on Sep 6 in UTC+7, activity bucket is 2026-09-06 (literal) and 2026-09-05 is absent', () => {
  // Sanity: the runner's process TZ must actually be Asia/Ho_Chi_Minh.
  // If a developer runs this test under their own local TZ, it would have
  // been injected from somewhere else; we want to fail loudly in that case
  // rather than produce a confusing assertion failure.
  const offsetMin = new Date('2026-09-05T18:30:00Z').getTimezoneOffset();
  // Asia/Ho_Chi_Minh is UTC+7, so getTimezoneOffset() returns -420.
  assert.equal(
    offsetMin,
    -420,
    `this test requires TZ=Asia/Ho_Chi_Minh (UTC+7), got timezone offset ${offsetMin} minutes`,
  );

  freezeNow('2026-09-05T18:30:00Z');

  const after = markSeen('any/uid', 'any-anchor');

  assert.ok(after.activity, 'activity map must exist after markSeen');
  assert.equal(
    after.activity['2026-09-06'],
    1,
    `at instant 2026-09-05T18:30:00Z in UTC+7 (01:30 local Sep 6), activity bucket must be the literal "2026-09-06", got: ${JSON.stringify(after.activity)}`,
  );
  assert.equal(
    after.activity['2026-09-05'],
    undefined,
    `UTC key "2026-09-05" must NOT appear in activity map under TZ=Asia/Ho_Chi_Minh — ${JSON.stringify(after.activity)}`,
  );
});

test('markComplete: increments activity[today] by 1 using local-date (timezone-independent)', () => {
  const fixedNow = '2026-09-05T22:30:00Z';
  freezeNow(fixedNow);
  const expectedKey = todayLocalKey(new Date(fixedNow));

  const after = markComplete('nextjs/cache-components-model');
  assert.ok(after.activity, 'activity map must exist after markComplete');
  assert.equal(after.activity[expectedKey], 1);
  // The bucket key shape is the contract — never a millis timestamp, never
  // a full ISO string.
  for (const k of Object.keys(after.activity)) {
    assert.match(k, /^\d{4}-\d{2}-\d{2}$/, `activity key "${k}" must be YYYY-MM-DD`);
  }
});

test('markSeen: consecutive calls on the same day increment by 1 each, not by section-count', () => {
  freezeNow('2026-09-05T12:00:00Z');
  const fixedNow = new Date('2026-09-05T12:00:00Z');

  markSeen('a/b', 'anchor-1');
  markSeen('a/b', 'anchor-2');
  markSeen('a/b', 'anchor-3');

  const after = readProgress();
  assert.equal(
    after.activity?.[todayLocalKey(fixedNow)],
    3,
    'three markSeen calls → activity[today] === 3',
  );
});

// ----- (c) parse-failure clientId retention --------------------------------

test('readProgress on JSON.parse failure: if clientId is recoverable, retain it; only mint new when absent', () => {
  const storage = new MemoryStorage();
  installStorage(storage);

  // A blob that LOOKS like a partial structure with a clientId at the top —
  // intentionally not valid JSON (trailing comma, unquoted key), to force
  // the parser to fail and test the recovery branch. The test does NOT
  // assert that the recovery works by regex over arbitrary garbage; it
  // asserts that a recoverable clientId is preferred over minting a new one.
  //
  // Strategy: write a fully-valid JSON blob first, then OVERWRITE the raw
  // bytes with a corrupted copy via the storage shim's setter (we deliberately
  // bypass JSON.stringify). The recoverable path looks for an existing
  // clientId field; if the blob is non-JSON, mint a new one — UNLESS the
  // shim can be probed for "what was at this key last time" which is not
  // a contract we have. So the test instead asserts the SPECIFIC contract:
  //   parse-failure → if a salvageable clientId is detectable, retain it;
  //   otherwise mint a new one. We exercise the "salvageable" path by
  //   stubbing the recovery function (covered behaviorally below with a
  //   valid-but-stale shape) and the "not salvageable" path with true garbage.
  storage.setItem(PROGRESS_KEY, '{not json at all');

  // First path: true garbage — clientId is NOT recoverable.
  const fromGarbage = readProgress();
  assert.ok(fromGarbage.clientId.length > 0, 'a fresh clientId must be minted');
  // true garbage has nothing salvageable — fresh anon-<base36> shape from
  // the createId fallback. We assert it is not the same as a brand-new
  // emptyProgress (different Math.random seed), but we can't deterministic-
  // match the suffix — assert shape instead.
  assert.ok(/^(anon-|[0-9a-f-]{36})/.test(fromGarbage.clientId), 'minted id must be either uuid or anon- prefix');

  // Second path: shaped-but-broken — JSON parse fails but the inner
  // clientId field is detectable. We rely on the implementation extracting
  // a quoted `"clientId":"..."` substring as a salvage attempt.
  storage.setItem(PROGRESS_KEY, '{"clientId":"recovered-client-xyz","broken": ');

  const fromBroken = readProgress();
  assert.equal(
    fromBroken.clientId,
    'recovered-client-xyz',
    'salvageable clientId must be retained on JSON parse failure',
  );
});

// ----- (d) writeProgress swallow ------------------------------------------

test('writeProgress: a quota error from setItem must not propagate to the caller', () => {
  const storage = new MemoryStorage();
  installStorage(storage);
  // Replace setItem with one that throws the way a browser does once the
  // quota is exceeded. writeProgress must catch the throw.
  storage.setItem = () => {
    throw Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
  };

  let threw = false;
  try {
    writeProgress(emptyProgress());
  } catch {
    threw = true;
  }
  assert.equal(
    threw,
    false,
    'writeProgress must swallow QuotaExceededError so scroll handlers do not crash',
  );
});

test('writeProgress: a SecurityError from setItem must not propagate to the caller', () => {
  const storage = new MemoryStorage();
  installStorage(storage);
  // Safari private-browsing raises SecurityError on localStorage.setItem.
  storage.setItem = () => {
    throw Object.assign(new Error('Storage access denied'), { name: 'SecurityError' });
  };

  let threw = false;
  try {
    writeProgress(emptyProgress());
  } catch {
    threw = true;
  }
  assert.equal(
    threw,
    false,
    'writeProgress must swallow SecurityError so scroll handlers do not crash in private browsing',
  );
});

test('writeProgress: a plain no-op write still writes through when storage does not throw', () => {
  const storage = new MemoryStorage();
  installStorage(storage);
  const store = emptyProgress();
  writeProgress(store);
  const persisted = storage.getItem(PROGRESS_KEY);
  assert.ok(persisted, 'write through must persist on healthy storage');
});

// --- Call-through tests: markSeen / markComplete must not throw -----------
//
// writeProgress is wrapped in try/catch — the contract is "every write path
// from a scroll-handler context is exception-safe". The unit tests on
// writeProgress above cover the writer in isolation. These tests verify the
// same guarantee is honoured through the public surface callers actually
// use — markSeen and markComplete — so the defensive contract holds at the
// level an article reader exercises it.
test('markSeen: does not throw when storage throws QuotaExceededError (call-through from writeProgress)', () => {
  const storage = new MemoryStorage();
  installStorage(storage);
  storage.setItem = () => {
    throw Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
  };

  let threw = false;
  try {
    markSeen('any/uid', 'any-anchor');
  } catch {
    threw = true;
  }
  assert.equal(
    threw,
    false,
    'markSeen must swallow QuotaExceededError — it is called from a scroll handler',
  );
});

test('markComplete: does not throw when storage throws QuotaExceededError (call-through from writeProgress)', () => {
  const storage = new MemoryStorage();
  installStorage(storage);
  storage.setItem = () => {
    throw Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
  };

  let threw = false;
  try {
    markComplete('any/uid');
  } catch {
    threw = true;
  }
  assert.equal(
    threw,
    false,
    'markComplete must swallow QuotaExceededError — it is called from a scroll handler',
  );
});

// ----- helpers -------------------------------------------------------------

/**
 * Local-date key for a fixed Date instance. Mirrors what `progress.ts` must
 * compute — testing the OUTPUT of the module-under-test against the
 * module-under-test's date function is circular; we replicate the contract
 * (YYYY-MM-DD in local time) here so the assertions are anchored.
 */
function todayLocalKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
