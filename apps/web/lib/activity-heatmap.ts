/**
 * Pure date/grid logic over `ProgressStore.activity`. No localStorage
 * access, no React — this module receives an `activity` map and produces
 * derived values (current streak, max streak, a 12-month heatmap grid).
 *
 * ABSOLUTE RULE: this module reads `activity` ONLY. It never reads
 * `completed` or `seen`, and it never fabricates a date for a historical
 * event. v0 progress data has no timestamps on `completed` (just a `true`
 * literal) and no per-anchor timestamps on `seen` (just an unordered anchor
 * list) — there is no legitimate way to backfill activity for days before
 * this feature shipped. An empty `activity` map means an empty grid: every
 * cell renders 0, never a placeholder or invented number.
 */

export type HeatmapCell = { date: string; count: number };

/** Local-date key format shared with apps/web/lib/progress.ts's todayLocalKey(). */
function localKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  // Parse as local midnight, not UTC midnight — "2026-09-06" must mean
  // Sep 6 in the reader's timezone, matching how the key was produced.
  return new Date(`${key}T00:00:00`);
}

function addDays(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

/**
 * Current streak: consecutive active days ending at `today`, OR — if
 * `today` itself has no activity yet (the reader hasn't opened the site
 * today) — ending at the most recent active day, so a streak doesn't
 * appear to reset to 0 mid-day before the reader has had a chance to act.
 * A gap of any size (including exactly one day, i.e. "activity two days
 * ago but not yesterday or today") breaks the streak to 0.
 */
export function computeCurrentStreak(
  activity: Record<string, number>,
  today: string = localKey(new Date()),
): number {
  const isActive = (key: string) => (activity[key] ?? 0) > 0;

  let cursor = parseKey(today);
  if (!isActive(localKey(cursor))) {
    // Today is empty — check yesterday as the grace day. If yesterday is
    // also empty, the streak is 0 (no grace beyond one day).
    cursor = addDays(cursor, -1);
    if (!isActive(localKey(cursor))) return 0;
  }

  let streak = 0;
  while (isActive(localKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * Longest run of consecutive active days anywhere in the activity map,
 * not just the run ending at `today`. Independent of `computeCurrentStreak`
 * — a reader's best-ever streak may be in the past.
 */
export function computeMaxStreak(activity: Record<string, number>): number {
  const activeDays = Object.entries(activity)
    .filter(([, count]) => count > 0)
    .map(([key]) => key)
    .sort();

  if (activeDays.length === 0) return 0;

  let max = 1;
  let current = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const prev = parseKey(activeDays[i - 1]!);
    const curr = parseKey(activeDays[i]!);
    const dayGap = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    if (dayGap === 1) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > max) max = current;
  }
  return max;
}

/**
 * 12-month heatmap grid, GitHub-contribution-graph shaped: an array of
 * week columns, each an array of 7 day cells (Sun-Sat), oldest week first.
 * `null` cells are padding (before the 12-month window, or after `today`)
 * so every week column has exactly 7 slots for a clean CSS grid — they
 * render as empty, not as a 0-count day.
 *
 * Every non-null cell's `count` comes directly from `activity[date] ?? 0`.
 * No cell is ever invented from `completed` or `seen`.
 */
export function buildHeatmapWeeks(
  activity: Record<string, number>,
  today: string = localKey(new Date()),
): (HeatmapCell | null)[][] {
  const todayDate = parseKey(today);

  // Start of the window: 12 months back from today, then walk back to the
  // most recent Sunday so week columns are aligned to calendar weeks.
  const windowStart = new Date(todayDate);
  windowStart.setMonth(windowStart.getMonth() - 12);
  windowStart.setDate(windowStart.getDate() - windowStart.getDay());

  // End of the grid: the Saturday of today's week, so every week column is
  // complete — cells after today are padding (null), not future data.
  const gridEnd = new Date(todayDate);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  const weeks: (HeatmapCell | null)[][] = [];
  let cursor = new Date(windowStart);
  while (cursor <= gridEnd) {
    const week: (HeatmapCell | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = localKey(cursor);
      const beforeWindow = cursor < new Date(todayDate.getFullYear() - 1, todayDate.getMonth(), todayDate.getDate());
      const afterToday = cursor > todayDate;
      if (afterToday) {
        week.push(null);
      } else if (beforeWindow) {
        week.push(null);
      } else {
        week.push({ date: key, count: activity[key] ?? 0 });
      }
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
