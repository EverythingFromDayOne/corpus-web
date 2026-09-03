'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Thin top-of-viewport progress bar that fires on every internal
 * navigation. Animates 0 → 85% over ~1.6s while a navigation is
 * pending, then snaps to 100% and fades out when the pathname
 * actually changes. Pure CSS keyframes — no external animation lib.
 *
 * Detection is two-pronged:
 *
 * 1. **Pre-navigation**: a delegated `click` listener on `document`
 *    captures clicks on `<a>` elements pointing to internal routes
 *    (filter by `href` starts with `/`, no target=_blank, no modifier
 *    keys, no `data-no-progress` opt-out). When matched, the bar
 *    fires `start()` immediately.
 *
 * 2. **Post-navigation**: `usePathname()` triggers a `useEffect` on
 *    every change. The effect calls `done()` which animates the bar
 *    to 100% then resets.
 *
 * The two phases together give the visual impression of "we know
 * something is loading before it actually starts, and we know when
 * it actually finished." Between them, the CSS keyframe handles the
 * indeterminate fill.
 */
export function NavProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const startRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathRef = useRef<string>(pathname);

  // Clear any pending timers on unmount.
  useEffect(() => {
    return () => {
      if (startRef.current) clearTimeout(startRef.current);
      if (doneRef.current) clearTimeout(doneRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
    };
  }, []);

  // Post-navigation: pathname changed → finish the bar.
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    if (startRef.current) {
      clearTimeout(startRef.current);
      startRef.current = null;
    }
    setProgress(100);
    if (doneRef.current) clearTimeout(doneRef.current);
    doneRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 240);
    resetRef.current = setTimeout(() => {
      setProgress(0);
    }, 480);
  }, [pathname]);

  // Pre-navigation: catch clicks on internal <a> tags before Next
  // processes them. We don't preventDefault — Next still navigates
  // — but we kick off the visual fill so the user sees feedback.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Ignore modified clicks (cmd/ctrl/shift/middle → new tab/window).
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
      // Only internal navigation.
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return;
      }
      if (anchor.hasAttribute('data-no-progress')) return;
      // Same-page anchor? Skip.
      if (href === pathname) return;
      // Start the bar.
      if (startRef.current) clearTimeout(startRef.current);
      if (doneRef.current) clearTimeout(doneRef.current);
      if (resetRef.current) clearTimeout(resetRef.current);
      setVisible(true);
      setProgress(12);
      // Bump a couple of times so the bar feels alive while Next
      // is fetching. Each bump is gated so it never lands on the
      // same frame as the pathname change (which would snap to 100).
      startRef.current = setTimeout(() => setProgress(45), 220);
      startRef.current = setTimeout(() => setProgress(72), 700);
      startRef.current = setTimeout(() => setProgress(85), 1400);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-hidden="true"
      className={`nav-progress${visible ? ' is-active' : ''}`}
      style={{ ['--nav-progress' as string]: `${progress}%` }}
    />
  );
}
