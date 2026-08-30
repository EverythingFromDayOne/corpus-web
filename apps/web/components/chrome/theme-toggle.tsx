'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/site';

type Theme = 'light' | 'dark';

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" />
      <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" />
      <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="currentColor"
      stroke="none"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle({ label }: { label: string }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next: Theme = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    setTheme(next);
  }

  const isLight = theme === 'light';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={label}
      onClick={toggle}
      className="relative inline-flex h-9 w-[72px] shrink-0 items-center rounded-full border border-graphite bg-surface p-1"
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 left-1 size-7 rounded-full bg-muted transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'translate-x-0' : 'translate-x-9'
        }`}
      />
      <span
        aria-hidden="true"
        className={`relative z-10 flex size-7 items-center justify-center transition-colors duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'text-display' : 'text-muted'
        }`}
      >
        <SunIcon />
      </span>
      <span
        aria-hidden="true"
        className={`relative z-10 flex size-7 items-center justify-center transition-colors duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'text-muted' : 'text-display'
        }`}
      >
        <MoonIcon />
      </span>
    </button>
  );
}
