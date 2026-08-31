'use client';

import { useEffect, useRef, useState } from 'react';
import { t, type Messages } from '@/lib/i18n';

// Pagefind 1.x ships `/pagefind/pagefind.js` as a native ES module
// (the file ends with `export{createInstance,debouncedSearch,…}`), so
// the canonical load is a dynamic `import()` — *not* a <script> tag.
// A classic <script src> would parse the `export` keyword as a
// SyntaxError, never assign anything to `window.pagefind`, and the
// page would sit at "bundle loaded but did not register window.pagefind"
// forever. Dynamic import also keeps the fetch on the same origin
// (so Vercel Preview auth cookies, when present, travel with it).
type PagefindModule = {
  init?: () => Promise<void>;
  search: (q: string) => Promise<PagefindSearchResponse>;
  options?: (opts: Record<string, unknown>) => Promise<void>;
};

type SearchStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

/**
 * Full-text search dialog backed by Pagefind.
 *
 * Opens on click of <SearchTrigger>, ⌘K / Ctrl+K, or any element with
 * `[data-open-search]` (used by the trigger and by future call sites).
 * Pagefind is loaded lazily on first open; the index ships as static
 * assets from /pagefind/* (built by the postbuild script).
 *
 * Vendor-neutral: no external UI lib, no theme overrides. Listens for
 * keyboard, manages focus, and clears state on close.
 */
export function SearchDialog({ messages }: { messages: Messages }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResultFragment[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [status, setStatus] = useState<SearchStatus>({ kind: 'idle' });
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open / close API exposed on window so the trigger button (which lives
  // in the server-rendered topbar) can call into the dialog without a
  // shared React state tree. Only active after hydration. Falls back to
  // dispatching a `corpus:open-search` event for any other consumer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const open = () => {
      if (!dialog.open) dialog.showModal();
      // Defer focus until next tick — showModal restores focus differently.
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    const close = () => {
      if (dialog.open) dialog.close();
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ action?: string }>).detail;
      if (detail?.action === 'close') close();
      else open();
    };
    (window as unknown as { __corpusSearch: { open: () => void; close: () => void } })
      .__corpusSearch = { open, close };
    window.addEventListener('corpus:open-search', onCustom);
    return () => {
      delete (window as unknown as { __corpusSearch?: unknown }).__corpusSearch;
      window.removeEventListener('corpus:open-search', onCustom);
    };
  }, []);

  // Keyboard: ⌘K / Ctrl+K opens; Esc closes (native dialog handles that).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (dialog.open) dialog.close();
        else {
          dialog.showModal();
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Lazy-load Pagefind on first open. The browser bundle is at
  // /pagefind/pagefind.js (served from public/pagefind/). It's a
  // native ES module (ends with `export{…}`), so we load it via
  // dynamic `import()` — a <script> tag would SyntaxError on the
  // trailing `export` and never register anything. The browser
  // caches the URL across calls, so concurrent openers share one
  // fetch; we cache the resolved module in a useState to avoid
  // re-importing on every keystroke.
  const ensurePagefind = async (): Promise<PagefindModule | null> => {
    if (pagefind) return pagefind;
    if (typeof window === 'undefined') return null;
    try {
      // Dynamic `import()` of a runtime-resolved URL. The bundle lives
      // in apps/web/public/pagefind/pagefind.js and is served at the
      // site root at /pagefind/pagefind.js. Turbopack/webpack must not
      // try to resolve it at build time — both honour `webpackIgnore`
      // (Turbopack reads it from the source). The `as PagefindModule`
      // cast silences TS7016 because no .d.ts ships with the bundle.
      const mod = (await import(
        /* webpackIgnore: true */ /* @ts-expect-error runtime URL — public asset */
        '/pagefind/pagefind.js'
      )) as PagefindModule;
      if (mod.init) await mod.init();
      setPagefind(mod);
      return mod;
    } catch (err) {
      const message =
        err instanceof Error
          ? `Pagefind failed to initialise: ${err.message}`
          : 'Pagefind failed to initialise: unknown error';
      console.error('[search] Pagefind failed to initialise', err);
      setStatus({ kind: 'error', message });
      return null;
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!next.trim()) {
      setResults([]);
      setStatus({ kind: 'idle' });
      return;
    }
    // Surface "loading" immediately so the user sees feedback the
    // moment they type — without this, the dialog stays visually
    // idle while `ensurePagefind` loads the bundle, which on Vercel's
    // edge network can take 2–10s and feels like the app is hung.
    setStatus({ kind: 'loading' });
    debounceRef.current = setTimeout(async () => {
      const pf = await ensurePagefind();
      if (!pf) return;
      setStatus({ kind: 'loading' });
      try {
        const search = await pf.search(next);
        const fragments = (await Promise.all(
          search.results.slice(0, 8).map((r) => r.data()),
        )) as PagefindResultFragment[];
        setResults(fragments);
        setStatus({ kind: fragments.length === 0 ? 'empty' : 'ready' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[search] query failed', err);
        setStatus({ kind: 'error', message });
      }
    }, 80);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[activeIdx]?.url) {
      window.location.href = results[activeIdx].url;
    }
  };

  // Reset state on close (native dialog emits `close`).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const reset = () => {
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setStatus({ kind: 'idle' });
    };
    dialog.addEventListener('close', reset);
    return () => dialog.removeEventListener('close', reset);
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="srch-dialog"
      aria-label={t(messages, 'placeholders.searchDialogLabel')}
    >
      <div className="srch-dialog-inner">
        <div className="srch-dialog-input">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="16"
            height="16"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={onInput}
            onKeyDown={onKeyDown}
            placeholder={t(messages, 'placeholders.searchInput')}
            aria-label={t(messages, 'placeholders.searchDialogLabel')}
            aria-controls="srch-results"
            aria-activedescendant={results[activeIdx] ? `srch-r-${activeIdx}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="srch-kbd srch-dialog-kbd">{t(messages, 'nav.searchKbd')}</kbd>
        </div>

        <ul
          id="srch-results"
          role="listbox"
          className="srch-dialog-results"
          aria-live="polite"
        >
          {status.kind === 'loading' && (
            <li className="srch-dialog-status">
              {pagefind
                ? t(messages, 'placeholders.searchLoading')
                : t(messages, 'placeholders.searchLoadingIndex')}
            </li>
          )}
          {status.kind === 'empty' && (
            <li className="srch-dialog-status">{t(messages, 'placeholders.searchEmpty')}</li>
          )}
          {status.kind === 'error' && (
            <li className="srch-dialog-status">
              <span>{t(messages, 'placeholders.searchError')}</span>
              <span className="srch-dialog-error-detail">{(status as { kind: 'error'; message: string }).message}</span>
            </li>
          )}
          {status.kind === 'ready' &&
            results.map((r, i) => (
              <li
                id={`srch-r-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                key={r.url}
                className={i === activeIdx ? 'is-active' : undefined}
              >
                <a href={r.url}>
                  <span
                    className="srch-dialog-excerpt"
                    // Pagefind excerpts are pre-escaped HTML with <mark> wrappers.
                    dangerouslySetInnerHTML={{ __html: r.excerpt }}
                  />
                </a>
              </li>
            ))}
        </ul>

        <p className="srch-dialog-foot">
          {t(messages, 'placeholders.searchHint')}
        </p>
      </div>
    </dialog>
  );
}

// --- Pagefind runtime types (declarations only; runtime is JS) ----------
//
// The runtime lives in /pagefind/pagefind.js (ESM bundle built by
// `pagefind --site public` at postbuild time). We import it dynamically
// from `ensurePagefind`; the module namespace matches PagefindModule.

interface PagefindResultRaw {
  id: string;
  score: number;
  words: number[];
  data: () => Promise<PagefindDocument>;
}

interface PagefindDocument {
  url: string;
  meta: Record<string, string>;
  excerpt: string;
}

interface PagefindResultFragment {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
}

interface PagefindSearchResponse {
  results: PagefindResultRaw[];
  total: number;
  searchDuration: number;
}