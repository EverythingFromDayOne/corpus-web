'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/site';

type Theme = 'light' | 'dark';

/**
 * Segmented theme toggle (header-redesign session 216, 2026-09-20).
 *
 * Replaces the prior "sun/moon pill" switch whose active dot was a filled
 * orange disc — the loudest single colour on the topbar, drawing attention
 * away from the brand for a control people touch once every few months.
 *
 * New shape: two `<button>` segments side-by-side, monochrome throughout.
 * The ACTIVE segment gets `var(--color-raised)` (a single-step surface lift,
 * still in the cold blue-grey family) — no signal/orange fill. The inactive
 * segment is plain currentColor. Click the inactive one to switch. Both
 * icons are always visible so the user can predict the action.
 *
 * Visual weight: roughly the same as the old pill (~72px wide, 36px tall)
 * so the right-cluster geometry doesn't shift on screens where the theme
 * toggle was already aligned against the sign-in button.
 *
 * A11y:
 *   - `role="group"` with `aria-label` from i18n (`nav.themeToggle`)
 *   - Each segment: `<button aria-pressed>` communicates active state
 *     (not `aria-checked` — that requires a checkbox/radio role or
 *     `role="switch"; aria-pressed fits a toggle-in-group much better).
 *   - Clicking the pressed segment is a no-op (already there).
 *   - Tab moves between segments; both focusable.
 *   - Focus visible via outline-only, no background change.
 *
 * Mobile drawer reuses this component — no second implementation.
 */
export function ThemeToggle({ label }: { label: string }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function set(next: Theme) {
    if (next === theme) return;
    const root = document.documentElement;
    root.setAttribute('data-theme', next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    setTheme(next);
  }

  const isDark = theme === 'dark';

  return (
    <div
      role="group"
      aria-label={label}
      className="theme-toggle-seg inline-flex h-9 shrink-0 items-center rounded-full border border-graphite bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={!isDark}
        aria-label="Light theme"
        onClick={() => set('light')}
        className={`theme-toggle-seg-btn flex size-7 shrink-0 items-center justify-center rounded-full text-[0.95rem] leading-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[color:var(--color-signal)] focus-visible:outline-offset-2 ${
          isDark
            ? 'text-muted hover:text-display'
            : 'bg-raised text-display'
        }`}
      >
        <span aria-hidden="true">☀</span>
      </button>
      <button
        type="button"
        aria-pressed={isDark}
        aria-label="Dark theme"
        onClick={() => set('dark')}
        className={`theme-toggle-seg-btn flex size-7 shrink-0 items-center justify-center rounded-full text-[0.95rem] leading-none transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[color:var(--color-signal)] focus-visible:outline-offset-2 ${
          isDark
            ? 'bg-raised text-display'
            : 'text-muted hover:text-display'
        }`}
      >
        <span aria-hidden="true">☾</span>
      </button>
    </div>
  );
}
