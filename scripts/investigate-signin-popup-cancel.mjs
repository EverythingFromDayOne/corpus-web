#!/usr/bin/env node
/**
 * FE-2 investigation: sign-in popup cancel path.
 *
 * Reproduces the dispatch scenario:
 *   1. Open the homepage at desktop width
 *   2. Click "Sign in" — captures the popup
 *   3. Close the popup without choosing an account
 *   4. Observe the opener's UI state machine
 *   5. Report timings: how long until the UI returns to "Sign in"
 *   6. Probe popup.closed under COOP
 *
 * NO FIX. NO PATCH. Just measurement. Per dispatch:
 *   "INVESTIGATE FIRST, do not fix yet."
 *
 * Uses the same Chrome-spawn + CDP recipe as scripts/ui-evidence.mjs
 * (no Playwright dep, headless Chrome on localhost).
 *
 * Output: JSON to stdout AND /tmp/fe2-cancel-report.json.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const URL = process.env.FE2_URL ?? 'http://localhost:3000/en';
const VIEWPORT_W = Number(process.env.FE2_WIDTH ?? 1280);
const VIEWPORT_H = Number(process.env.FE2_HEIGHT ?? 800);

const POPUP_CLOSE_DELAY_MS = Number(process.env.FE2_POPUP_DELAY_MS ?? 800);
const OBSERVE_DURATION_MS = Number(process.env.FE2_OBSERVE_MS ?? 12_000);
const POLL_OBSERVE_MS = 200;

const events = [];
const t0 = Date.now();
function logEvent(kind, data) {
  const ev = { t: Date.now() - t0, kind, ...data };
  events.push(ev);
  console.log(`[+${String(ev.t).padStart(5, ' ')}ms] ${kind}`, JSON.stringify(data));
}

// --- Chrome spawn (same recipe as ui-evidence.mjs) ---
const userDataDir = mkdtempSync(join(tmpdir(), 'fe2-chrome-'));
// Use the same port ui-evidence.mjs uses (9222). If another instance is
// bound there, the spawn will fail with EADDRINUSE — that's the right
// failure mode (user is told to kill the other Chrome).
const chromePort = 9222;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--remote-debugging-port=' + chromePort,
  '--user-data-dir=' + userDataDir,
  '--hide-scrollbars',
  '--window-size=' + VIEWPORT_W + ',' + VIEWPORT_H,
  '--disable-popup-blocking',
  '--disable-features=PopupBlocking',
  'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore'] });

chrome.on('exit', (code) => logEvent('chrome-exit', { code }));

async function waitForChrome(maxMs = 10_000) {
  for (let i = 0; i < maxMs / 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${chromePort}/json/version`);
      if (r.ok) return await r.json();
    } catch {}
    await delay(100);
  }
  console.error('CHROME STDERR (last 4KB):\n' + chromeStderr.slice(-4096));
  throw new Error('Chrome did not become ready');
}

// --- CDP plumbing (minimal) ---
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.targets = new Map(); // sessionId -> ws
    this.sessionId = null;
    this.onTargetCreated = null;
    this.onTargetDestroyed = null;
    this._setupHandlers();
  }
  _setupHandlers() {
    this.ws.addEventListener('message', (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Target.targetCreated' && this.onTargetCreated) {
        this.onTargetCreated(msg.params);
      } else if (msg.method === 'Target.targetDestroyed' && this.onTargetDestroyed) {
        this.onTargetDestroyed(msg.params);
      }
    });
  }
  open() { return new Promise((r) => this.ws.addEventListener('open', () => r())); }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }
  close() { this.ws.close(); }
}

const report = { url: URL, viewport: { w: VIEWPORT_W, h: VIEWPORT_H }, events: [], findings: {}, popupCloseObservedAt: null, returnToSignInAt: null, totalObservedMs: 0 };

async function main() {
  await waitForChrome();
  logEvent('chrome-ready', { port: chromePort });

  // Discover the page target (about:blank)
  const targets = await (await fetch(`http://127.0.0.1:${chromePort}/json`)).json();
  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('No page target');
  logEvent('target-found', { id: pageTarget.id, url: pageTarget.url });

  const cdp = new Cdp(pageTarget.webSocketDebuggerUrl);
  await cdp.open();
  cdp.sessionId = pageTarget.id;
  // We use Target.setDiscoverTargets so we hear about popups.
  await cdp.send('Target.setDiscoverTargets', { discover: true });

  // Track popup creation/destruction. Listen for BOTH CDP event types:
  //  - Target.targetCreated (general target discovery)
  //  - Page.windowOpen (page-level popup notification, more reliable in
  //    headless mode where the popup may be hosted in the renderer process)
  const popupTargets = [];
  cdp.onTargetCreated = (params) => {
    if (params.type === 'page') {
      logEvent('popup-created', { source: 'Target.targetCreated', targetId: params.targetInfo.targetId, url: params.targetInfo.url });
      popupTargets.push(params.targetInfo);
    }
  };
  cdp.onTargetDestroyed = (params) => {
    logEvent('popup-destroyed', { source: 'Target.targetDestroyed', targetId: params.targetId });
  };

  // Page.windowOpen is the newer signal for popup launches; register directly.
  cdp.ws.addEventListener('message', (m) => {
    const msg = JSON.parse(m.data);
    if (msg.method === 'Page.windowOpen') {
      logEvent('popup-created', { source: 'Page.windowOpen', url: msg.params.url, windowName: msg.params.windowName, features: msg.params.windowFeatures });
      popupTargets.push({ targetId: '(unknown)', url: msg.params.url });
    }
  });

  // Set viewport via Emulation.setDeviceMetricsOverride (flat mode — no sessionId)
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: VIEWPORT_W, height: VIEWPORT_H, deviceScaleFactor: 1, mobile: false,
  });

  await cdp.send('Page.enable');

  // Navigate to the home page
  logEvent('nav-start', { url: URL });
  await cdp.send('Page.navigate', { url: URL });
  // Wait for load
  await new Promise((resolve) => {
    const onMsg = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.method === 'Page.loadEventFired') {
        cdp.ws.removeEventListener('message', onMsg);
        resolve();
      }
    };
    cdp.ws.addEventListener('message', onMsg);
    setTimeout(() => { cdp.ws.removeEventListener('message', onMsg); resolve(); }, 5000);
  });
  logEvent('nav-loaded', {});
  await delay(800); // settle

  // Find the Sign in button (desktop topbar at 1280)
  // Use Runtime.evaluate to click it AND capture popup.closed under COOP
  // BEFORE we close the popup.
  logEvent('click-signin', {});

  // Click via DOM
  await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        const btn = document.querySelector('.topbar-signin');
        if (!btn) { window.__fe2 = { error: 'no .topbar-signin' }; return; }
        window.__fe2_clickTime = Date.now();
        btn.click();
        // Snapshot: what does the button look like after click?
        window.__fe2_afterClick = {
          text: btn.textContent.trim(),
          disabled: btn.disabled,
          ariaDisabled: btn.getAttribute('aria-disabled'),
          className: btn.className,
        };
      })();
    `,
    returnByValue: true,
  });

  // Wait briefly for popup to spawn
  await delay(POPUP_CLOSE_DELAY_MS);

  logEvent('observe-after-popup-delay', {
    popupCount: popupTargets.length,
    popupUrls: popupTargets.map((p) => p.url),
  });

  // Resolve popup targetId by querying Chrome's /json/list (the CDP
  // Target.targetCreated event in headless mode does NOT always include
  // a targetId for `window.open` popups; `Page.windowOpen` provides URL
  // but not targetId. Cross-reference via the HTTP endpoint.)
  let popupTargetId = null;
  if (popupTargets.length > 0) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${chromePort}/json/list`)).json();
      const candidates = list.filter((t) => t.type === 'page' && !popupTargetOwnUrl(t.url));
      if (candidates.length > 0) {
        popupTargetId = candidates[candidates.length - 1].id;
        logEvent('popup-targetid-resolved', { targetId: popupTargetId, url: candidates[candidates.length - 1].url, candidatesBeforeFilter: list.length });
      }
    } catch (e) {
      logEvent('popup-targetid-resolve-failed', { error: e.message });
    }
  }

  function popupTargetOwnUrl(url) {
    return url === URL || url.startsWith(URL.replace(/\/en$/, ''));
  }

  // Now close the popup. There are two paths:
  //  (a) CDP: close the popup target directly via Target.closeTarget
  //  (b) Popup-side: window.close() inside the popup
  // The dispatch says "close the Google popup without choosing an account" —
  // that's the user pressing × / closing the popup window. Both paths
  // trigger the same opener-side close watcher. We use CDP because it's
  // scriptable.
  if (popupTargets.length === 0) {
    logEvent('no-popup-detected', { hint: 'popup blocker or click did not fire window.open — check FE2_POPUP_DELAY_MS or sign-in button class' });
  } else if (popupTargetId) {
    logEvent('closing-popup', { method: 'Target.closeTarget', targetId: popupTargetId, url: popupTargets[popupTargets.length - 1].url });
    try {
      await cdp.send('Target.closeTarget', { targetId: popupTargetId });
      logEvent('popup-close-acked', { targetId: popupTargetId });
    } catch (e) {
      logEvent('popup-close-failed', { error: e.message });
    }
  } else {
    logEvent('closing-popup', { method: 'FALLBACK: BrowserWindow.close on opener side', note: 'no targetId — relying on opener-side state machine to detect window close via setInterval(p.closed)' });
  }

  // Observe the opener's state machine for OBSERVE_DURATION_MS
  const observeStart = Date.now();
  const observations = [];
  let firstReturnToSignInAt = null;
  while (Date.now() - observeStart < OBSERVE_DURATION_MS) {
    const obs = await cdp.send('Runtime.evaluate', {
      expression: `
        (function() {
          const btn = document.querySelector('.topbar-signin');
          if (!btn) return { found: false };
          return {
            found: true,
            text: btn.textContent.trim(),
            disabled: btn.disabled,
            ariaDisabled: btn.getAttribute('aria-disabled'),
            className: btn.className,
            hasProcessing: btn.className.includes('processing'),
          };
        })();
      `,
      returnByValue: true,
    });
    const o = obs.result.value;
    o.t = Date.now() - observeStart;
    observations.push(o);
    if (o.found && !o.hasProcessing && !firstReturnToSignInAt) {
      firstReturnToSignInAt = o.t;
      logEvent('return-to-signin', { elapsedSinceObserveStartMs: o.t });
    }
    await delay(POLL_OBSERVE_MS);
  }

  // Also probe popup.closed under COOP. This requires re-opening the
  // sign-in popup, then evaluating `popup.closed` from the opener side
  // via Runtime.evaluate, and seeing what happens when COOP isolates the
  // opener from the popup. Under COOP, accessing the popup handle from
  // the opener returns null OR throws. We probe both.
  logEvent('probe-popup-closed', {});

  // Click sign-in again to spawn a new popup
  await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        const btn = document.querySelector('.topbar-signin');
        if (btn) btn.click();
      })();
    `,
  });
  await delay(1000);

  const probeResult = await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        // We can't reach popupRef from outside the React component, but we
        // CAN re-open and inspect window.open() return value behavior: does
        // it return a usable handle? Is popup.closed reliable? We probe
        // via an inline window.open call and inspect the handle.
        try {
          const p = window.open('about:blank', 'fe2-probe', 'width=300,height=200');
          if (!p) return { ok: false, reason: 'window.open returned null (popup blocker)' };
          const closedImmediately = p.closed;
          // Now try to close it via the handle and re-check.
          try { p.close(); } catch (e) { return { ok: false, reason: 'popup.close() threw: ' + e.message, closedBefore: closedImmediately }; }
          const closedAfter = p.closed;
          return { ok: true, closedImmediately, closedAfter };
        } catch (e) {
          return { ok: false, reason: 'window.open/probe threw: ' + e.message };
        }
      })();
    `,
    returnByValue: true,
  });

  logEvent('popup-closed-probe', probeResult.result.value);

  // Close the (real) popup if still alive
  if (popupTargets.length > 0) {
    const last = popupTargets[popupTargets.length - 1];
    try { await cdp.send('Target.closeTarget', { targetId: last.targetId }); } catch {}
  }

  // Build report
  report.events = events;
  report.observations = observations;
  report.popupClosedProbe = probeResult.result.value;
  report.popupTargets = popupTargets.map((p) => ({ targetId: p.targetId, url: p.url }));
  report.firstReturnToSignInMs = firstReturnToSignInAt;
  report.totalObservedMs = OBSERVE_DURATION_MS;
  report.findings = synthesizeFindings(report);

  console.log('\n=== REPORT ===');
  console.log(JSON.stringify(report, null, 2));

  writeFileSync('/tmp/fe2-cancel-report.json', JSON.stringify(report, null, 2));
  console.log('\nReport written to /tmp/fe2-cancel-report.json');

  cdp.close();
  chrome.kill();
}

function synthesizeFindings(r) {
  const f = {};
  // 1. Did the popup open?
  f.popupSpawned = r.popupTargets.length > 0;
  // 2. Did the UI return to "Sign in"?
  f.uiReturnedToSignIn = r.firstReturnToSignInMs != null;
  f.uiReturnLatencyMs = r.firstReturnToSignInMs;
  // 3. Did we see a "Processing" state?
  f.processingStateObserved = r.observations.some((o) => o.found && o.hasProcessing);
  // 4. Under COOP, does popup.closed work?
  // We can't directly test COOP here (local dev doesn't set COOP headers).
  // But the probe shows the API works: right after window.open, p.closed
  // is FALSE (popup is alive); after p.close(), p.closed is TRUE. So
  // popup.closed is reliable on this Chromium build in this environment.
  if (r.popupClosedProbe && r.popupClosedProbe.ok) {
    f.popupClosedWorksInThisEnv = r.popupClosedProbe.closedImmediately === false
                                && r.popupClosedProbe.closedAfter === true;
    f.popupClosedProbeDetail = {
      closedImmediately: r.popupClosedProbe.closedImmediately,
      closedAfter: r.popupClosedProbe.closedAfter,
    };
  } else {
    f.popupClosedWorksInThisEnv = null;
    f.popupClosedProbeDetail = r.popupClosedProbe;
  }
  // COOP-specific reliability CANNOT be measured in this env. Note that
  // for Huy: production (https://nxhhuy.tech) may set COOP headers; the
  // sign-in-context.tsx code path that uses popup.closed may behave
  // differently there. This script cannot reach production.
  f.popupClosedCoopReliabilityInProduction = 'NOT_MEASURED (no VPS access; local dev does not set COOP)';
  // 5. Hang detection: if UI never returned within OBSERVE_DURATION_MS, the cancel path hangs
  f.hangDetected = !f.uiReturnedToSignIn;
  // 6. Total latency breakdown
  f.popupOpenLatencyMs = 'see first popup-created event t (relative to click-signin)';
  f.postCloseDebounceMs = 5_000;  // sign-in-button.tsx:128 POST_CLOSE_DEBOUNCE_MS
  return f;
}

main().catch((e) => {
  console.error('FATAL:', e);
  try { chrome.kill(); } catch {}
  process.exit(1);
});
