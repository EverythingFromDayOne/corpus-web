/**
 * Tests for the pure decision helpers behind <NavProgressBar>.
 *
 * The component itself drives `useEffect` + `setTimeout` against the DOM,
 * which `node:test` can't exercise without a renderer. The decisions —
 * "is this a click I should animate for?", "does this browser already
 * have its own progress bar?", "is this navigation trigger one of the
 * ones that requires an immediate snap-to-complete?" — are pulled into
 * `apps/web/lib/nav-progress.ts` so they can be pinned by these tests.
 *
 * Two regression-tracker tests:
 *   - the browser-back/BFCache stuck-at-85% defect from session 168
 *   - the Chrome-Android double-bar conflict from session 168
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PROGRESS_COMPLETE_FADE_MS,
  PROGRESS_TIMELINE,
  isInternalNavClick,
  requiresImmediateComplete,
  shouldSuppressForNativeBrowserBar,
} from '../lib/nav-progress';

test('shouldSuppressForNativeBrowserBar: Chrome on Android is suppressed via UA hint', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      userAgentDataMobile: true,
    }),
    true,
  );
});

test('shouldSuppressForNativeBrowserBar: Desktop Chrome is NOT suppressed', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      userAgentDataMobile: false,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: iOS Safari is NOT suppressed', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: iOS Chrome (CriOS) is NOT suppressed', () => {
  // iOS Chrome is still WebKit under the hood — never shows Android's
  // native progress bar.
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.6045.169 Mobile/15E148 Safari/604.1',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: Edge on Android is NOT suppressed', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 EdgA/119.0.2151.105',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: Samsung Internet is NOT suppressed', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: Opera on Android is NOT suppressed', () => {
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 OPR/105',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: UA-hint false positive is overridden by Chrome UA', () => {
  // Some browsers expose `userAgentData.mobile` (Chromium client hints
  // were shipped to non-Chrome browsers via polyfills). If the UA is
  // not Chrome-family we must NOT suppress.
  assert.equal(
    shouldSuppressForNativeBrowserBar({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Firefox/121.0 Mobile',
      userAgentDataMobile: true,
    }),
    false,
  );
});

test('shouldSuppressForNativeBrowserBar: empty UA never suppresses', () => {
  assert.equal(shouldSuppressForNativeBrowserBar({}), false);
});

test('isInternalNavClick: a plain internal <a> click is matched', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    true,
  );
});

test('isInternalNavClick: cmd-click (new tab) is skipped', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo' });
  assert.equal(
    isInternalNavClick({
      event: {
        defaultPrevented: false,
        button: 0,
        metaKey: true,
        target: target as unknown as EventTarget,
      },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: ctrl-click is skipped', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo' });
  assert.equal(
    isInternalNavClick({
      event: {
        defaultPrevented: false,
        button: 0,
        ctrlKey: true,
        target: target as unknown as EventTarget,
      },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: middle-click is skipped', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 1, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: target=_blank is skipped', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo', target: '_blank' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: download attribute is skipped', () => {
  const target = makeAnchor({ href: '/files/whitepaper.pdf', download: 'whitepaper' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: external https href is skipped', () => {
  const target = makeAnchor({ href: 'https://nextjs.org/docs' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: data-no-progress opt-out is skipped', () => {
  const target = makeAnchor({
    href: '/en/blog/nextjs/foo',
    attrs: { 'data-no-progress': '' },
  });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: same-page hash is skipped', () => {
  const target = makeAnchor({ href: '/en/courses#install' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: same-path href is skipped', () => {
  const target = makeAnchor({ href: '/en/courses' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: click on a non-anchor is skipped', () => {
  const target = makeButton();
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: false, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('isInternalNavClick: defaultPrevented is skipped', () => {
  const target = makeAnchor({ href: '/en/blog/nextjs/foo' });
  assert.equal(
    isInternalNavClick({
      event: { defaultPrevented: true, button: 0, target: target as unknown as EventTarget },
      currentPathname: '/en/courses',
    }),
    false,
  );
});

test('requiresImmediateComplete: popstate always requires immediate completion', () => {
  // The browser-back fix. Without this, the bar can stick at 85 %
  // because the click handler never fires for back-nav and BFCache
  // reuse can prevent the pathname effect from re-running.
  assert.equal(requiresImmediateComplete({ kind: 'popstate' }), true);
});

test('requiresImmediateComplete: pageshow only requires completion when persisted', () => {
  assert.equal(requiresImmediateComplete({ kind: 'pageshow', persisted: true }), true);
  assert.equal(requiresImmediateComplete({ kind: 'pageshow', persisted: false }), false);
});

test('requiresImmediateComplete: visibilitychange only requires completion when becoming visible', () => {
  assert.equal(requiresImmediateComplete({ kind: 'visibilitychange', hidden: true }), false);
  assert.equal(requiresImmediateComplete({ kind: 'visibilitychange', hidden: false }), true);
});

test('requiresImmediateComplete: click does NOT require immediate completion', () => {
  // A normal click goes through the click→pathname pair, which
  // already calls done() when the pathname effect fires. Adding
  // another completion here would fight the 240ms fade timer.
  assert.equal(
    requiresImmediateComplete({ kind: 'click', href: '/en/blog/nextjs/foo' }),
    false,
  );
});

test('progress timeline shape is the same as the React component uses', () => {
  // Pin the four-step ramp + the fade + reset durations. The
  // component reads these by index, so any reorder or insertion
  // without updating the component would silently break the bar.
  assert.deepEqual(PROGRESS_TIMELINE, [
    { atMs: 0, value: 12 },
    { atMs: 220, value: 45 },
    { atMs: 700, value: 72 },
    { atMs: 1400, value: 85 },
  ]);
  assert.ok(PROGRESS_COMPLETE_FADE_MS >= 200, 'fade should be long enough to read');
});

// --- fixtures ---------------------------------------------------------------

/**
 * Build an element that looks like an `<a>` to `target.closest('a')`.
 * No DOM library needed — we set the prototype directly.
 */
function makeAnchor({
  href,
  target,
  download,
  attrs,
}: {
  href: string;
  target?: string;
  download?: string;
  attrs?: Record<string, string>;
}): {
  tag: string;
  closest: (sel: string) => unknown;
  target: string;
  getAttribute: (n: string) => string | null;
  hasAttribute: (n: string) => boolean;
} {
  const node: Record<string, unknown> = {
    tag: 'A',
    // `HTMLAnchorElement.target` is a reflected attribute — accessing the
    // property reads the attribute value. The runtime helper checks
    // `anchor.target`, so the mock must expose it the same way.
    target,
  };
  node.closest = (sel: string) => (sel === 'a' ? node : null);
  node.getAttribute = (n: string) => {
    if (n === 'href') return href;
    if (n === 'target') return target ?? null;
    if (n === 'download') return download ?? null;
    if (attrs && n in attrs) return attrs[n] ?? null;
    return null;
  };
  node.hasAttribute = (n: string) => {
    if (n === 'download') return download !== undefined;
    if (n === 'data-no-progress') return Boolean(attrs?.['data-no-progress'] !== undefined);
    if (n === 'target') return target !== undefined;
    return false;
  };
  return node as ReturnType<typeof makeAnchor>;
}

function makeButton(): { tag: string; closest: (sel: string) => unknown } {
  const node: Record<string, unknown> = { tag: 'BUTTON' };
  node.closest = (sel: string) => (sel === 'a' ? null : node);
  return node as ReturnType<typeof makeButton>;
}
