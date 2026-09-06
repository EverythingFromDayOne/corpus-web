'use client';

import { useEffect, useState } from 'react';
import { readProgress } from '@/lib/progress';
import { computeCurrentStreak, computeMaxStreak, buildHeatmapWeeks } from '@/lib/activity-heatmap';
import { t, type Messages } from '@/lib/i18n';

/**
 * Streak + 12-month activity heatmap, read from `ProgressStore.activity`
 * only. Never reads `completed` or `seen` — v0 progress data has no
 * timestamps to backfill from, and inventing a date for historical
 * activity is not acceptable. An empty `activity` map renders an empty
 * grid: every cell is 0, never a placeholder number.
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
  const weeks = buildHeatmapWeeks(activity);

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
        {weeks.map((week, weekIndex) => (
          <div className="av-heatmap-week" key={weekIndex}>
            {week.map((cell, dayIndex) =>
              cell === null ? (
                <span key={dayIndex} className="av-heatmap-cell av-heatmap-cell-pad" aria-hidden="true" />
              ) : (
                <span
                  key={cell.date}
                  className={`av-heatmap-cell${cell.count > 0 ? ' av-heatmap-cell-active' : ''}`}
                  data-level={heatLevel(cell.count)}
                  title={`${cell.date}: ${cell.count}`}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Buckets a raw count into a 0-4 visual intensity level for the CSS to key off. */
function heatLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}
