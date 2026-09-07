/**
 * Pure date/grid logic over `ProgressStore.activity`. No localStorage
 * access, no React — this module receives an `activity` map and produces
 * derived values (current streak, max streak, a 24-week heatmap grid +
 * the metadata the React layer needs to render weekday/month labels and
 * inter-month gutters without recomputing dates).
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

/** Where to drop a month-label pill above the grid. */
export type MonthLabel = { weekIndex: number; label: string };

/**
 * Returned by `buildHeatmapWeeks` so the React layer can render weekday
 * and month labels and inter-month gutters without recomputing any
 * calendar math. `weeks[i][dow]` is the cell at column i, row dow (0=Sun
 * … 6=Sat), or null if the cell is padding (before the window, after
 * today).
 *
 * `monthLabels` lists the first week-index of each calendar month that
 * appears in the window. `monthBreaks` is the same set as indices — the
 * React layer uses it to insert a gutter column before each new month.
 */
export type HeatmapLayout = {
  weeks: (HeatmapCell | null)[][];
  weekdayLabels: string[]; // 7 entries, Sun..Sat, short form ('Sun', 'Mon', ...)
  monthLabels: MonthLabel[];
  monthBreaks: Set<number>; // week indices at which a new month begins
};

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
 * Short weekday labels (Mon..Sun), 3-letter form. Sized for a sidebar;
 * Mon..Sun matches ISO-8601 calendar conventions and the MiniMax reference.
 */
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Short month labels (Jan..Dec). Same shape used for both the top axis and
 * any future "last 6 months" month-selector.
 */
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Number of week columns in the grid — matches the MiniMax reference. */
const WINDOW_WEEKS = 24;

/**
 * 24-week heatmap grid + the metadata needed to render weekday labels,
 * month labels, and inter-month gutters.
 *
 * Shape: an array of week columns, each an array of 7 day cells (Mon..Sun),
 * oldest week first. `null` cells are padding (before the window, or after
 * `today`) so every week column has exactly 7 slots for a clean CSS grid.
 *
 * Month labels: one entry per calendar month that appears in the window,
 * anchored at the first week-column index containing a day of that month.
 *
 * Every non-null cell's `count` comes directly from `activity[date] ?? 0`.
 * No cell is ever invented from `completed` or `seen`.
 */
export function buildHeatmapWeeks(
  activity: Record<string, number>,
  today: string = localKey(new Date()),
): HeatmapLayout {
  const todayDate = parseKey(today);

  // End of the grid: the Sunday of today's week, so every week column
  // is complete — cells after today are padding (null), not future data.
  const todayDow = (todayDate.getDay() + 6) % 7; // Mon=0, ..., Sun=6
  const daysToSunday = 6 - todayDow;
  const gridEnd = addDays(todayDate, daysToSunday);

  // Start of the window: exactly WINDOW_WEEKS week-columns ending at
  // gridEnd, i.e. the Monday WINDOW_WEEKS*7-1 days before gridEnd. This
  // matches the reference's fixed 24-column grid rather than a calendar
  // "6 months back" cutoff — the two rules coincide in week count only
  // when today happens to fall on specific weekdays, so they must not be
  // conflated.
  const windowStart = addDays(gridEnd, -(WINDOW_WEEKS * 7 - 1));

  const weeks: (HeatmapCell | null)[][] = [];
  const monthLabels: MonthLabel[] = [];
  const monthBreaks = new Set<number>();
  let lastMonth = -1;

  let cursor = new Date(windowStart);
  while (cursor <= gridEnd) {
    const week: (HeatmapCell | null)[] = [];
    const currentWeekIndex = weeks.length;
    for (let dow = 0; dow < 7; dow++) {
      const key = localKey(cursor);
      // Cells outside the [windowStart, today] interval are padding (null):
      // before the window = never counted, after today = future.
      const beforeWindow = cursor < windowStart;
      const afterToday = cursor > todayDate;
      if (beforeWindow || afterToday) {
        week.push(null);
      } else {
        week.push({ date: key, count: activity[key] ?? 0 });
      }

      // Detect month boundaries as we walk — the first week containing
      // a day of a new calendar month anchors the month label. If two
      // month transitions land in the same week column (windowStart can
      // fall a day or two before a month boundary), the later month wins
      // for that column — matching the reference, which never double-
      // labels a single column (e.g. windowStart of Mar 30 puts Apr 1
      // in week 0 too, so week 0 is labeled "Apr", not "Mar").
      const cellMonth = cursor.getMonth();
      if (cellMonth !== lastMonth && !beforeWindow && !afterToday) {
        const prevLabel = monthLabels[monthLabels.length - 1];
        if (prevLabel && prevLabel.weekIndex === currentWeekIndex) {
          prevLabel.label = MONTH_LABELS[cellMonth]!;
        } else {
          monthLabels.push({ weekIndex: currentWeekIndex, label: MONTH_LABELS[cellMonth]! });
          monthBreaks.add(currentWeekIndex);
        }
        lastMonth = cellMonth;
      }

      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return {
    weeks,
    weekdayLabels: [...WEEKDAY_LABELS],
    monthLabels,
    monthBreaks,
  };
}

/**
 * Buckets a raw count into a 0-4 visual intensity level for the CSS to
 * key off. Boundaries chosen against the real distribution of events-per-
 * end-to-end-article-read across the four mounted corpora (re-measured
 * 2026-09-07 against 257 articles with H2s):
 *
 *   min: 2 events (h2=1)
 *   p25: 8 events
 *   p50: 9 events
 *   p75: 14 events
 *   p90: 14 events
 *   max: 22 events
 *
 * Each "event" is one progress mutation — either a `markSeen(uid, anchor)`
 * firing as a section heading crosses the 20% reading line, or the
 * `markComplete(uid)` firing when the last part is seen. The boundary
 * cuts were picked to keep the four non-empty levels visually
 * distinguishable in real-world reading sessions (a typical end-to-end
 * article read lands at level 3; glances at level 1-2; long or multi-
 * article days at level 4):
 *
 *   0  — empty day (no progress mutations that day)
 *   1  — 1-2 events (a single heading crossed, or two quick glances)
 *   2  — 3-5 events (partial read of a short article, or a long scroll
 *        through a few sections of a long one)
 *   3  — 6-9 events (typical end-to-end read of a short-to-medium
 *        article — p25 of the corpus distribution)
 *   4  — 10+ events (long article read or a multi-article day —
 *        p90+ of the corpus distribution)
 */
export function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}
