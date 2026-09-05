'use client';

export const PROGRESS_KEY = 'corpus-progress';
export const PROGRESS_VERSION = 1;

/**
 * Persisted client-progress shape. v1+ carries `version` and `activity`.
 *
 * Migration note: `completed` and `seen` shapes are frozen across versions;
 * any future schema change must bump `PROGRESS_VERSION` and provide a
 * migration branch in `readProgress()` that runs in-place — never discard.
 */
export type ProgressStore = {
  version: typeof PROGRESS_VERSION;
  clientId: string;
  completed: Record<string, true>;
  seen: Record<string, string[]>;
  /** Per-local-date count of progress mutations (markSeen + markComplete). */
  activity: Record<string, number>;
};

/**
 * Legacy v0 shape — present in localStorage on any device that touched the
 * site before this migration. `version` is absent; `activity` is absent.
 */
type LegacyProgressStore = {
  version?: undefined;
  clientId: string;
  completed: Record<string, true>;
  seen: Record<string, string[]>;
  activity?: undefined;
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Math.random().toString(36).slice(2)}`;
}

/**
 * Local-date key for `activity` (YYYY-MM-DD in the browser's timezone).
 *
 * Date-method approach (`getFullYear`/`getMonth`/`getDate`) is local-time —
 * a reader in UTC-7 at 22:30 UTC on 2026-09-05 records against the 2026-09-05
 * bucket, not the 2026-09-06 UTC bucket. The previous server-clock approach
 * was wrong for any reader east of UTC.
 */
function todayLocalKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function emptyProgress(): ProgressStore {
  return { version: PROGRESS_VERSION, clientId: createId(), completed: {}, seen: {}, activity: {} };
}

/**
 * Best-effort salvage: when the stored blob is not parseable JSON, look for
 * a `"clientId":"..."` substring we can recover. If found, retain it; if not,
 * mint a new one. The user keeps their identity across corruptions that are
 * not catastrophic. Pure heuristic — never guaranteed.
 */
function salvageClientId(raw: string): string | null {
  const match = /"clientId"\s*:\s*"([^"\\]{1,200})"/.exec(raw);
  return match && match[1] ? match[1] : null;
}

export function readProgress(): ProgressStore {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PROGRESS_KEY);
  } catch {
    // localStorage may throw in private-browsing (Safari) — treat as empty.
    return emptyProgress();
  }
  if (!raw) return emptyProgress();

  let parsed: Partial<ProgressStore> | Partial<LegacyProgressStore> | null = null;
  let parseOk = false;
  try {
    parsed = JSON.parse(raw) as Partial<ProgressStore>;
    parseOk = true;
  } catch {
    parseOk = false;
  }

  if (!parseOk) {
    // Try to retain a recognisable clientId; otherwise mint a fresh one.
    const retained = salvageClientId(raw);
    return {
      version: PROGRESS_VERSION,
      clientId: retained ?? createId(),
      completed: {},
      seen: {},
      activity: {},
    };
  }

  const stored = parsed as Partial<ProgressStore>;
  const hasVersion = stored.version === PROGRESS_VERSION;
  if (!hasVersion) {
    // Unversioned blob — upgrade in place to v1.
    const upgraded: ProgressStore = {
      version: PROGRESS_VERSION,
      clientId: typeof stored.clientId === 'string' ? stored.clientId : createId(),
      completed: stored.completed ?? {},
      seen: stored.seen ?? {},
      activity: {},
    };
    try {
      writeProgress(upgraded);
    } catch {
      // writePath swallowed its own error — nothing else to do here.
    }
    return upgraded;
  }

  return {
    version: PROGRESS_VERSION,
    clientId: typeof stored.clientId === 'string' ? stored.clientId : createId(),
    completed: stored.completed ?? {},
    seen: stored.seen ?? {},
    activity: stored.activity ?? {},
  };
}

/**
 * Write the store to localStorage. Errors are swallowed by design: this is
 * called from a scroll handler in private-browsing (Safari SecurityError) and
 * after a long session (QuotaExceededError). In both cases the in-memory
 * `store` argument is already the truth — losing the persistence does not
 * lose the user's progress for the running session, only for next page-load.
 */
export function writeProgress(store: ProgressStore): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    // Intentional: do not propagate. Scroll handlers must not throw.
  }
}

export function markSeen(uid: string, anchor: string): ProgressStore {
  const store = readProgress();
  const current = new Set(store.seen[uid] ?? []);
  current.add(anchor);
  store.seen[uid] = [...current];

  const key = todayLocalKey();
  store.activity[key] = (store.activity[key] ?? 0) + 1;

  writeProgress(store);
  return store;
}

export function markComplete(uid: string): ProgressStore {
  const store = readProgress();
  store.completed[uid] = true;

  const key = todayLocalKey();
  store.activity[key] = (store.activity[key] ?? 0) + 1;

  writeProgress(store);
  return store;
}
