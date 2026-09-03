'use client';

import { useState, type MouseEvent } from 'react';
import type { CodeBlockLabels } from './code-block';

export function CodeBlockToolbar({
  code,
  filename,
  labels,
}: {
  code: string;
  filename: string;
  labels: Pick<CodeBlockLabels, 'download' | 'expand'>;
}) {
  function download() {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function expand(event: MouseEvent<HTMLButtonElement>) {
    const node = event.currentTarget.closest('.av-cb') as HTMLElement | null;
    if (!node || typeof document === 'undefined') return;
    // polish/flashcard-grow-and-cb-overlay (PR #142):
    // the previous implementation called `(node).requestFullscreen()`
    // which is a no-op on iOS Safari (the W3C API is not shipped on
    // iOS as of Safari 17; iOS only supports the legacy
    // `video.webkitEnterFullscreen()` path). Real-iPhone Safari users
    // reported that tapping the button did nothing — exactly the
    // symptom they reported. PR #141 hid the button on platforms
    // without `requestFullscreen`, but the user expected the button
    // to do *something*. This implementation replaces the native
    // fullscreen call with a portable new-tab HTML page that displays
    // the code in a monospace, auto-scrolling renderer. The page uses
    // only DOM + inline CSS — no JS, no CSS imports — so it works
    // on every browser engine (Chromium / WebKit / Firefox / iOS
    // Safari) including iOS Safari where document-level fullscreen is
    // not supported. The `noopener,noreferrer` flags keep the parent
    // page unfocused; Safari sizes the new tab to the user's window
    // manager so it reads as a "maximise" affordance without leaving
    // the app context. If pop-ups are blocked, the code is copied to
    // the clipboard as a graceful fallback (mirrors the existing copy
    // button behaviour).
    try {
      const blob = new Blob([buildStandaloneHtml(code, filename)], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newTab) throw new Error('popup-blocked');
      // Revoke the URL after a generous grace period so the new
      // tab has time to render and fetch the blob.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // Pop-up blocked — copy the code as a fallback. Mirrors the
      // existing copy button behaviour.
      void navigator.clipboard?.writeText(code);
    }
  }

  return (
    <>
      <span className="av-cbsp" />
      <button type="button" className="av-cbb" onClick={download} aria-label={labels.download}>
        ↓
      </button>
      <button type="button" className="av-cbb" onClick={expand} aria-label={labels.expand}>
        ⛶
      </button>
    </>
  );
}

function buildStandaloneHtml(code: string, filename: string): string {
  // Minimal dark-themed HTML wrapper that displays the code in a
  // monospace font, scrolls horizontally if the line is long, and
  // auto-zooms on the new tab/window so the user can pinch-zoom
  // further. No JS, no CSS imports — just enough for an iOS Safari
  // new-tab to render the code at usable size on a phone screen.
  const escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const title = filename.replace(/[<>&"]/g, '');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3">
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; }
      html, body { margin: 0; padding: 0; background: #0a1014; color: #c6d0d6; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      header { padding: 0.6rem 0.9rem; border-bottom: 1px solid #1e2a32; color: #6e8089; font-size: 0.75rem; }
      header b { color: #d7dde0; font-weight: 500; }
      pre { margin: 0; padding: 1rem; font-size: 0.85rem; line-height: 1.6; overflow: auto; white-space: pre; tab-size: 2; }
      @media (prefers-color-scheme: light) {
        html, body { background: #fbfbfd; color: #1f2a32; }
        header { border-color: #c8d0d6; color: #65707a; }
        header b { color: #2a3a44; }
      }
    </style>
  </head>
  <body>
    <header>Source: <b>${title}</b></header>
    <pre>${escaped}</pre>
  </body>
</html>`;
}

export function copyButtonClassName(copied: boolean): string {
  return copied ? 'av-cbcopy done' : 'av-cbcopy';
}

export function CodeBlockCopy({
  code,
  labels,
}: {
  code: string;
  labels: Pick<CodeBlockLabels, 'copy' | 'copied'>;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className={copyButtonClassName(copied)} onClick={() => void copy()}>
      {copied ? labels.copied : labels.copy}
    </button>
  );
}
