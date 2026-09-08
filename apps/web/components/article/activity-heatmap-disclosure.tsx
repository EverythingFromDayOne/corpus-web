'use client';

import { useEffect, useState } from 'react';
import { readProgress, setHeatmapOpen } from '@/lib/progress';
import { computeCurrentStreak, computeMaxStreak } from '@/lib/activity-heatmap';
import { t, type Messages } from '@/lib/i18n';
import { ActivityHeatmap } from './activity-heatmap';

/**
 * Collapsed-by-default disclosure wrapper around <ActivityHeatmap>.
 *
 * Collapsed (default): a single line — flame icon, current streak
 * number, "day streak · best N", chevron on the right. The whole line
 * is the toggle button.
 *
 * Expanded: the same line with the chevron flipped 180°, then a
 * divider, then the 18-week grid (month labels, weekday labels, cells,
 * legend) rendered by <ActivityHeatmap>.
 *
 * Open/closed state persists in the existing ProgressStore localStorage
 * blob as `heatmapOpen` (see lib/progress.ts) — additive to the v1
 * shape, doesn't touch `version`/`clientId`/`completed`/`seen`/`activity`.
 *
 * Client-only by necessity (localStorage read) — matches the pattern in
 * `sidebars.tsx`'s `useEffect(() => setCompleted(readProgress().completed))`.
 */
export function ActivityHeatmapDisclosure({ messages }: { messages: Messages }) {
  const [activity, setActivity] = useState<Record<string, number> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const store = readProgress();
    setActivity(store.activity);
    setOpen(Boolean(store.heatmapOpen));
  }, []);

  // Render nothing until the client-side read resolves — avoids a
  // server/client markup mismatch and avoids showing a 0-streak flash
  // before the real value is known.
  if (activity === null) return null;

  const currentStreak = computeCurrentStreak(activity);
  const maxStreak = computeMaxStreak(activity);

  function toggle() {
    const next = !open;
    setOpen(next);
    setHeatmapOpen(next);
  }

  return (
    <div className="av-heatmap">
      <button
        type="button"
        className="av-heatmap-toggle"
        aria-expanded={open}
        aria-controls="av-heatmap-panel"
        onClick={toggle}
      >
        <FlameIcon className="av-heatmap-toggle-flame" aria-hidden="true" />
        <span className="av-heatmap-toggle-n">{currentStreak}</span>
        <span className="av-heatmap-toggle-suffix">
          {t(messages, 'article.streakSuffix', { best: maxStreak })}
        </span>
        <ChevronIcon
          className={`av-heatmap-toggle-chevron${open ? ' is-open' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div id="av-heatmap-panel" className="av-heatmap-panel">
          <div className="av-heatmap-divider" aria-hidden="true" />
          <ActivityHeatmap
            activity={activity}
            currentStreak={currentStreak}
            maxStreak={maxStreak}
            messages={messages}
          />
        </div>
      )}
    </div>
  );
}

/** Inline SVG flame — matches the stroke-based icon style already used
 * by `SearchTrigger` (apps/web/components/chrome/search-trigger.tsx):
 * `currentColor` stroke, no fill, 2px stroke width, round caps/joins. */
function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="18"
      height="18"
      className={className}
    >
      <path d="M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 1 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z" />
    </svg>
  );
}

/** Inline SVG chevron, right-facing at rest, rotated 180° via
 * `.is-open` when the panel is expanded (see activity-heatmap.css). */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="14"
      height="14"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
