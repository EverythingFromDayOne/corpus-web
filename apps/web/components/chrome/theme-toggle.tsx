'use client';

import { THEME_COOKIE } from '@/lib/site';

export function ThemeToggle({ label }: { label: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      className="border-graphite bg-surface text-muted inline-flex h-9 w-9 items-center justify-center rounded-md border text-xs"
    >
      <span aria-hidden="true">◐</span>
    </button>
  );
}
