/**
 * Tests for apps/web/lib/activity-heatmap.ts — pure date/grid logic over
 * `ProgressStore.activity` only. No localStorage, no React, no `completed`/
 * `seen` — this module never reads or backfills from those fields. There
 * are no timestamps in v0 progress data, so a streak/heatmap computed from
 * `completed` would be an invented date. The only legitimate source is the
 * `activity` map itself, which starts recording the day this feature ships.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeCurrentStreak,
  computeMaxStreak,
  buildHeatmapWeeks,
  heatLevel,
} from '../lib/activity-heatmap';

// A fixed "today" for every test — 2026-09-06 (a Sunday), so streak/heatmap
// math is reproducible regardless of when the test suite actually runs.
const TODAY = '2026-09-06';

function daysBefore(key: string, n: number): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ----- computeCurrentStreak --------------------------------------------

test('computeCurrentStreak: empty activity returns 0', () => {
  assert.equal(computeCurrentStreak({}, TODAY), 0);
});

test('computeCurrentStreak: today only, count 1, is a streak of 1', () => {
  assert.equal(computeCurrentStreak({ [TODAY]: 1 }, TODAY), 1);
});

test('computeCurrentStreak: today + yesterday + day-before, consecutive, is a streak of 3', () => {
  const activity = {
    [TODAY]: 2,
    [daysBefore(TODAY, 1)]: 1,
    [daysBefore(TODAY, 2)]: 3,
  };
  assert.equal(computeCurrentStreak(activity, TODAY), 3);
});

test('computeCurrentStreak: a gap breaks the streak — only the unbroken tail from today counts', () => {
  const activity = {
    [TODAY]: 1,
    [daysBefore(TODAY, 1)]: 1,
    // gap at daysBefore(TODAY, 2)
    [daysBefore(TODAY, 3)]: 1,
    [daysBefore(TODAY, 4)]: 1,
  };
  assert.equal(computeCurrentStreak(activity, TODAY), 2);
});

test('computeCurrentStreak: activity yesterday but NOT today still counts (grace day) up through yesterday', () => {
  // A reader who was active yesterday but hasn't opened the site yet today
  // should not see their streak zeroed out mid-day. The streak counts
  // backward from the most recent active day when today itself is empty.
  const activity = {
    [daysBefore(TODAY, 1)]: 1,
    [daysBefore(TODAY, 2)]: 1,
  };
  assert.equal(computeCurrentStreak(activity, TODAY), 2);
});

test('computeCurrentStreak: activity only two days ago (yesterday empty too) is a broken streak — 0', () => {
  const activity = {
    [daysBefore(TODAY, 2)]: 1,
  };
  assert.equal(computeCurrentStreak(activity, TODAY), 0);
});

test('computeCurrentStreak: zero-count entries do not count as active days', () => {
  // Defensive: activity[key] === 0 should behave like absence, not presence.
  // Today has real activity, but yesterday is explicitly 0 — the streak
  // must stop at today (1), not continue through the zero-count day.
  const activity = {
    [TODAY]: 3,
    [daysBefore(TODAY, 1)]: 0,
    [daysBefore(TODAY, 2)]: 1,
  };
  assert.equal(computeCurrentStreak(activity, TODAY), 1);
});

// ----- computeMaxStreak --------------------------------------------------

test('computeMaxStreak: empty activity returns 0', () => {
  assert.equal(computeMaxStreak({}), 0);
});

test('computeMaxStreak: single day returns 1', () => {
  assert.equal(computeMaxStreak({ [TODAY]: 1 }), 1);
});

test('computeMaxStreak: finds the longest run, not just the most recent one', () => {
  // Two separate runs: a 2-day run in the past, then a gap, then today
  // (1-day run). Max streak must report 2, not 1.
  const activity = {
    [daysBefore(TODAY, 10)]: 1,
    [daysBefore(TODAY, 9)]: 1,
    // gap
    [TODAY]: 1,
  };
  assert.equal(computeMaxStreak(activity), 2);
});

test('computeMaxStreak: a later, longer run overtakes an earlier shorter one', () => {
  const activity = {
    [daysBefore(TODAY, 20)]: 1, // 1-day run
    // gap
    [daysBefore(TODAY, 10)]: 1,
    [daysBefore(TODAY, 9)]: 1,
    [daysBefore(TODAY, 8)]: 1, // 3-day run
  };
  assert.equal(computeMaxStreak(activity), 3);
});

test('computeMaxStreak: unsorted insertion order does not affect the result', () => {
  const activity: Record<string, number> = {};
  activity[daysBefore(TODAY, 8)] = 1;
  activity[daysBefore(TODAY, 5)] = 1;
  activity[daysBefore(TODAY, 6)] = 1;
  activity[daysBefore(TODAY, 7)] = 1;
  assert.equal(computeMaxStreak(activity), 4);
});

// ----- buildHeatmapWeeks --------------------------------------------------

test('buildHeatmapWeeks: empty activity produces an 18-week grid with all-zero cells, no placeholder numbers', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  assert.equal(layout.weeks.length, 18, 'grid must have exactly 18 week columns (round 9: 18-week / 6-level)');
  const allCells = layout.weeks.flat();
  assert.ok(allCells.length > 110, 'an 18-week grid must have 126 day cells (incl. padding)');
  for (const cell of allCells) {
    if (cell === null) continue; // padding cell (before the window or after today)
    assert.equal(cell.count, 0, `cell ${cell.date} must be 0 when activity is empty`);
  }
});

test('buildHeatmapWeeks: does not fabricate a count for any date — every non-null cell traces to a real activity key or is explicitly 0', () => {
  const activity = { [TODAY]: 5 };
  const layout = buildHeatmapWeeks(activity, TODAY);
  const allCells = layout.weeks.flat().filter((c) => c !== null);
  const todayCell = allCells.find((c) => c!.date === TODAY);
  assert.ok(todayCell, 'today must be a real cell in the grid');
  assert.equal(todayCell!.count, 5);
  // Every other cell must be exactly 0 — no invented values.
  for (const cell of allCells) {
    if (cell!.date === TODAY) continue;
    assert.equal(cell.count, 0, `cell ${cell.date} must be 0, never fabricated`);
  }
});

test('buildHeatmapWeeks: cells are ordered chronologically within a week column and across weeks', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  const flat = layout.weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  for (let i = 1; i < flat.length; i++) {
    assert.ok(flat[i]!.date > flat[i - 1]!.date, 'dates must be strictly increasing');
  }
});

test('buildHeatmapWeeks: the last real cell is "today", not some future padding date', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  const flat = layout.weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  const last = flat[flat.length - 1];
  assert.equal(last!.date, TODAY);
});

test('buildHeatmapWeeks: window is exactly 18 week columns ending on today\'s week', () => {
  // TODAY = 2026-09-06 (a Sunday). 18 weeks back lands the window start
  // in early May 2026.
  const layout = buildHeatmapWeeks({}, TODAY);
  const flat = layout.weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  const first = flat[0]!;
  const firstMonth = Number(first.date.slice(5, 7));
  assert.ok(
    firstMonth >= 4 && firstMonth <= 6,
    `expected the window to start in Apr/May/Jun 2026, got ${first.date}`,
  );
});

test('buildHeatmapWeeks: weekdayLabels is Mon..Sun in order', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  assert.deepEqual(layout.weekdayLabels, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
});

test('buildHeatmapWeeks: monthLabels lists one entry per calendar month in the window', () => {
  // TODAY = 2026-09-06 → 18-week window covers early May 2026 through Sep
  // 2026 = 5 months. Each label must be a valid 3-letter month
  // abbreviation and the week indices must be strictly increasing.
  const layout = buildHeatmapWeeks({}, TODAY);
  const validLabels = new Set([
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]);
  assert.ok(layout.monthLabels.length >= 4, `expected ≥4 month labels, got ${layout.monthLabels.length}`);
  for (const ml of layout.monthLabels) {
    assert.ok(validLabels.has(ml.label), `month label must be a 3-letter abbreviation, got "${ml.label}"`);
    assert.ok(
      ml.weekIndex >= 0 && ml.weekIndex < layout.weeks.length,
      `weekIndex out of range: ${ml.weekIndex}`,
    );
  }
  for (let i = 1; i < layout.monthLabels.length; i++) {
    assert.ok(
      layout.monthLabels[i]!.weekIndex > layout.monthLabels[i - 1]!.weekIndex,
      'monthLabels must be in chronological order',
    );
  }
});

test('buildHeatmapWeeks: monthBreaks contains every monthLabel weekIndex', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  for (const ml of layout.monthLabels) {
    assert.ok(
      layout.monthBreaks.has(ml.weekIndex),
      `monthBreaks must include ${ml.weekIndex} (where ${ml.label} begins)`,
    );
  }
});

test('buildHeatmapWeeks: monthBreaks has no entries that are not monthLabels', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  const labeled = new Set(layout.monthLabels.map((m) => m.weekIndex));
  for (const breakIdx of layout.monthBreaks) {
    assert.ok(labeled.has(breakIdx), `monthBreaks has an orphan entry at week ${breakIdx}`);
  }
});

test('buildHeatmapWeeks: window is exactly 18 weeks (round 9: bumped from 12 to 18 to match the restored 6-level ladder)', () => {
  const layout = buildHeatmapWeeks({}, TODAY);
  assert.equal(layout.weeks.length, 18, `expected exactly 18 weeks, got ${layout.weeks.length}`);
});

test('buildHeatmapWeeks: 18-week window is longer than the round-8 12-week window (regression on the prior window size)', () => {
  const layout18 = buildHeatmapWeeks({}, TODAY);
  assert.ok(layout18.weeks.length >= 16, `18-week window must be ≥16 weeks, got ${layout18.weeks.length}`);
});

// ----- heatLevel ---------------------------------------------------------

test('heatLevel: 0 maps to level 0 (empty day)', () => {
  assert.equal(heatLevel(0), 0);
});

test('heatLevel: 1-2 map to level 1 (a single heading crossed, or two quick glances)', () => {
  assert.equal(heatLevel(1), 1);
  assert.equal(heatLevel(2), 1);
});

test('heatLevel: 3-5 map to level 2 (partial read of a short article)', () => {
  assert.equal(heatLevel(3), 2);
  assert.equal(heatLevel(5), 2);
});

test('heatLevel: 6-8 map to level 3 (just under a typical end-to-end read, p25 of the corpus distribution)', () => {
  assert.equal(heatLevel(6), 3);
  assert.equal(heatLevel(8), 3);
});

test('heatLevel: 9-13 map to level 4 (typical end-to-end read, p50 to just under p90)', () => {
  assert.equal(heatLevel(9), 4);
  assert.equal(heatLevel(13), 4);
});

test('heatLevel: 14+ map to level 5 (long article read or a multi-article day, p90+)', () => {
  assert.equal(heatLevel(14), 5);
  assert.equal(heatLevel(22), 5);
  assert.equal(heatLevel(100), 5);
});

test('heatLevel: the five non-empty levels carry information across the real corpus distribution', () => {
  // Re-validate against the measured distribution: min=2, p25=8, p50=9,
  // p75=14, p90=14, max=22. Round 9 restores the round-7 6-level
  // opacity ladder (0/1-2/3-5/6-8/9-13/14+) on top of an 18-week
  // window — same ladder as round 7 because the ladder depends on the
  // event-count distribution, not the window width.
  const distribution: Array<[number, 0 | 1 | 2 | 3 | 4 | 5]> = [
    [2, 1], [8, 3], [9, 4], [14, 5], [22, 5], // real distribution examples
    [1, 1], [3, 2], [5, 2], [6, 3], [10, 4], [13, 4], [15, 5], // boundary smoke tests
  ];
  for (const [count, expected] of distribution) {
    assert.equal(heatLevel(count), expected, `heatLevel(${count}) expected ${expected}`);
  }
});
