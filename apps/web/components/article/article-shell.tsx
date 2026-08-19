'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ChromeContextValue = {
  desktopOpen: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  closeMobile: () => void;
  percent: number;
  setPercent: (n: number) => void;
};

const ChromeContext = createContext<ChromeContextValue | null>(null);

export function ArticleChromeProvider({ children }: { children: ReactNode }) {
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [percent, setPercent] = useState(0);

  const toggle = useCallback(() => {
    if (window.matchMedia('(width <= 1000px)').matches) {
      setMobileOpen((open) => !open);
    } else {
      setDesktopOpen((open) => !open);
    }
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const value = useMemo(
    () => ({ desktopOpen, mobileOpen, toggle, closeMobile, percent, setPercent }),
    [desktopOpen, mobileOpen, toggle, closeMobile, percent],
  );
  return <ChromeContext.Provider value={value}>{children}</ChromeContext.Provider>;
}

export function useArticleChrome() {
  const ctx = useContext(ChromeContext);
  if (!ctx) throw new Error('ArticleChromeProvider missing');
  return ctx;
}

export function ArticleHeaderToggle({ label }: { label: string }) {
  const ctx = useContext(ChromeContext);
  if (!ctx) return null;
  return (
    <button
      type="button"
      className="av-header-tog"
      aria-label={label}
      aria-expanded={ctx.desktopOpen}
      onClick={ctx.toggle}
    >
      ☰
    </button>
  );
}

export function ArticleProgressBar() {
  const { percent } = useArticleChrome();
  return (
    <div className="av-mbar" aria-hidden="true">
      <svg viewBox="0 0 100 1" preserveAspectRatio="none" className="block h-full w-full">
        <rect className="fill-signal" x="0" y="0" width={percent} height="1" />
      </svg>
    </div>
  );
}

export function ArticleScrim({ label }: { label: string }) {
  const { closeMobile } = useArticleChrome();
  return (
    <button type="button" className="av-scrim" aria-label={label} onClick={closeMobile} />
  );
}

export function sidebarClassName(desktopOpen: boolean, mobileOpen: boolean): string {
  const classes = ['av-sb'];
  if (!desktopOpen) classes.push('collapsed');
  if (mobileOpen) classes.push('mobsb');
  return classes.join(' ');
}
