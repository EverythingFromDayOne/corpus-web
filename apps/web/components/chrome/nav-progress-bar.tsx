'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PROGRESS_COMPLETE_FADE_MS,
  PROGRESS_TIMELINE,
  requiresImmediateComplete,
  shouldSuppressForNativeBrowserBar,
  type NavTrigger,
} from '../../lib/nav-progress';

/**
 * Thin top-of-viewport progress bar that fires on every internal
 * navigation. Animates 0 → 85% over ~1.6s while a navigation is
 * pending, then snaps to 100% and fades out when the pathname
 * actually changes. Pure CSS keyframes — no external animation lib.
 *
 * Detection is multi-pronged. The first two are the original click +
 * pathname pair; the other three are the navigation triggers that
 * don't go through a click — browser back/forward (`popstate`),
 * BFCache restore (`pageshow` with `persisted === true`), and
 * tab-switch-back (`visibilitychange` with `hidden === false`).
 *
 * Why the extra three: on browser-back, the click handler doesn't
 * fire (the browser drives the navigation). On BFCache restore, the
 * React tree may be reused from cache, so `usePathname()`'s effect
 * might not re-run even though the URL changed. Without these
 * triggers, the bar gets stuck at 85% — the last fill value before
 * `done()` was supposed to land.
 *
 * Browser suppression: Chrome on Android draws its own progress bar
 * at the top of the screen (added in Chrome 119). When we detect
 * that environment, the bar short-circuits to `null` so the user
 * sees only Chrome's native one.
 *
 * Pure decision helpers live in `apps/web/lib/nav-progress.ts` and
 * are exercised by `apps/web/test/nav-progress.test.ts`.
 */
export function NavProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [suppressed, setSuppressed] = useState(false);

  const startRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPathRef = useRef<string>(pathname);

  const clearAllTimers = useCallback(() => {
    if (startRef.current) {
      clearTimeout(startRef.current);
      startRef.current = null;
    }
    if (doneRef.current) {
      clearTimeout(doneRef.current);
      doneRef.current = null;
    }
    if (resetRef.current) {
      clearTimeout(resetRef.current);
      resetRef.current = null;
    }
  }, []);

  /**
   * Snap the bar to 100% and schedule the fade-out + reset. Safe to
   * call multiple times — each call clears the prior fade/reset and
   * re-arms them. Used by the click→pathname pair AND by popstate /
   * pageshow / visibilitychange triggers.
   */
  const done = useCallback(() => {
    clearAllTimers();
    setProgress(100);
    if (doneRef.current) clearTimeout(doneRef.current);
    doneRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, PROGRESS_COMPLETE_FADE_MS);
    if (resetRef.current) clearTimeout(resetRef.current);
    resetRef.current = setTimeout(() => {
      setProgress(0);
    }, PROGRESS_COMPLETE_FADE_MS * 2);
  }, [clearAllTimers]);

  // Detect Chrome-on-Android once at mount. The native progress bar
  // there would stack with ours, so we render nothing in that case.
  useEffect(() => {
    // navigator.userAgentData is the modern Chromium client-hints API;
    // older mobile Chrome builds lack it and fall through to the UA
    // sniff inside the helper.
    type UADataNavigator = Navigator & {
      userAgentData?: { mobile?: boolean };
    };
    const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
      | UADataNavigator
      | undefined;
    const ua = nav?.userAgent ?? '';
    const mobile = nav?.userAgentData?.mobile;
    if (shouldSuppressForNativeBrowserBar({ userAgent: ua, userAgentDataMobile: mobile ?? null })) {
      setSuppressed(true);
    }
  }, []);

  // Clear any pending timers on unmount.
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Post-navigation: pathname changed → finish the bar. Also covers
  // the case where browser-back drove the pathname change without
  // firing our click handler, as long as React actually re-runs this
  // effect (which it usually does — BFCache reuse is the edge case
  // covered by the pageshow listener below).
  useEffect(() => {
    if (pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;
    done();
  }, [pathname, done]);

  // Pre-navigation: catch clicks on internal <a> tags before Next
  // processes them. We don't preventDefault — Next still navigates
  // — but we kick off the visual fill so the user sees feedback.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest('a');
      if (!anchor) return;
      // Re-derive the click filter inline so this effect stays a
      // single useEffect with no extra deps. The pure helper exists
      // for tests; see apps/web/test/nav-progress.test.ts.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (anchor.target && anchor.target !== '' && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (!href) return;
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
      // Same-page navigation (with or without a hash fragment) is skipped.
      if (href === pathname) return;
      const hashIdx = href.indexOf('#');
      if (hashIdx > 0 && href.slice(0, hashIdx) === pathname) return;
      // Start the bar.
      clearAllTimers();
      setVisible(true);
      setProgress(PROGRESS_TIMELINE[0]!.value);
      startRef.current = setTimeout(
        () => setProgress(PROGRESS_TIMELINE[1]!.value),
        PROGRESS_TIMELINE[1]!.atMs,
      );
      startRef.current = setTimeout(
        () => setProgress(PROGRESS_TIMELINE[2]!.value),
        PROGRESS_TIMELINE[2]!.atMs,
      );
      startRef.current = setTimeout(
        () => setProgress(PROGRESS_TIMELINE[3]!.value),
        PROGRESS_TIMELINE[3]!.atMs,
      );
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [pathname, clearAllTimers]);

  // Browser back / forward. The click handler doesn't fire when the
  // browser drives the navigation itself, so we listen for `popstate`
  // and finish the bar immediately. The pathname effect will ALSO
  // fire on back/forward, but in BFCache-restore cases it might not —
  // and even when it does, the `done()` call here is idempotent.
  useEffect(() => {
    const onPopState = () => {
      const trigger: NavTrigger = { kind: 'popstate' };
      if (requiresImmediateComplete(trigger)) done();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [done]);

  // BFCache restore + initial load. When `event.persisted === true`
  // the page is being restored from the back/forward cache and React
  // may reuse the existing tree, which means the pathname effect
  // above might not re-fire even though the URL changed. Snap the
  // bar to complete on restore.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      const trigger: NavTrigger = { kind: 'pageshow', persisted: !!e.persisted };
      if (requiresImmediateComplete(trigger)) done();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [done]);

  // Tab-switch back. If the user backgrounds the tab mid-animation
  // and returns to find the bar still mid-flight, complete it on
  // visibilitychange.
  useEffect(() => {
    const onVisibilityChange = () => {
      const trigger: NavTrigger = {
        kind: 'visibilitychange',
        hidden: document.visibilityState === 'hidden',
      };
      if (requiresImmediateComplete(trigger)) done();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [done]);

  // Suppression short-circuits the whole component.
  if (suppressed) return null;
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
