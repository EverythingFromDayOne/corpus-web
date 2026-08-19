'use client';

export const PROGRESS_KEY = 'corpus-progress';

export type ProgressStore = {
  clientId: string;
  completed: Record<string, true>;
  seen: Record<string, string[]>;
};

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `anon-${Math.random().toString(36).slice(2)}`;
}

export function emptyProgress(): ProgressStore {
  return { clientId: createId(), completed: {}, seen: {} };
}

export function readProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<ProgressStore>;
    return {
      clientId: typeof parsed.clientId === 'string' ? parsed.clientId : createId(),
      completed: parsed.completed ?? {},
      seen: parsed.seen ?? {},
    };
  } catch {
    return emptyProgress();
  }
}

export function writeProgress(store: ProgressStore): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
}

export function markSeen(uid: string, anchor: string): ProgressStore {
  const store = readProgress();
  const current = new Set(store.seen[uid] ?? []);
  current.add(anchor);
  store.seen[uid] = [...current];
  writeProgress(store);
  return store;
}

export function markComplete(uid: string): ProgressStore {
  const store = readProgress();
  store.completed[uid] = true;
  writeProgress(store);
  return store;
}
