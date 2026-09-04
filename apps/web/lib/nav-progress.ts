/**
 * Pure helpers for the top-of-viewport nav progress bar.
 *
 * The bar itself is a React component (`apps/web/components/chrome/nav-progress-bar.tsx`)
 * that owns the timers and the DOM mutation. These helpers are the parts that
 * are decision-only — they answer questions like "is this a click on an internal
 * link?", "does this browser already show a native progress bar?", and "is this
 * a navigation trigger we should treat specially (back/forward vs click)?".
 *
 * They're pulled out of the component so they can be exercised under
 * `node:test` without a DOM, and so the rules are reviewable in one place.
 */

/**
 * Chrome on Android shows its own top-of-screen progress indicator (added
 * in Chrome 119, November 2023). Drawing ours on top produces two bars —
 * ours mid-animation, theirs under it. iOS Safari, Firefox, Samsung
 * Internet, and desktop Chrome never show a native one, so ours is the
 * only signal there.
 *
 * Detection: prefer `navigator.userAgentData.mobile` (the new Chromium
 * client-hints API, available in Chrome 90+). Fall back to UA sniffing
 * for older mobile Chrome builds that lack the hint.
 *
 * Excludes:
 *   - Edge on Android (UA contains "EdgA", distinct from desktop "Edg")
 *   - Opera on Android (UA contains "OPR/" or "Opera")
 *   - Samsung Internet (UA contains "SamsungBrowser")
 *   - iOS Chrome (CriOS — always wrapped in iOS WebKit, never shows
 *     Android's native progress bar)
 *   - Anything not on Android (the native bar is Android-only)
 */
export function shouldSuppressForNativeBrowserBar(input: {
  userAgent?: string;
  userAgentDataMobile?: boolean | null;
} = {}): boolean {
  if (input.userAgentDataMobile === true) {
    // Modern Chromium + mobile confirmed by client hints.
    // Still filter out non-Chrome mobile browsers that share UAData shape.
    const ua = input.userAgent ?? '';
    if (
      /Chrome\//.test(ua) &&
      !/EdgA?\//.test(ua) &&
      !/OPR\/|Opera/.test(ua) &&
      !/SamsungBrowser/.test(ua)
    ) {
      return true;
    }
  }
  const ua = input.userAgent ?? '';
  // UA fallback — Android Chrome only.
  return /Android.*Chrome\/[\d.]+/.test(ua) &&
    !/EdgA?\//.test(ua) &&
    !/OPR\/|Opera/.test(ua) &&
    !/SamsungBrowser/.test(ua);
}

/**
 * Filter for the pre-navigation click listener. Returns true if the click
 * is a normal primary-button click on an internal `<a>` element that we
 * should animate for. Mirrors the runtime guard in
 * `NavProgressBar`'s `useEffect(onClick)` exactly.
 */
export function isInternalNavClick(input: {
  event: {
    defaultPrevented?: boolean;
    button?: number;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    target: EventTarget | null;
  };
  currentPathname: string;
}): boolean {
  const { event: e, currentPathname } = input;
  if (e.defaultPrevented) return false;
  if (e.button !== undefined && e.button !== 0) return false;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;

  const target = e.target as HTMLElement | null;
  if (!target) return false;
  // `target.closest` is defined on every real DOM element; the mock in
  // apps/web/test/nav-progress.test.ts also implements it so this is a
  // straight call.
  const anchor = target.closest('a') as HTMLAnchorElement | null;
  if (!anchor) return false;

  const a = anchor as HTMLAnchorElement;
  if (a.target && a.target !== '' && a.target !== '_self') return false;
  if (a.hasAttribute('download')) return false;
  const href = a.getAttribute('href');
  if (!href) return false;
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#')
  ) {
    return false;
  }
  if (a.hasAttribute('data-no-progress')) return false;
  if (href === currentPathname) return false;
  // Same-page navigation with a hash fragment (e.g. `/en/courses#install`
  // while already at `/en/courses`) — no actual route change.
  const hashIdx = href.indexOf('#');
  if (hashIdx > 0 && href.slice(0, hashIdx) === currentPathname) return false;
  return true;
}

/**
 * The kind of navigation that's currently happening. The bar's completion
 * behaviour differs by trigger — a `popstate` (browser back/forward) and a
 * `pageshow` with `persisted === true` (BFCache restore) must snap to 100 %
 * immediately rather than waiting for the CSS transition to finish, because
 * the page being navigated TO might already be in the BFCache and React's
 * `useEffect` for the pathname change may not fire if the component tree
 * is reused from cache.
 */
export type NavTrigger =
  | { kind: 'click'; href: string }
  | { kind: 'popstate' }
  | { kind: 'pageshow'; persisted: boolean }
  | { kind: 'visibilitychange'; hidden: boolean };

/**
 * Browser-back/forward and BFCache restore produce navigation triggers
 * that don't go through our click handler. The bar must still complete
 * immediately, so this is the predicate the React component's
 * `popstate` + `pageshow` + `visibilitychange` listeners check before
 * calling `done()`.
 */
export function requiresImmediateComplete(trigger: NavTrigger): boolean {
  switch (trigger.kind) {
    case 'popstate':
      // Browser back/forward — page may already be BFCached, the CSS
      // transition from 85 % → 100 % might never fire.
      return true;
    case 'pageshow':
      // BFCache restore only — first pageshow on a fresh load does NOT
      // require immediate completion (no bar is mid-flight there).
      return trigger.persisted;
    case 'visibilitychange':
      // Tab switching back into a long-running page can also leave the
      // bar mid-animation if the page was backgrounded while transitioning.
      return !trigger.hidden;
    case 'click':
      return false;
  }
}

/**
 * Bar fill schedule: idle → 12 % → 45 % → 72 % → 85 %, then snap to
 * 100 % and fade. Exported so the test can assert the timeline without
 * driving `setTimeout` directly.
 */
export const PROGRESS_TIMELINE: ReadonlyArray<{ atMs: number; value: number }> = [
  { atMs: 0, value: 12 },
  { atMs: 220, value: 45 },
  { atMs: 700, value: 72 },
  { atMs: 1400, value: 85 },
];

/**
 * Step values the React component reads off the timeline. Pulled out
 * so the test can pin the shape and so a future change (e.g. longer
 * 85 % dwell) lives in one place.
 */
export const PROGRESS_COMPLETE_FADE_MS = 240;
export const PROGRESS_RESET_AFTER_MS = 480;
