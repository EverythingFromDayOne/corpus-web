'use client';

import { useEffect, useState } from 'react';
import { readProgress } from '@/lib/progress';
import {
  computeCurrentStreak,
  computeMaxStreak,
  buildHeatmapWeeks,
  type HeatmapLayout,
} from '@/lib/activity-heatmap';
import { t, type Messages } from '@/lib/i18n';

/**
 * Streak + 6-month activity heatmap, read from `ProgressStore.activity`
 * only. Never reads `completed` or `seen` — v0 progress data has no
 * timestamps to backfill from, and inventing a date for historical
 * activity is not acceptable. An empty `activity` map renders an empty
 * grid: every cell is 0, never a placeholder number.
 *
 * Layout: a GitHub-contribution-shaped 7-row × N-week grid with month
 * labels across the top (anchored at the first week of each calendar
 * month in the window) and weekday labels down the left (Sun..Sat).
 * Inter-month gutters separate the week columns at every month boundary
 * — the visual rhythm comes from the gutter, the month labels say what
 * the gutter means.
 *
 * Client-only by necessity (localStorage read) — matches the pattern in
 * `sidebars.tsx`'s `useEffect(() => setCompleted(readProgress().completed))`.
 */
export function ActivityHeatmap({ messages }: { messages: Messages }) {
  const [activity, setActivity] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    setActivity(readProgress().activity);
  }, []);

  // Render nothing until the client-side read resolves — avoids a
  // server/client markup mismatch and avoids showing a 0-streak flash
  // before the real value is known.
  if (activity === null) return null;

  const currentStreak = computeCurrentStreak(activity);
  const maxStreak = computeMaxStreak(activity);
  const layout = buildHeatmapWeeks(activity);

  return (
    <div className="av-heatmap" aria-labelledby="av-heatmap-heading">
      <h3 id="av-heatmap-heading">{t(messages, 'article.activityHeading')}</h3>
      <div className="av-heatmap-streaks">
        <div className="av-heatmap-streak">
          <span className="av-heatmap-streak-n">{currentStreak}</span>
          <span className="av-heatmap-streak-label">{t(messages, 'article.currentStreak')}</span>
        </div>
        <div className="av-heatmap-streak">
          <span className="av-heatmap-streak-n">{maxStreak}</span>
          <span className="av-heatmap-streak-label">{t(messages, 'article.maxStreak')}</span>
        </div>
      </div>
      <div
        className="av-heatmap-grid"
        role="img"
        aria-label={t(messages, 'article.activityGridLabel', { current: currentStreak, max: maxStreak })}
      >
        <HeatmapCells layout={layout} messages={messages} />
      </div>
    </div>
  );
}

/**
 * Renders the 6-month grid: month-label row, weekday-label column, and
 * the cells themselves. The grid is a CSS `display: grid` with explicit
 * row + column tracks so the weekday labels sit in their own column and
 * the cells align to the 7-row rhythm without per-cell positional math.
 *
 * Inter-month gutters are produced by inserting an empty column track
 * before each new month (CSS `grid-column-start` on the first cell of a
 * month + `grid-column-gap`); the React layer only needs to know that
 * a break exists, the CSS handles the visual.
 *
 * Month labels are absolutely positioned over the cell grid (see CSS
 * comment on `.av-heatmap-month-labels`) — JSX only provides the week
 * index, the CSS does the column alignment via `left: <weekIndex>px` and
 * the leftward text-overflow via `transform: translateX(-100%)`.
 */
function HeatmapCells({ layout, messages }: { layout: HeatmapLayout; messages: Messages }) {
  const { weeks, weekdayLabels, monthLabels } = layout;

  // Column positions are now percentage-based, matching the reference's
  // `grid-template-columns: auto repeat(N, minmax(0px, 1fr))`: each week
  // column is an equal fraction of the fluid grid width (weekday column
  // excluded), so a month label's left offset is
  // `weekIndex / weeks.length * 100%` — the same math the reference uses
  // (Apr 0%, May 16.6667% ... for N=24). This keeps month labels aligned
  // to their column regardless of the grid's actual rendered width.
  const labelOffsets = new Map<number, number>();
  for (let i = 0; i < weeks.length; i++) {
    labelOffsets.set(i, (i / weeks.length) * 100);
  }

  return (
    <>
      {/* Month label overlay — absolutely-positioned labels above the cell
          grid, anchored to the first week of each calendar month. The
          `data-week-idx` attribute is test surface used by the verification
          probe to map labels back to their target column. Removing it would
          break the probe silently. See session 180. */}
      <div className="av-heatmap-month-labels" aria-hidden="true">
        {monthLabels.map((m) => (
          <span
            key={m.weekIndex}
            data-week-idx={m.weekIndex}
            className="av-heatmap-month-label"
            style={{ left: `${labelOffsets.get(m.weekIndex) ?? 0}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div
        className="av-heatmap-body"
        style={{ gridTemplateColumns: `20px repeat(${weeks.length}, minmax(0px, 1fr))` }}
      >
        {/* Weekday label column — one cell per row, parallel to the cell grid. */}
        <div className="av-heatmap-weekday-col" aria-hidden="true">
          {weekdayLabels.map((wd, dow) => (
            <span key={dow} className="av-heatmap-weekday-label">
              {wd}
            </span>
          ))}
        </div>

        {/* Cell grid — each week is a column; each cell is a tooltip-bearing button.
            The `data-week-idx` attribute is intentional test surface: the verification
            probe (see /tmp/heatmap-verify-180.py) maps month labels back to their
            target week column via this attribute. Removing it would break the probe
            silently. See session 180. */}
        <div className="av-heatmap-weeks">
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              data-week-idx={weekIndex}
              className="av-heatmap-week"
            >
              {week.map((cell, dayIndex) =>
                cell === null ? (
                  <span
                    key={dayIndex}
                    className="av-heatmap-cell av-heatmap-cell-pad"
                    aria-hidden="true"
                  />
                ) : (
                  <HeatmapCellBtn key={cell.date} cell={cell} messages={messages} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend below the grid, horizontal, right-aligned (matching the MiniMax reference). */}
      <HeatmapLegend messages={messages} />

      {/* Hidden month-label list for AT — month labels are aria-hidden above
          because the cell-level aria-labels already carry dates; the
          structure (which months are in the window) is screen-reader noise. */}
      <span hidden>
        {monthLabels.map((m, i) => (
          <span key={i}>{m.label} </span>
        ))}
      </span>
    </>
  );
}

/**
 * Single heatmap cell rendered as a focusable button so keyboard users
 * can land on it and see the styled tooltip. The tooltip is positioned
 * above the cell by CSS (`:hover` / `:focus-visible`) — no JS event
 * handlers, no global listeners, no portal.
 */
function HeatmapCellBtn({
  cell,
  messages,
}: {
  cell: { date: string; count: number };
  messages: Messages;
}) {
  // Tooltip body: "Aug 29" on line 1, "8 events" / "1 event" on line 2.
  // Singular/plural handled here so the i18n strings stay simple.
  const dateLabel = formatShortDate(cell.date);
  const eventWord =
    cell.count === 1
      ? t(messages, 'article.eventOne')
      : t(messages, 'article.eventOther');
  const tooltipText = `${dateLabel}\n${cell.count} ${eventWord}`;
  const ariaLabel =
    cell.count === 0
      ? t(messages, 'article.activityCellEmpty', { date: dateLabel })
      : t(messages, 'article.activityCellCount', {
          date: dateLabel,
          count: cell.count,
          unit: eventWord,
        });

  return (
    <button
      type="button"
      className={`av-heatmap-cell${cell.count > 0 ? ' av-heatmap-cell-active' : ''}`}
      data-level={heatLevelForRender(cell.count)}
      data-tooltip={tooltipText}
      aria-label={ariaLabel}
    />
  );
}

/**
 * Render-time copy of the bucketing rule. Lives in this file (rather than
 * imported) so the boundary cuts stay co-located with the React layer
 * that consumes them — same source-of-truth, no risk of an outdated
 * import if one side is patched in isolation. Kept in lockstep with
 * `heatLevel()` in apps/web/lib/activity-heatmap.ts; the test file
 * enforces both.
 */
function heatLevelForRender(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/**
 * "Less [swatches] More" legend below the grid, all 5 levels shown.
 * Keyboard-focusable so a screen reader can announce each level; the
 * `aria-hidden` swatches are decorative — the label + value carry the
 * meaning.
 */
function HeatmapLegend({ messages }: { messages: Messages }) {
  const levels: Array<{ level: 0 | 1 | 2 | 3 | 4; labelKey: string }> = [
    { level: 0, labelKey: 'article.legendNone' },
    { level: 1, labelKey: 'article.legendLow' },
    { level: 2, labelKey: 'article.legendMid' },
    { level: 3, labelKey: 'article.legendHigh' },
    { level: 4, labelKey: 'article.legendMax' },
  ];
  return (
    <div className="av-heatmap-legend" aria-label={t(messages, 'article.activityLegendLabel')}>
      <span className="av-heatmap-legend-label">{t(messages, 'article.legendLess')}</span>
      {levels.map(({ level, labelKey }) => (
        <span
          key={level}
          className="av-heatmap-cell av-heatmap-cell-legend"
          data-level={level}
          aria-label={t(messages, labelKey)}
        />
      ))}
      <span className="av-heatmap-legend-label">{t(messages, 'article.legendMore')}</span>
    </div>
  );
}

/**
 * "Aug 29" / "Sep 1" form for the tooltip. Locale-independent
 * short-month + day, no weekday (the grid already shows weekday via
 * the left-axis label, repeating it in the tooltip is noise).
 */
function formatShortDate(yyyyMmDd: string): string {
  const parts = yyyyMmDd.split('-').map(Number);
  const m = parts[1]!;
  const d = parts[2]!;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}`;
}
