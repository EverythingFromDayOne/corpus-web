#!/usr/bin/env node
/**
 * Capture screenshots at all configured viewports × {signedOut, meBlocked}
 * using the same Chrome-spawn + CDP recipe as scripts/ui-evidence.mjs.
 *
 * Zero new dependencies — uses Node 22+ global WebSocket, child_process.spawn,
 * and built-in fetch. Output: PNGs in /tmp/ui-evidence-screenshots/<viewport>/
 *
 * Default viewports: derives breakpoints from apps/web/app/globals.css the
 * same way ui-evidence.mjs does, plus the canonical 1280 and 375.
 *
 * Skipped on `pnpm verify:ui-evidence`. Lives next to ui-evidence for code
 * reuse; never imported — runs as `node scripts/capture-ui-screenshots.mjs`.
 */

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const CHROME_BIN = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_PORT = 9222;
const TARGET = process.env.UI_EVIDENCE_URL || 'http://localhost:3000/en';
const OUT_DIR = '/tmp/ui-evidence-screenshots';

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function spawnChrome() {
  const userDataDir = `/tmp/ui-evidence-chrome-shot-${Date.now()}`;
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
  throw new Error(`Chrome failed to bind to :${CHROME_PORT}`);
}

async function openTab(url) {
  // /json/new creates a fresh tab. Fall back to /json/list and pick the first page target.
  let target;
  try {
    const r = await fetch(`http://127.0.0.1:${CHROME_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
    target = await r.json();
  } catch {
    target = null;
  }
  if (!target?.webSocketDebuggerUrl) {
    const list = await (await fetch(`http://127.0.0.1:${CHROME_PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page') ?? list[0];
  }
  const ws = new globalThis.WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (typeof msg.id === 'number' && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result ?? msg);
    }
  });
  function send(method, params = {}) {
    id += 1;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  }
  return { ws, send, tab: target };
}

async function setViewport(cdp, { width, height }) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: width < 768,
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
  await sleep(300);
}

async function blockMeAndNavigate(cdp, url) {
  await cdp.send('Fetch.enable', {
    patterns: [{ urlPattern: '**/api/**/me*' }, { urlPattern: '**/me' }],
  });
  const blocker = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Fetch.requestPaused') {
      const id = msg.params.requestId;
      cdp.send('Fetch.failRequest', {
        requestId: id,
        errorReason: 'Aborted',
      }).catch(() => {});
    }
  };
  cdp.ws.addEventListener('message', blocker);
  try {
    await navigate(cdp, url);
  } finally {
    cdp.ws.removeEventListener('message', blocker);
    await cdp.send('Fetch.disable').catch(() => {});
  }
}

async function openDrawerAndWait(cdp) {
  // Click the hamburger trigger.
  await cdp.send('Runtime.evaluate', {
    expression: `
      (function(){
        const t = document.querySelector('.mobile-nav-trigger');
        if (t) t.click();
        return !!t;
      })()
    `,
  });
  await sleep(250);
}

async function capturePng(cdp, filePath) {
  const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (!result?.data) throw new Error(`captureScreenshot returned no data: ${JSON.stringify(result).slice(0, 200)}`);
  writeFileSync(filePath, Buffer.from(result.data, 'base64'));
}

function readBreakpointsFromCss() {
  const cssPath = join(process.cwd(), 'apps/web/app/globals.css');
  const src = readFileSync(cssPath, 'utf8');
  const set = new Set();
  for (const m of src.matchAll(/\((max|min)-width:\s*(\d+)px\)/g)) {
    set.add(parseInt(m[2], 10));
  }
  return [...set].sort((a, b) => a - b);
}

const BREAKPOINTS_PX = readBreakpointsFromCss();
const VIEWPORTS = (() => {
  const widths = new Set([375, 404, 1280]);
  for (const bp of BREAKPOINTS_PX) {
    widths.add(bp);
    widths.add(bp + 1);
  }
  return [...widths].sort((a, b) => a - b).map((width) => ({
    width,
    height: width < 768 ? 812 : 1024,
    drawerExpected: width <= 640,
    label:
      BREAKPOINTS_PX.includes(width)   ? `bp-${width}`
      : BREAKPOINTS_PX.includes(width - 1) ? `bp-${width - 1}+1`
      : width === 1280                  ? 'desktop'
      : width === 375                   ? 'mobile'
      : width === 404                   ? 'tablet-414'
      : `${width}`,
  }));
})();

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
  mkdirSync(OUT_DIR, { recursive: true });
  await waitForTarget(TARGET);
  const chrome = spawnChrome();
  let failures = 0;
  try {
    await waitForChrome();
    const cdp = await openTab(TARGET);
    for (const vp of VIEWPORTS) {
      await setViewport(cdp, vp);
      const vpDir = join(OUT_DIR, `${vp.width}x${vp.height}`);
      mkdirSync(vpDir, { recursive: true });
      // --- signedOut, drawer closed
      await navigate(cdp, TARGET);
      await sleep(200);
      let fname = `signedout-topbar.png`;
      try { await capturePng(cdp, join(vpDir, fname)); }
      catch (e) { console.error(`FAIL ${vp.width} ${fname}: ${e.message}`); failures++; }

      // --- signedOut, drawer opened (mobile only)
      if (vp.drawerExpected) {
        await openDrawerAndWait(cdp);
        fname = `signedout-drawer.png`;
        try { await capturePng(cdp, join(vpDir, fname)); }
        catch (e) { console.error(`FAIL ${vp.width} ${fname}: ${e.message}`); failures++; }
        // close drawer by pressing Escape (CDP key event)
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp',   key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await sleep(150);
      }

      // --- meBlocked (topbar)
      await blockMeAndNavigate(cdp, TARGET);
      await sleep(200);
      fname = `meblocked-topbar.png`;
      try { await capturePng(cdp, join(vpDir, fname)); }
      catch (e) { console.error(`FAIL ${vp.width} ${fname}: ${e.message}`); failures++; }

      // --- meBlocked (drawer)
      if (vp.drawerExpected) {
        await openDrawerAndWait(cdp);
        fname = `meblocked-drawer.png`;
        try { await capturePng(cdp, join(vpDir, fname)); }
        catch (e) { console.error(`FAIL ${vp.width} ${fname}: ${e.message}`); failures++; }
      }
    }
  } finally {
    chrome.kill();
  }
  console.log(`[capture-ui-screenshots] ${failures} failures; output: ${OUT_DIR}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error('[capture-ui-screenshots] Unhandled:', e);
  process.exit(2);
});
