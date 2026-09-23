#!/usr/bin/env node
/**
 * ui-evidence.mjs — visual-surface-area correctness for the chrome UI
 *
 * Built from PR #194 (feat/header-mobile-drawer, session 215) verification
 * runs. The 6 assertions in this script are the ones that earned their
 * place — every check below corresponds to something real a real user
 * would see, that previous gates did not catch:
 *
 *   1. Backdrop coord-close — real CDP mouse click at off-panel points
 *      closes the drawer. Was a false positive ("Bg ✓") when driven by
 *      element.click(); that synthesized DOM events on the element
 *      regardless of visual occlusion. Now driven by Input.dispatchMouseEvent
 *      { mouseMoved, mousePressed, mouseReleased }. See docs/verify-recipe.md
 *      § "Why a real CDP mouse, not element.click()" and D70.
 *
 *   2. Dialog computed height per viewport — the dialog rect must equal
 *      the viewport (modulo its CSS box), not the header height. PR #194
 *      bug #2 was the dialog collapsed to topbar's 1280×56.59 because
 *      .topbar { backdrop-filter: blur(12px) } creates a containing
 *      block for position: fixed descendants.
 *
 *   3. axe-core at 375 open — catches aria-valid-attr-value and friends
 *      on the drawer root. PR #194 bug #1 was the aria-controls pointing
 *      at a useId internal that the drawer never had.
 *
 *   4. Focus containment — Tab from the close button must not escape the
 *      dialog. 0 escapes across 12 Tab presses is the contract.
 *
 *   5. × close — real coord-click on the close button (not on its
 *      parent) closes the drawer.
 *
 *   6. Esc close — keyboard escape closes the drawer.
 *
 * Plus the **strict-vs-refined occlusion count** from docs/verify-recipe.md
 * § "UI-evidence occlusion exclusion rule". The harness reports both counts
 * always; refined is the verdict, strict is the audit trail. Codifies the
 * 3 noise cases from PR #194: ancestor-handles-click (sign-in wrap),
 * disabled-and-no-click (language placeholder), modal-backdrop.
 *
 * Plus the **reachability assertion** (D76, header-redesign session 217,
 * PR #197 follow-up). At every tested viewport — including the
 * breakpoint-derived b/b+1 pairs read from globals.css — each required
 * action (Sign in OR Sign out, Home, Courses, Articles, search) must
 * have at least one visible, reachable control, in the header OR in the
 * drawer after one open. Catches the failure mode PR #194 could not: a
 * control disappearing silently when its gating rule hides it at one
 * breakpoint but a sibling rule hides it at a different one. The brief's
 * 640px gap — `.topbar-divider` hides at ≤640 while `.topbar-nav` already
 * hid at ≤480 and a third rule (the drawer's account row gates on yet
 * another threshold) — is the canonical instance this assertion is
 * written to catch.
 *
 * Lifecycle:
 *
 *   1. Wait for the target (default http://localhost:3000/en) to return 200
 *      with up to 30s timeout — assumes `pnpm --filter @corpus/web dev`
 *      is already running locally.
 *   2. Spawn headless Chrome with --remote-debugging-port=9222.
 *   3. For each viewport in [375, 768, 1280]: open the page, exercise the
 *      assertions that apply to that viewport (drawer is mobile-only).
 *   4. Kill Chrome, exit 0 if all assertions pass.
 *
 * Usage:
 *
 *   node scripts/ui-evidence.mjs                                    # default: localhost:3000/en
 *   UI_EVIDENCE_URL=http://localhost:3001/en node scripts/ui-evidence.mjs
 *   node scripts/ui-evidence.mjs --json                            # machine-readable output
 *
 * Exit codes:
 *
 *   0 — all assertions passed (refined counts)
 *   1 — one or more assertions failed
 *   2 — setup failure (Chrome failed to bind, target unreachable)
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Constants — earned their place from PR #194 runs
// ---------------------------------------------------------------------------

/**
 * Viewport set: the three canonical widths PLUS every CSS breakpoint b and
 * b+1 read from globals.css. PR #194 was authored against 375/768/1280
 * only and missed the 640px gap (`.topbar-divider` hides at ≤640, the
 * drawer's account row gates on a different rule). "Test every breakpoint
 * b and b+1" catches the off-by-one right at the threshold — a real user
 * path on phone landscape (640–930px). Read from the file so a new
 * `@media (max-width: ...)` rule is tested automatically; hardcoded lists
 * silently drift from the stylesheet.
 */
function readBreakpointsFromCss() {
  const cssPath = join(process.cwd(), 'apps/web/app/globals.css');
  const src = readFileSync(cssPath, 'utf8');
  const set = new Set();
  // Match `(max-width: Npx)` and `(min-width: Npx)` — emit one entry per
  // unique breakpoint value. The b/b+1 pair logic below treats them
  // symmetrically; max-width and min-width both get a +1 test.
  for (const m of src.matchAll(/\((max|min)-width:\s*(\d+)px\)/g)) {
    set.add(parseInt(m[2], 10));
  }
  return [...set].sort((a, b) => a - b);
}

const BREAKPOINTS_PX = readBreakpointsFromCss();
// Pair each breakpoint with its successor (b+1). The harness asserts at
// every viewport in VIEWPORTS; for each breakpoint-derived viewport we
// record the breakpoint context so a failure reads as "fails at 641px
// (just above the 640 max-width rule)".
const BREAKPOINT_VIEWPORTS = [];
for (const bp of BREAKPOINTS_PX) {
  // b: included — the rule fires at this width
  BREAKPOINT_VIEWPORTS.push({ width: bp, height: 812, label: `bp-${bp}`, bp });
  // b+1: excluded — should no longer apply
  BREAKPOINT_VIEWPORTS.push({ width: bp + 1, height: 812, label: `bp-${bp}+1`, bp });
}

const CANONICAL_VIEWPORTS = [
  // height matches the device the viewport represents (iPhone / iPad /
  // desktop). The dialog-height assertion uses vp.height so the test is
  // honest about the geometry it claims.
  { width: 375,  height: 812,  label: 'mobile',  drawerExpected: true  }, // iPhone-class
  { width: 768,  height: 1024, label: 'tablet',  drawerExpected: false }, // iPad portrait — drawer trigger display:none ≥ 640
  { width: 1280, height: 800,  label: 'desktop', drawerExpected: false },
];

const VIEWPORTS = [
  ...CANONICAL_VIEWPORTS,
  // Breakpoint-derived pairs override drawerExpected with the trigger's
  // actual rule (display: none ≥ 640), regardless of label.
  ...BREAKPOINT_VIEWPORTS.map((bp) => ({
    ...bp,
    drawerExpected: bp.width < 641, // .mobile-nav-trigger: display: inline-flex ≤ 640
  })),
];

const BACKDROP_CLICK_POINTS = [
  { x: 10, y: 400, label: 'left-strip-mid'   },
  { x: 10, y: 600, label: 'left-strip-lower' },
];

const FOCUS_TAB_PRESSES = 12;

const VENDOR_SELECTORS = [
  'nextjs-portal',
  '[data-nextjs-toast]',
  '[data-next-mark]',
  '__next-build-watcher',
  'vercel-live-feedback',
  'vercel-toolbar',
];

// ---------------------------------------------------------------------------
// CDP helpers — zero new deps. Node 22+ has globalThis.WebSocket.
// ---------------------------------------------------------------------------

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PORT = 9222;

function spawnChrome() {
  const userDataDir = `/tmp/ui-evidence-chrome-${Date.now()}`;
  const proc = spawn(CHROME_BIN, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=' + CHROME_PORT,
    '--user-data-dir=' + userDataDir,
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  proc.userDataDir = userDataDir;
  return proc;
}

async function waitForChrome(retries = 50) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(100);
  }
  throw new Error(`Chrome failed to bind to :${CHROME_PORT} after ${retries * 100}ms`);
}

async function openTab(targetUrl) {
  const r = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?` + Date.now(), {
    method: 'PUT',
  });
  if (!r.ok) throw new Error('Failed to open new tab: HTTP ' + r.status);
  const tab = await r.json();
  const ws = new globalThis.WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  const pending = new Map();
  let nextId = 1;
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve: r, reject: j } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) j(new Error(msg.error.message));
      else r(msg.result);
    }
  });
  function send(method, params = {}) {
    const id = nextId++;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  return { ws, tab, send };
}

async function setViewport(cdp, { width, height, deviceScaleFactor = 1 }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor, mobile: width < 768,
  });
}

async function navigate(cdp, url) {
  await cdp.send('Page.enable');
  const navP = new Promise((resolve) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Page.loadEventFired') {
        cdp.ws.removeEventListener('message', handler);
        resolve();
      }
    };
    cdp.ws.addEventListener('message', handler);
  });
  await cdp.send('Page.navigate', { url });
  await navP;
  // Hydration window — React mounts fibers after load
  await sleep(500);
}

async function evalInPage(cdp, expression) {
  const { result, exceptionDetails } = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (exceptionDetails) {
    throw new Error('Page eval exception: ' + (exceptionDetails.exception?.description || exceptionDetails.text));
  }
  return result.value;
}

async function realClick(cdp, x, y) {
  // CDP Input.dispatchMouseEvent — three events so the browser exercises
  // the same pointermove → pointerdown → pointerup → click path it would
  // for a real mouse. This is the assertion shape change from PR #194's
  // first run (which used element.click() and got a false "Bg ✓").
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved',     x, y });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed',   x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased',  x, y, button: 'left', clickCount: 1 });
}

async function loadAxe(cdp) {
  // Inject axe-core 4.10.2 inline (no network — zero credential surface).
  // Source: https://cdn.jsdelivr.net/npm/axe-core@4.10.2/axe.min.js
  // Vendored inline to keep the script self-contained per the no-credential
  // repeatable-path directive.
  const SCRIPT_DIR = new URL('.', import.meta.url);
  const axeSource = await import('node:fs').then(fs =>
    fs.promises.readFile(new URL('./lib/axe-core.min.js', SCRIPT_DIR), 'utf8').catch(() => null)
  );
  if (!axeSource) {
    console.warn('[ui-evidence] axe-core source not vendored at scripts/lib/axe-core.min.js; axe assertion skipped.');
    return false;
  }
  await cdp.send('Runtime.evaluate', { expression: axeSource });
  return true;
}

// ---------------------------------------------------------------------------
// Assertion probes — return values shaped for direct JSON emission
// ---------------------------------------------------------------------------

async function probeDialog(cdp) {
  return evalInPage(cdp, `(() => {
    // Dialog uses aria-labelledby (pointing at the title id), not aria-label.
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return { open: false, reason: 'no dialog in DOM (closed state)' };
    const isOpen = dialog.getAttribute('aria-hidden') !== 'true'
      && document.body.contains(dialog);
    const rect = dialog.getBoundingClientRect();
    return {
      open: isOpen,
      id: dialog.id || null,
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      labelledby: dialog.getAttribute('aria-labelledby'),
      role: dialog.getAttribute('role'),
    };
  })()`);
}

async function probeAriaControls(cdp) {
  return evalInPage(cdp, `(() => {
    const trigger = document.querySelector('[aria-controls]');
    if (!trigger) return { ok: false, reason: 'no aria-controls trigger in DOM' };
    const id = trigger.getAttribute('aria-controls');
    const target = document.getElementById(id);
    return {
      ok: !!target,
      controls: id,
      resolvesTo: target?.tagName?.toLowerCase() ?? null,
    };
  })()`);
}

async function openDrawer(cdp) {
  // State-aware — only click the trigger if the drawer isn't already open.
  const initial = await probeDialog(cdp);
  if (initial.open) return { opened: 'already' };
  const opened = await evalInPage(cdp, `(() => {
    const trigger = document.querySelector('.mobile-nav-trigger');
    if (!trigger) return false;
    trigger.click();
    return true;
  })()`);
  if (!opened) return { opened: 'no-trigger' };
  await sleep(300);
  const post = await probeDialog(cdp);
  return { opened: 'clicked', isOpen: post.open };
}

// Unconditionally closes then opens. Used for assertions that need a known
// drawer-mounted state regardless of what prior assertions left behind.
async function forceOpenDrawer(cdp) {
  await closeDrawerIfOpen(cdp);
  return openDrawer(cdp);
}

async function closeDrawerIfOpen(cdp) {
  const d = await probeDialog(cdp);
  if (!d.open) return;
  await evalInPage(cdp, `(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog && dialog.getAttribute('aria-hidden') !== 'true') {
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(esc);
    }
  })()`);
  await sleep(200);
}

async function assertBackdropCoordClose(cdp, point) {
  await openDrawer(cdp);
  const before = await probeDialog(cdp);
  if (!before.open) return { point: point.label, closed: false, reason: 'drawer failed to open' };
  await realClick(cdp, point.x, point.y);
  await sleep(300);
  const after = await probeDialog(cdp);
  return { point: point.label, closed: !after.open };
}

async function assertXButton(cdp) {
  await openDrawer(cdp);
  const xBox = await evalInPage(cdp, `(() => {
    const x = document.querySelector('.mobile-nav-drawer-close');
    if (!x) return null;
    const r = x.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!xBox) return { closed: false, reason: 'no .mobile-nav-drawer-close found' };
  await realClick(cdp, xBox.x, xBox.y);
  await sleep(300);
  const after = await probeDialog(cdp);
  return { closed: !after.open, clickedAt: xBox };
}

async function assertEscClose(cdp) {
  await openDrawer(cdp);
  await evalInPage(cdp, `(() => {
    const dialog = document.querySelector('[role="dialog"]');
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    dialog?.dispatchEvent(ev);
    document.dispatchEvent(ev);
  })()`);
  await sleep(300);
  const after = await probeDialog(cdp);
  return { closed: !after.open };
}

async function assertFocusContainment(cdp, tabs) {
  await openDrawer(cdp);
  // Focus the close button first so Tab cycles inside the dialog.
  await evalInPage(cdp, `document.querySelector('.mobile-nav-drawer-close')?.focus()`);
  await sleep(100);
  const trail = [];
  for (let i = 0; i < tabs; i++) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp',   key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await sleep(50);
    // Capture the focused element's selector before/after the trap
    // reset, so the report can pin the change with a known cause
    // (Huy's question 2026-09-22: "what element did focus escape
    // to?"). Inside/outside drawer is computed from the dialog
    // ancestor. The hypothesis is left empty here; the report
    // generates one from the data.
    const focusState = await evalInPage(cdp, `(() => {
      const a = document.activeElement;
      if (!a) return null;
      const sel = (() => {
        if (a.id) return '#' + a.id;
        const cls = a.className && typeof a.className === 'string' ? '.' + a.className.trim().split(/\\s+/).slice(0,2).join('.') : '';
        return a.tagName.toLowerCase() + cls;
      })();
      const d = document.querySelector('[role="dialog"]');
      return { selector: sel, tag: a.tagName, insideDrawer: d?.contains(a) ?? false };
    })()`);
    const inside = focusState?.insideDrawer ?? false;
    trail.push({ idx: i, ...focusState, insideDrawer: inside });
  }
  const escapes = trail.filter(x => !x.insideDrawer).length;
  return { presses: tabs, escapes, trail };
}

async function runAxe(cdp) {
  const loaded = await loadAxe(cdp);
  if (!loaded) return { skipped: true };
  const result = await evalInPage(cdp, `(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
    }));
  })()`);
  return { skipped: false, violations: result };
}

async function probeOcclusion(cdp) {
  return evalInPage(cdp, `(() => {
    const VENDOR = ${JSON.stringify(VENDOR_SELECTORS)};
    const isVendor = (el) => {
      if (!el) return false;
      if (el.id && VENDOR.some(s => el.id === s || el.id.startsWith(s.replace(/[[\\]'"=]/g, '')))) return true;
      try {
        if (el.closest(VENDOR.join(','))) return true;
      } catch {}
      return false;
    };
    const isNonInteractive = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.pointerEvents === 'none') return true;
      if (el.disabled) return true;
      if (el.getAttribute('aria-disabled') === 'true') return true;
      return false;
    };
    const points = [
      { x: 10, y: 400, label: 'backdrop-left-mid' },
      { x: 10, y: 600, label: 'backdrop-left-lower' },
    ];
    const strict = [];
    const refined = [];
    for (const pt of points) {
      const seen = document.elementFromPoint(pt.x, pt.y);
      if (isVendor(seen)) continue;  // vendor excluded BEFORE the check
      const button = document.elementFromPoint(pt.x, pt.y)?.closest('button, a, [role="button"]');
      const target = button || document.elementFromPoint(pt.x, pt.y);
      // What we WANT to receive the click is the backdrop close button.
      const backdrop = document.querySelector('.mobile-nav-drawer-backdrop');
      if (!backdrop) continue;
      const strictFail = backdrop !== target && !backdrop.contains(target);
      if (strictFail) strict.push({ point: pt.label, expected: 'backdrop', returned: target?.tagName?.toLowerCase() });
      // Refined: an ancestor that handles the click is OK; non-interactive
      // target is OK; modal backdrop pattern (sibling coverage at strict
      // center) is OK when the backdrop's own coord-click works.
      const isAncestor = backdrop.contains(target);
      const isNonInt = isNonInteractive(target);
      if (!(isAncestor || isNonInt)) {
        refined.push({ point: pt.label, expected: 'backdrop', returned: target?.tagName?.toLowerCase() });
      }
    }
    return { strict, refined };
  })()`);
}

// ---------------------------------------------------------------------------
// Reachability probe (D76) — required-action coverage per viewport
// ---------------------------------------------------------------------------
//
// For each viewport, every required action must have at least one visible,
// reachable control, in either the desktop topbar OR (when present) the
// mobile drawer after one open. "Visible, reachable" means: an element in
// the DOM, not display:none / visibility:hidden, with a non-zero rect that
// intersects the viewport, that is a control (button/link/input) — not
// just any descendant. A control counts even if it requires opening the
// drawer; the assertion is about reachability, not about both surfaces
// showing the control at the same time.
//
// Required actions:
//   - account: Sign in (signed-out) OR Sign out / account menu (signed-in)
//   - home: link/button to /[locale]
//   - courses: link/button to /[locale]/courses
//   - articles: link/button to /[locale]/blog
//   - search: a search trigger (topbar SearchTrigger or drawer search action)
//
// Mode 'signed-out' relies on /me returning 401/null in the page context
// (the page's own client fetch — we don't spoof auth state from the
// outside). Mode 'me-blocked' sets up Fetch.enable request interception
// to fail /me with a network error, exercising the failure-path branch
// in `sign-in-context.tsx`'s `fetchMe` (catch → return null → state flips
// to signed-out). The brief requires both: signed-out should show Sign
// in, and a blocked /me must NOT leave the page in a pending state.

async function withMeBlocked(cdp, fn) {
  // Fetch.enable with no patterns + a requestPaused handler that fails
  // any /me request with net::ERR_INTERCEPTED. Done for the duration of
  // `fn` and torn down in `finally`. Returns whatever `fn` returns.
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '*/me', requestStage: 'Request' }],
  });
  // Track per-request handlers via a closure list and a unique handler.
  // CDP delivers `Fetch.requestPaused` for every intercepted request; we
  // respond with `failRequest` and then continue waiting for the page's
  // own handler to call `Fetch.continueRequest` for non-/me requests.
  const handler = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method !== 'Fetch.requestPaused') return;
    const params = msg.params;
    if (params.request.url.endsWith('/me')) {
      // fire-and-forget; respond async without awaiting so the listener
      // returns promptly.
      cdp.send('Fetch.failRequest', {
        requestId: params.requestId,
        errorReason: 'Aborted',
      }).catch(() => {});
    } else {
      cdp.send('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {});
    }
  };
  cdp.ws.addEventListener('message', handler);
  try {
    return await fn();
  } finally {
    cdp.ws.removeEventListener('message', handler);
    await cdp.send('Fetch.disable').catch(() => {});
  }
}

// Synthetic /me payload for the signed-in CDP mode. Mirrors the
// `MeResponse` interface in apps/web/components/chrome/sign-in-context.tsx
// (email, name, avatarUrl, locale — all nullable). A non-null `me`
// flips meState from `loading`/`signed-out` to `signed-in` per the
// state-transition logic at sign-in-context.tsx:200-203.
//
// No real auth — Huy explicitly asked for a synthetic user with no
// account and no new dependency. The shape is verified by the
// signedInRender sanity check; any mismatch is surfaced as a sanity
// failure rather than silently producing a wrong signed-in render.
const SYNTHETIC_ME_PAYLOAD = {
  email: 'synthetic@example.invalid',
  name: 'Synthetic User',
  avatarUrl: null,
  locale: 'en',
};

async function withMeFulfilled(cdp, fn) {
  // Fetch.enable intercepts /me; instead of failRequest, respond with
  // fulfillRequest carrying a synthetic user JSON. Same setup as
  // withMeBlocked — re-enable per page reload, tear down in `finally`.
  //
  // URL pattern: wildcard so it matches whatever host the dev server
  // is configured for. The page hits `${apiUrl}/me` per D55; the
  // actual `apiUrl` is whatever `NEXT_PUBLIC_API_URL` resolves to in
  // the current dev process.
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '*/me', requestStage: 'Request' }],
  });
  const body = Buffer.from(JSON.stringify(SYNTHETIC_ME_PAYLOAD), 'utf8').toString('base64');
  const handler = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method !== 'Fetch.requestPaused') return;
    const params = msg.params;
    if (params.request.url.endsWith('/me')) {
      cdp.send('Fetch.fulfillRequest', {
        requestId: params.requestId,
        responseCode: 200,
        responseHeaders: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Cache-Control', value: 'no-store' },
        ],
        body,
      }).catch(() => {});
    }
  };
  cdp.ws.addEventListener('message', handler);
  try {
    return await fn();
  } finally {
    cdp.ws.removeEventListener('message', handler);
    await cdp.send('Fetch.disable').catch(() => {});
  }
}

async function assertReachability(cdp, vp, opts) {
  const mode = opts.mode; // 'signed-out' | 'me-blocked'
  // Open the drawer once on mobile so the drawer's controls are in the
  // rendered DOM (MobileNavDrawer is conditionally mounted on `open`).
  if (vp.drawerExpected) {
    await forceOpenDrawer(cdp);
  }
  const result = await evalInPage(cdp, `(async () => {
    // Strategy: scan visible, non-disabled controls in BOTH the desktop
    // topbar (.topbar) and the mobile drawer (.mobile-nav-drawer-panel)
    // when present. For each required action, scan the controls' href
    // and accessible name; a match counts as covered.
    //
    // isVisible(el): bounding rect intersects the viewport, no
    // display:none / visibility:hidden / aria-hidden on the element or
    // its ancestors, opacity > 0. Pointer-events: none is excluded by
    // the visibility heuristic only for the element itself — a control
    // whose own pointer-events:none is reachable (e.g. a label's child
    // input) is fine if the input itself is visible.
    function rectsIntersectViewport(r) {
      return r.width > 0 && r.height > 0
        && r.bottom > 0 && r.right > 0
        && r.left < window.innerWidth && r.top < window.innerHeight;
    }
    function isVisible(el) {
      if (!(el instanceof Element)) return false;
      if (el.closest('[aria-hidden="true"]')) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return rectsIntersectViewport(r);
    }
    function isReachable(el) {
      // A control is reachable if it's an interactive element (button,
      // anchor, summary, input, [role=button/menuitem/link]) OR a
      // descendant of one that delegates its activation. The assertion
      // is about user reachability, not platform semantics.
      if (!(el instanceof Element)) return false;
      if (el.disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      if (el instanceof HTMLButtonElement) return true;
      if (el instanceof HTMLAnchorElement) return !!el.getAttribute('href');
      if (el instanceof HTMLInputElement) return el.type !== 'hidden';
      if (el instanceof HTMLDetailsElement || el.tagName === 'SUMMARY') return true;
      const role = el.getAttribute('role');
      if (role && /^(button|link|menuitem|checkbox|radio|tab)$/.test(role)) return true;
      return false;
    }
    function accessibleName(el) {
      // Mirrors the platform's accessible-name computation closely enough
      // for our labels: aria-label, aria-labelledby (single id), text
      // content, the wrapping <summary>'s label, the alt of an inner
      // <img>, or the form-control's value/placeholder.
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const t = document.getElementById(labelledBy);
        if (t && t.textContent) return t.textContent.trim();
      }
      if (el instanceof HTMLInputElement) {
        return (el.placeholder || el.value || '').trim();
      }
      // Summary / button / link — text content, plus the alt of any
      // inner <img>.
      const imgs = el.querySelectorAll('img[alt]');
      const parts = [];
      for (const img of imgs) parts.push(img.getAttribute('alt') || '');
      parts.push(el.textContent || '');
      return parts.join(' ').trim();
    }
    function hrefOf(el) {
      if (el instanceof HTMLAnchorElement) return el.getAttribute('href') || '';
      if (el instanceof HTMLButtonElement) {
        // Buttons don't have href, but a form button might submit to one.
        const form = el.form;
        return form ? form.getAttribute('action') || '' : '';
      }
      // A descendant link inside a wrapping label/control → walk up to
      // the nearest anchor. Useful for the drawer's account row + the
      // topbar nav, where the visible <a> is the wrapping element.
      const wrap = el.closest('a[href]');
      return wrap ? wrap.getAttribute('href') || '' : '';
    }
    // Determine the locale-prefixed root so href matching isn't fooled
    // by routes in other locales.
    const pathLocale = (location.pathname.split('/')[1] || 'en');
    const homeHref = '/' + pathLocale;
    const coursesHref = homeHref + '/courses';
    const articlesHref = homeHref + '/blog';

    // Gather controls across the topbar and the drawer panel.
    const surfaces = [
      document.querySelector('.topbar'),
      document.querySelector('.mobile-nav-drawer-panel'),
    ].filter(Boolean);
    const controls = [];
    for (const surface of surfaces) {
      // All interactive descendants + the surface itself if interactive.
      const sel = 'a[href], button, summary, input:not([type=hidden]), [role=button], [role=link], [role=menuitem]';
      const found = surface.querySelectorAll(sel);
      for (const el of found) {
        if (!isVisible(el) || !isReachable(el)) continue;
        controls.push({
          tag: el.tagName.toLowerCase(),
          href: hrefOf(el),
          name: accessibleName(el),
          rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
          surface: surface.classList.contains('topbar') ? 'topbar' : 'drawer',
        });
      }
    }

    // Per-action coverage check.
    function matchesHome(c) {
      return c.href === homeHref || c.href === homeHref + '/';
    }
    function matchesCourses(c) {
      return c.href === coursesHref || c.href.startsWith(coursesHref + '/') || c.href.startsWith(coursesHref + '?') || c.href.startsWith(coursesHref + '#');
    }
    function matchesArticles(c) {
      return c.href === articlesHref || c.href.startsWith(articlesHref + '/') || c.href.startsWith(articlesHref + '?') || c.href.startsWith(articlesHref + '#');
    }
    function matchesSearch(c) {
      // The topbar search trigger has class srch-trigger; the
      // drawer's action button carries an aria-label containing
      // "Search". The matcher must recognize both, so we accept any
      // button whose accessible name contains the search vocabulary OR
      // any element whose own class list contains srch-trigger. We
      // can't read the live class from this codepath (the matched
      // element's classList isn't on the JSON summary), so fall back
      // to the heuristic on tag + name. The drawer trigger's name
      // starts with "Open search"; the topbar's aria-label is "Open
      // search" — both lowercase-includes 'search'.
      const name = c.name.toLowerCase();
      if (name.includes('search') || name.includes('⌘k') || name.includes('open search')) {
        return true;
      }
      return false;
    }
    function matchesAccount(c) {
      const name = c.name.toLowerCase();
      // The brief is explicit: Sign in OR Sign out — depending on
      // auth state. The assertion accepts either; a UI that renders
      // NEITHER is the failure mode.
      const r = /sign[ \t]*in|sign[ \t]*out|account|account menu/i.test(name);
      return r;
    }

    const coverage = {
      account: controls.filter(matchesAccount).slice(0, 3),
      home:    controls.filter(matchesHome).slice(0, 3),
      courses: controls.filter(matchesCourses).slice(0, 3),
      articles:controls.filter(matchesArticles).slice(0, 3),
      search:  controls.filter(matchesSearch).slice(0, 3),
    };

    function pick(c) {
      return c.map((x) => ({
        surface: x.surface,
        tag: x.tag,
        href: x.href,
        name: x.name.slice(0, 80),
        rect: x.rect,
      }));
    }

    return {
      mode: ${JSON.stringify(mode)},
      viewport: { w: window.innerWidth, h: window.innerHeight },
      controlsTotal: controls.length,
      coverage: {
        account: pick(coverage.account),
        home:    pick(coverage.home),
        courses: pick(coverage.courses),
        articles:pick(coverage.articles),
        search:  pick(coverage.search),
      },
      missing: ['account','home','courses','articles','search'].filter((k) => coverage[k].length === 0),
    };
  })()`);
  // Close the drawer we opened so the next probe doesn't see a stale
  // mounted state.
  if (vp.drawerExpected) {
    await closeDrawerIfOpen(cdp);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

// Sanity check for the signed-in CDP mode. Verifies the synthetic
// /me response body actually flipped sign-in-context to the
// signed-in state. Without this, `reachability.signedIn` could pass
// for the wrong reason (the page still renders "Sign in" because
// the synthetic payload never reached the page, but the harness
// would mark it OK because the regex matches "Sign in").
//
// What we expect when signed-in is wired correctly:
//   - `.topbar .user-menu` (or `<details class="user-menu">`) renders
//   - `.topbar .topbar-signin` is absent
//   - `.mobile-nav-drawer-signin-wrap` is absent (drawer shows the
//     signed-in account row + Sign out link, not the SignInButton)
async function assertSignedInRender(cdp) {
  await sleep(200);
  const probe = await evalInPage(cdp, `(() => {
    const topbarUserMenu = !!document.querySelector('.topbar .user-menu, .topbar [class*="user-menu"]');
    const topbarSignin = !!document.querySelector('.topbar .topbar-signin');
    const drawerSignin = !!document.querySelector('.mobile-nav-drawer-signin-wrap .topbar-signin, .mobile-nav-drawer .topbar-signin');
    const drawerAccountRow = !!document.querySelector('.mobile-nav-drawer-account');
    const drawerSignout = !!document.querySelector('.mobile-nav-drawer-action--signout');
    return {
      userMenuPresent: topbarUserMenu,
      topbarSigninPresent: topbarSignin,
      drawerSigninPresent: drawerSignin,
      drawerAccountRowPresent: drawerAccountRow,
      drawerSignoutPresent: drawerSignout,
    };
  })()`);
  const ok = probe.userMenuPresent && !probe.topbarSigninPresent && !probe.drawerSigninPresent;
  return { ok, ...probe };
}

const TARGET = process.env.UI_EVIDENCE_URL || 'http://localhost:3000/en';
const JSON_OUT = process.argv.includes('--json');

async function waitForTarget(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.ok || (r.status >= 200 && r.status < 400)) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Target ${url} did not return 200 within ${timeoutMs}ms`);
}

async function main() {
  await waitForTarget(TARGET);
  const chrome = spawnChrome();
  let exitCode = 0;
  const results = { url: TARGET, viewports: [] };
  try {
    await waitForChrome();
    const { send: cdpSend, ws, tab } = await openTab(TARGET);
    const cdp = { send: cdpSend, ws };
    try {
      for (const vp of VIEWPORTS) {
        await setViewport(cdp, vp);
        await navigate(cdp, TARGET);
        await closeDrawerIfOpen(cdp);
        const vpResult = { viewport: vp, assertions: {} };

        // Reachability probe (D76). Runs FIRST so the result is the
        // baseline for this viewport, untouched by the drawer-probe dance
        // that follows. Two modes:
        //   - 'signed-out': no interception — page loads with no /me
        //     cookie → auth state resolves to signed-out. Asserts Sign
        //     in (or any account-control surface) is reachable.
        //   - 'me-blocked': Fetch.enable intercepts /me and returns
        //     Aborted — exercises the failure path in
        //     sign-in-context.tsx (D69 closure surface). Asserts the
        //     page does NOT get stuck in a pending state and the
        //     account control resolves to signed-out anyway.
        // Both modes apply to every viewport (drawer and non-drawer).
        // The brief is explicit: "missing → fail".
        vpResult.assertions.reachability = {
          signedOut: await assertReachability(cdp, vp, { mode: 'signed-out' }),
        };
        await withMeBlocked(cdp, async () => {
          // Re-navigate so the page reloads with interception active;
          // the prior /me call already resolved and the state is sticky
          // — we need a fresh attempt whose /me is intercepted.
          await navigate(cdp, TARGET);
          await sleep(150);
          vpResult.assertions.reachability.meBlocked = await assertReachability(cdp, vp, { mode: 'me-blocked' });
        });
        await withMeFulfilled(cdp, async () => {
          // Same pattern as meBlocked: a fresh navigation inside the
          // interception window so the synthetic /me response is the
          // first thing sign-in-context sees.
          await navigate(cdp, TARGET);
          await sleep(150);
          vpResult.assertions.reachability.signedIn = await assertReachability(cdp, vp, { mode: 'signed-in' });
          vpResult.assertions.signedInRender = await assertSignedInRender(cdp);
        });
        // Re-navigate to drop any interception residue before the
        // drawer-probe dance.
        await navigate(cdp, TARGET);
        await closeDrawerIfOpen(cdp);

        if (vp.drawerExpected) {
          // probeAriaControls must run AFTER opening the drawer — the dialog is
          // conditionally rendered (`mounted && open`), so aria-controls targets
          // a non-existent node until the drawer mounts.
          const ariaControls = await probeAriaControls(cdp); // initial probe (likely no target)
          vpResult.assertions.ariaControlsInitial = ariaControls;
          const dialogInitial = await probeDialog(cdp);
          vpResult.assertions.dialogInitial = dialogInitial;
          const backdropResults = [];
          for (const pt of BACKDROP_CLICK_POINTS) {
            backdropResults.push(await assertBackdropCoordClose(cdp, pt));
            await openDrawer(cdp); // re-open for next iteration
          }
          vpResult.assertions.backdropCoordClose = backdropResults;
          vpResult.assertions.xButton = await assertXButton(cdp);
          vpResult.assertions.escClose = await assertEscClose(cdp);
          vpResult.assertions.focusContainment = await assertFocusContainment(cdp, FOCUS_TAB_PRESSES);
          // aria-controls must point at a real node once the drawer is open.
          vpResult.assertions.ariaControlsAtOpen = await probeAriaControls(cdp);
          // Dialog rect at this viewport — the bug-class-catching assertion.
          // Use a fresh force-open to guarantee the dialog is mounted for the
          // rect probe, even if a prior assertion left it closed.
          await forceOpenDrawer(cdp);
          const dForRect = await probeDialog(cdp);
          vpResult.assertions.dialogAtOpen = dForRect.open ? {
            rect: dForRect.rect,
            heightMatchesViewport: Math.abs(dForRect.rect.h - vp.height) < 2,
          } : { open: false, rect: null, heightMatchesViewport: false };
          vpResult.assertions.axeAtOpen = await runAxe(cdp);
          vpResult.assertions.occlusion = await probeOcclusion(cdp);
        } else {
          vpResult.assertions.skipped = 'drawer is mobile-only; trigger hidden ≥ 640px';
        }
        results.viewports.push(vpResult);
      }
    } finally {
      ws.close();
      try { await fetch(`http://127.0.0.1:${CHROME_PORT}/json/close/` + tab.id); } catch {}
    }
  } catch (e) {
    console.error('[ui-evidence] Fatal:', e.message);
    exitCode = 2;
  } finally {
    chrome.kill('SIGKILL');
    try { await sleep(100); } catch {}
    // Best-effort cleanup of the user-data-dir
    try {
      const fs = await import('node:fs/promises');
      await fs.rm(chrome.userDataDir, { recursive: true, force: true });
    } catch {}
  }

  // Verdict — refined is the gate; strict is the audit trail
  for (const vp of results.viewports) {
    const a = vp.assertions;
    if (process.env.UI_EVIDENCE_VERBOSE) {
      console.error('[verdict] viewport', vp.viewport.width + 'x' + vp.viewport.height, 'a=', Object.keys(a));
    }
    // Reachability (D76) — applies to EVERY viewport, not just drawer.
    // For each mode (signed-out, me-blocked), every required action must
    // be reachable from at least one visible, reachable control in
    // header or drawer. Missing → fail.
    if (a.reachability) {
      const fail = (msg) => { console.error('[verdict] FAIL:', vp.viewport.width + 'x' + vp.viewport.height, msg); exitCode = 1; };
      for (const mode of ['signedOut', 'meBlocked', 'signedIn']) {
        const r = a.reachability[mode];
        if (!r) {
          fail(`reachability ${mode}: not asserted`);
          continue;
        }
        if (r.missing && r.missing.length > 0) {
          fail(`reachability ${mode} missing: ${r.missing.join(', ')} (controlsTotal=${r.controlsTotal})`);
        }
      }
    }
    if (a.signedInRender) {
      const r = a.signedInRender;
      if (!r.ok) {
        const fail_ = (msg) => { console.error('[verdict] FAIL:', vp.viewport.width + 'x' + vp.viewport.height, msg); exitCode = 1; };
        fail_(`signedInRender: page still renders signed-out (userMenu=${r.userMenuPresent}, topbarSignin=${r.topbarSigninPresent}, drawerSignin=${r.drawerSigninPresent}) — synthetic /me did not flip state`);
      }
    }
    if (vp.viewport.drawerExpected) {
      const fail = (msg) => { console.error('[verdict] FAIL:', vp.viewport.width + 'x' + vp.viewport.height, msg); exitCode = 1; };
      // dialogAtOpen shape:
      //   when open  → { rect, heightMatchesViewport }
      //   when closed→ { open: false, rect: null, heightMatchesViewport: false }
      const dao = a.dialogAtOpen;
      if (!dao) fail('dialogAtOpen not asserted');
      else if (dao.open === false || dao.rect === null) fail('drawer did not open at the rect-probe step');
      else if (!dao.heightMatchesViewport) fail('dialog height != viewport: ' + JSON.stringify(dao.rect));
      if (a.ariaControlsAtOpen && !a.ariaControlsAtOpen.ok) fail('aria-controls (at open): ' + JSON.stringify(a.ariaControlsAtOpen));
      if (a.backdropCoordClose && a.backdropCoordClose.some(r => !r.closed)) fail('backdrop coord-click failed: ' + JSON.stringify(a.backdropCoordClose));
      if (a.xButton && !a.xButton.closed) fail('x button did not close: ' + JSON.stringify(a.xButton));
      if (a.escClose && !a.escClose.closed) fail('esc did not close: ' + JSON.stringify(a.escClose));
      if (a.focusContainment && a.focusContainment.escapes > 0) fail('focus escaped: ' + a.focusContainment.escapes);
      if (a.occlusion && a.occlusion.refined.length > 0) fail('occlusion (refined): ' + JSON.stringify(a.occlusion.refined));
      if (a.axeAtOpen && !a.axeAtOpen.skipped) {
        const critical = a.axeAtOpen.violations.filter(v => v.impact === 'critical');
        if (critical.length > 0) fail('axe critical violations: ' + critical.length);
      }
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('[ui-evidence] ' + TARGET);
    for (const vp of results.viewports) {
      console.log(`  viewport ${vp.viewport.width}x${vp.viewport.height} (${vp.viewport.label})`);
      const a = vp.assertions;
      if (a.skipped) {
        console.log('    ' + a.skipped);
        continue;
      }
      // Reachability (D76) — first, since it's the most actionable.
      if (a.reachability) {
        for (const mode of ['signedOut', 'meBlocked', 'signedIn']) {
          const r = a.reachability[mode];
          if (!r) {
            console.log(`    reachability (${mode}): NOT ASSERTED`);
            continue;
          }
          const missing = r.missing && r.missing.length > 0 ? r.missing.join(', ') : '(none)';
          const verdict = r.missing && r.missing.length > 0 ? 'FAIL' : 'OK';
          console.log(`    reachability (${mode}): ${verdict} — missing: ${missing} (controls: ${r.controlsTotal})`);
        }
      }
      if (a.signedInRender) {
        const r = a.signedInRender;
        console.log(`    signedInRender: ${r.ok ? 'OK' : 'FAIL'} (userMenu=${r.userMenuPresent}, topbarSignin=${r.topbarSigninPresent}, drawerSignin=${r.drawerSigninPresent})`);
      }
      console.log(`    aria-controls (initial) → ${a.ariaControlsInitial?.ok ? 'OK' : 'expected (dialog not mounted)'}`);
      console.log(`    aria-controls (at open) → ${a.ariaControlsAtOpen?.ok ? 'OK' : 'FAIL'}`);
      console.log(`    dialog height = ${a.dialogAtOpen?.rect?.h} (expected ${vp.viewport.height}): ${a.dialogAtOpen?.heightMatchesViewport ? 'OK' : 'FAIL'}`);
      for (const r of a.backdropCoordClose || []) {
        console.log(`    backdrop coord-click (${r.point}): ${r.closed ? 'OK (drawer closed)' : 'FAIL'}`);
      }
      console.log(`    × close (real CDP coord): ${a.xButton?.closed ? 'OK' : 'FAIL'}`);
      console.log(`    Esc close: ${a.escClose?.closed ? 'OK' : 'FAIL'}`);
      console.log(`    focus containment: ${a.focusContainment?.escapes || 0}/${a.focusContainment?.presses} escapes`);
      console.log(`    axe (refined): strict=${a.occlusion?.strict?.length} refined=${a.occlusion?.refined?.length}`);
      if (a.axeAtOpen?.skipped) {
        console.log('    axe: SKIPPED (vendor script not present)');
      } else {
        const crit = a.axeAtOpen.violations.filter(v => v.impact === 'critical').length;
        const mod  = a.axeAtOpen.violations.filter(v => v.impact === 'moderate').length;
        console.log(`    axe: critical=${crit} moderate=${mod}`);
      }
    }
    console.log(`\n[ui-evidence] exit ${exitCode}`);
  }
  process.exit(exitCode);
}

main().catch((e) => {
  console.error('[ui-evidence] Unhandled:', e);
  process.exit(2);
});
