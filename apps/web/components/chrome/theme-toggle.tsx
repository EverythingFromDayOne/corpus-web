'use client';

import { useEffect, useState } from 'react';
import { THEME_COOKIE } from '@/lib/site';

type Theme = 'light' | 'dark';

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
      className="border-graphite bg-surface relative inline-flex h-9 w-[72px] shrink-0 items-center gap-0 rounded-full border p-1 transition-colors duration-200 ease-in-out hover:border-[color:var(--color-muted)] focus-visible:border-[color:var(--color-signal)] focus-visible:outline-2 focus-visible:outline-[color:var(--color-signal)] focus-visible:outline-offset-2 motion-reduce:transition-none"
    >
      <span
        aria-hidden="true"
        className={`bg-signal absolute top-1 left-1 size-7 rounded-full transition-transform duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'translate-x-0' : 'translate-x-8'
        }`}
      />
      <span
        aria-hidden="true"
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center text-[0.95rem] leading-none transition-colors duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'text-ink' : 'text-muted'
        }`}
      >
        ☀
      </span>
      <span
        aria-hidden="true"
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center text-[0.95rem] leading-none transition-colors duration-300 ease-in-out motion-reduce:transition-none ${
          isLight ? 'text-muted' : 'text-ink'
        }`}
      >
        ☾
      </span>
    </button>
  );
}
