'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import type { CodeBlockLabels } from './code-block';

function supportsFullscreen(element: Element | null): boolean {
  if (!element) return false;
  if (typeof document === 'undefined') return false;
  // `Element.requestFullscreen` is the W3C standard but is not
  // implemented on iOS Safari (Apple has not shipped the API as
  // of Safari 17; iOS only supports the legacy `video`-element
  // fullscreen, not document-level fullscreen). The
  // `webkitRequestFullscreen` legacy prefix is also no longer
  // honoured on iOS. The iPhone Safari standard behaviour for a
  // user gesture on a non-video element is to no-op — exactly
  // the bug reported by user 2026-09-02 ("expand/restore to full
  // screen the file not working, nothing happens when click
  // expand button"). Hide the button in that case rather than
  // offer a control that does nothing.
  const req = (element as HTMLElement & {
    requestFullscreen?: unknown;
  }).requestFullscreen;
  return typeof req === 'function';
}

export function CodeBlockToolbar({
  code,
  filename,
  labels,
}: {
  code: string;
  filename: string;
  labels: Pick<CodeBlockLabels, 'download' | 'expand'>;
}) {
  // Hydration-safe: start with `true` so the SSR/initial-paint
  // shows the button for every platform (Safari on the desktop
  // already supports it; the rare loss is a flash on iPhone).
  // After hydration, the effect on the client adjusts if the
  // platform doesn't ship `requestFullscreen`. The flash is the
  // desktop-default value — Safari with fullscreen support sees
  // no visual change; Safari without it sees a one-frame button
  // disappear, which matches the visual "this doesn't work here"
  // expectation.
  const [canFullscreen, setCanFullscreen] = useState(true);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Use the document's `<html>` element as the probe — every
    // browser that ships `Element.requestFullscreen` puts it on
    // the document root.
    setCanFullscreen(supportsFullscreen(document.documentElement));
  }, []);

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
    const node = event.currentTarget.closest('.av-cb');
    if (node && 'requestFullscreen' in node) {
      void (node as HTMLElement).requestFullscreen();
    }
  }

  return (
    <>
      <span className="av-cbsp" />
      <button type="button" className="av-cbb" onClick={download} aria-label={labels.download}>
        ↓
      </button>
      {canFullscreen ? (
        <button type="button" className="av-cbb" onClick={expand} aria-label={labels.expand}>
          ⛶
        </button>
      ) : null}
    </>
  );
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
