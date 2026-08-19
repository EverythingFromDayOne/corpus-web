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
      <button type="button" className="av-cbb" onClick={expand} aria-label={labels.expand}>
        ⛶
      </button>
    </>
  );
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
    <button type="button" className={`av-cbcopy${copied ? ' done' : ''}`} onClick={() => void copy()}>
      {copied ? labels.copied : labels.copy}
    </button>
  );
}
