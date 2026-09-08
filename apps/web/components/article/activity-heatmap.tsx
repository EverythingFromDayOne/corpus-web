'use client';

import { buildHeatmapWeeks, heatLevel, type HeatmapLayout } from '@/lib/activity-heatmap';
import { t, type Messages } from '@/lib/i18n';

/**
 * Streak + ~4-month activity heatmap (18 weeks ≈ 4.15 months),
 * mounted inside a collapsible
 * disclosure (see activity-heatmap-disclosure.tsx). Read from
 * `ProgressStore.activity` only. Never reads `completed` or `seen` — v0
 * progress data has no timestamps to backfill from, and inventing a date
 * for historical activity is not acceptable. An empty `activity` map
 * renders an empty grid: every cell is 0, never a placeholder number.
 *
 * Layout: a GitHub-contribution-shaped 7-row × 18-week grid with month
 * labels across the top (anchored at the first week of each calendar
 * month in the window) and weekday labels down the left (Mon..Sun).
 * Inter-month gutters separate the week columns at every month boundary
 * — the visual rhythm comes from the gutter, the month labels say what
 * the gutter means.
 *
 * Client-only by necessity (localStorage read) — matches the pattern in
 * `sidebars.tsx`'s `useEffect(() => setCompleted(readProgress().completed))`.
 */
export function ActivityHeatmap({
  activity,
  currentStreak,
  maxStreak,
  messages,
}: {
  activity: Record<string, number>;
  currentStreak: number;
  maxStreak: number;
  messages: Messages;
}) {
  const layout = buildHeatmapWeeks(activity);

  return (
    <div
      className="av-heatmap-grid"
      role="img"
      aria-label={t(messages, 'article.activityGridLabel', { current: currentStreak, max: maxStreak })}
    >
      <HeatmapCells layout={layout} messages={messages} />
    </div>
  );
}

/**
 * Renders the 18-week grid: month-label row, weekday-label column, and
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

  // Both the month-label row and the cell body share this EXACT
  // grid-template-columns string. That's the structural fix for
  // sub-pixel drift: round 7 used percentage-based `left` offsets to
  // approximate each week column's position, which is only an
  // approximation once a column-gap enters the layout math (drift grew
  // to ~1.7px at week 10 of 12). Grid tracks aren't fractions of a
  // percentage — reusing the identical template string means the
  // month-label row's column boundaries are pixel-identical to the
  // cell body's, by construction, not by calculation.
  const gridTemplateColumns = `var(--av-heatmap-weekday-col-width) repeat(${weeks.length}, minmax(0px, 1fr))`;

  return (
    <>
      {/* Month label overlay — a grid row using the SAME column template as
          the cell body below, so each label's column is pixel-identical to
          its target week column (see gridTemplateColumns above). The
          `data-week-idx` attribute is test surface used by the verification
          probe to map labels back to their target column. Removing it would
          break the probe silently. See session 180. */}
      <div
        className="av-heatmap-month-labels"
        aria-hidden="true"
        style={{ gridTemplateColumns }}
      >
        {monthLabels.map((m) => (
          <span
            key={m.weekIndex}
            data-week-idx={m.weekIndex}
            className="av-heatmap-month-label"
            style={{ gridColumn: m.weekIndex + 2 }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div
        className="av-heatmap-body"
        style={{ gridTemplateColumns }}
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
      data-level={heatLevel(cell.count)}
      data-tooltip={tooltipText}
      aria-label={ariaLabel}
    />
  );
}

/**
 * "Less [swatches] More" legend below the grid, all 6 levels shown in
 * both themes — the 6-level ladder (round 7, restored in round 9 on top
 * of an 18-week window) is wired to the same six DOM levels in both
 * themes, so no theme-specific swatch hiding is needed. Whether the
 * rendered colours are all distinguishable enough to justify 6 visible
 * steps is a contrast-measurement question, not a "does the DOM have
 * 6 levels" question; see activity-heatmap.css for measured numbers.
 * Keyboard-focusable so a screen reader can announce each level; the
 * `aria-hidden` swatches are decorative — the label + value carry the
 * meaning.
 */
function HeatmapLegend({ messages }: { messages: Messages }) {
  const levels: Array<{ level: 0 | 1 | 2 | 3 | 4 | 5; labelKey: string }> = [
    { level: 0, labelKey: 'article.legendNone' },
    { level: 1, labelKey: 'article.legendLow' },
    { level: 2, labelKey: 'article.legendMidLow' },
    { level: 3, labelKey: 'article.legendMid' },
    { level: 4, labelKey: 'article.legendHigh' },
    { level: 5, labelKey: 'article.legendMax' },
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
