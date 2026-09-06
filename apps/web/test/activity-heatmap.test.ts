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

test('buildHeatmapWeeks: empty activity produces a full 12-month grid with all-zero cells, no placeholder numbers', () => {
  const weeks = buildHeatmapWeeks({}, TODAY);
  assert.ok(weeks.length > 0, 'grid must have at least one week column');
  const allCells = weeks.flat();
  assert.ok(allCells.length > 300, 'a 12-month grid must have roughly 365+ day cells (incl. padding)');
  for (const cell of allCells) {
    if (cell === null) continue; // padding cell (before the 12-month window or after today)
    assert.equal(cell.count, 0, `cell ${cell.date} must be 0 when activity is empty`);
  }
});

test('buildHeatmapWeeks: does not fabricate a count for any date — every non-null cell traces to a real activity key or is explicitly 0', () => {
  const activity = { [TODAY]: 5 };
  const weeks = buildHeatmapWeeks(activity, TODAY);
  const allCells = weeks.flat().filter((c) => c !== null);
  const todayCell = allCells.find((c) => c!.date === TODAY);
  assert.ok(todayCell, 'today must be a real cell in the grid');
  assert.equal(todayCell!.count, 5);
  // Every other cell must be exactly 0 — no invented values.
  for (const cell of allCells) {
    if (cell!.date === TODAY) continue;
    assert.equal(cell!.count, 0, `cell ${cell!.date} must be 0, never fabricated`);
  }
});

test('buildHeatmapWeeks: cells are ordered chronologically within a week column and across weeks', () => {
  const weeks = buildHeatmapWeeks({}, TODAY);
  const flat = weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  for (let i = 1; i < flat.length; i++) {
    assert.ok(flat[i]!.date > flat[i - 1]!.date, 'dates must be strictly increasing');
  }
});

test('buildHeatmapWeeks: the last real cell is "today", not some future padding date', () => {
  const weeks = buildHeatmapWeeks({}, TODAY);
  const flat = weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  const last = flat[flat.length - 1];
  assert.equal(last!.date, TODAY);
});

test('buildHeatmapWeeks: window spans roughly 12 months back from today (leap into the prior year)', () => {
  const weeks = buildHeatmapWeeks({}, TODAY);
  const flat = weeks.flat().filter((c): c is { date: string; count: number } => c !== null);
  const first = flat[0];
  // 12 months back from 2026-09-06 lands in 2025.
  assert.ok(first!.date.startsWith('2025-'), `expected the window to start in 2025, got ${first!.date}`);
});
