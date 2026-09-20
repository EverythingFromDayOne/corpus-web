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

// ---------------------------------------------------------------------------
// Constants — earned their place from PR #194 runs
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { width: 375,  height: 812, label: 'mobile',   drawerExpected: true  },
  { width: 768,  height: 1024, label: 'tablet',  drawerExpected: false }, // .mobile-nav-trigger has display: none ≥ 640px
  { width: 1280, height: 800, label: 'desktop', drawerExpected: false },
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
    const inside = await evalInPage(cdp, `(() => {
      const a = document.activeElement;
      const d = document.querySelector('[role="dialog"]');
      return d?.contains(a) ?? false;
    })()`);
    trail.push(inside);
  }
  const escapes = trail.filter(x => !x).length;
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
// Run
// ---------------------------------------------------------------------------

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
