'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { t, type Messages } from '@/lib/i18n';

// Pagefind 1.x ships `/pagefind/pagefind.js` as a native ES module
// (the file ends with `export{createInstance,…}`), so the canonical
// load is a dynamic `import()` — *not* a <script> tag. A classic
// <script src> would parse the `export` keyword as a SyntaxError,
// never assign anything to `window.pagefind`, and the page would
// sit at "bundle loaded but did not register window.pagefind"
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
 * `[data-open-search]`. Pagefind is loaded lazily on first open; the
 * index ships as static assets from /pagefind/* (built by postbuild).
 *
 * UX model: Spotlight-style top-anchored panel rather than a centred
 * modal. The panel sits near the top of the viewport with a fixed
 * height (results scroll inside it), so arriving results never
 * re-grow the panel and the layout stays still. Backdrop click closes;
 * inline clear-X wipes the query; race-guarded with a monotonic
 * request id so a slow Pagefind response can never overwrite newer
 * state from a faster keystroke.
 */
export function SearchDialog({ messages }: { messages: Messages }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResultFragment[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [status, setStatus] = useState<SearchStatus>({ kind: 'idle' });
  const [pagefind, setPagefind] = useState<PagefindModule | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id stamped onto every fired query. When the response
  // arrives we only commit it to state if it is still the latest
  // request — otherwise we discard it. This is the fix for
  // "delete word-by-word leaves stale results": a slow in-flight
  // search for "react use" no longer overwrites a newer search
  // for "react" that already resolved.
  const requestIdRef = useRef(0);

  // Open / close API exposed on window so the trigger button (which
  // lives in the server-rendered topbar) can call into the dialog
  // without a shared React state tree. Falls back to dispatching a
  // `corpus:open-search` event for any other consumer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const open = () => {
      if (!dialog.open) dialog.showModal();
      // Defer focus until next tick — showModal restores focus
      // differently across browsers.
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

  // Keyboard: ⌘K / Ctrl+K opens/closes; Esc closes (native dialog).
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

  // Backdrop click closes. The <dialog> itself receives the click
  // (not its inner content); we check the click target is the
  // dialog element itself, not any descendant. We use a capture-phase
  // listener so we run before any inner handler can stopPropagation.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dialog) {
        dialog.close();
      }
    };
    dialog.addEventListener('click', onClick, true);
    return () => dialog.removeEventListener('click', onClick, true);
  }, []);

  // Keep the active row visible when the user arrows through
  // results — scrollIntoView on the active <li>, smooth, but only
  // when the user actually changed selection (not on initial render).
  useEffect(() => {
    const list = resultsRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLLIElement>(`#srch-r-${activeIdx}`);
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIdx]);

  // Lazy-load Pagefind on first open. See file header.
  const ensurePagefind = useCallback(async (): Promise<PagefindModule | null> => {
    if (pagefind) return pagefind;
    if (typeof window === 'undefined') return null;
    try {
      const mod = (await import(
        /* webpackIgnore: true */ /* @ts-expect-error runtime URL — public asset */
        '/pagefind/pagefind.js'
      )) as PagefindModule;
      if (mod.init) await mod.init();
      setPagefind(mod);
      return mod;
    } catch (err) {
      // The bundle only ships after `next build` runs the postbuild
      // hook (`pagefind --site .next/server/app --output-path
      // public/pagefind`). In `next dev` there is no index, so the
      // dynamic import rejects with a network / MIME error. Surface
      // that as an actionable hint rather than a generic
      // "initialise failed" — running dev is a common state to be in.
      const raw =
        err instanceof Error
          ? err.message
          : 'Pagefind failed to initialise: unknown error';
      const isDevMissing =
        /Failed to fetch|404|MIME type|Loading module|Loading chunk|NetworkError/i.test(
          raw,
        );
      const message = isDevMissing
        ? `${raw} — the Pagefind index is only built by \`pnpm build\`; use \`pnpm start\` to serve a production build, or run \`pnpm --filter @corpus/web search:index\` to regenerate it.`
        : `Pagefind failed to initialise: ${raw}`;
      console.error('[search] Pagefind failed to initialise', err);
      setStatus({ kind: 'error', message });
      return null;
    }
  }, [pagefind]);

  const runQuery = useCallback(
    async (q: string, id: number) => {
      const pf = await ensurePagefind();
      if (!pf) return;
      // Bail if a newer keystroke has already superseded this one
      // (or the dialog was closed in between).
      if (id !== requestIdRef.current) return;
      if (!dialogRef.current?.open) return;
      setStatus({ kind: 'loading' });
      try {
        const search = await pf.search(q);
        if (id !== requestIdRef.current) return;
        if (!dialogRef.current?.open) return;
        const fragments = (await Promise.all(
          search.results.slice(0, 8).map((r) => r.data()),
        )) as PagefindResultFragment[];
        if (id !== requestIdRef.current) return;
        setResults(fragments);
        setActiveIdx(0);
        setStatus({ kind: fragments.length === 0 ? 'empty' : 'ready' });
      } catch (err) {
        if (id !== requestIdRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        console.error('[search] query failed', err);
        setStatus({ kind: 'error', message });
      }
    },
    [ensurePagefind],
  );

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!next.trim()) {
      // Wipe the in-flight request id so any pending resolution
      // is discarded on return.
      requestIdRef.current += 1;
      setResults([]);
      setStatus({ kind: 'idle' });
      return;
    }
    // Surface "loading" immediately so the user sees feedback the
    // moment they type — without this, the dialog stays visually
    // idle while `ensurePagefind` loads the bundle, which on Vercel's
    // edge network can take 2–10s.
    setStatus({ kind: 'loading' });
    const id = requestIdRef.current + 1;
    requestIdRef.current = id;
    debounceRef.current = setTimeout(() => {
      void runQuery(next, id);
    }, 80);
  };

  const onClear = () => {
    setQuery('');
    setResults([]);
    setActiveIdx(0);
    setStatus({ kind: 'idle' });
    requestIdRef.current += 1;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length === 0) return;
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[activeIdx]?.url) {
      window.location.href = results[activeIdx].url;
    }
  };

  // Reset state on close (native dialog emits `close`).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const reset = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      requestIdRef.current += 1;
      setQuery('');
      setResults([]);
      setActiveIdx(0);
      setStatus({ kind: 'idle' });
    };
    dialog.addEventListener('close', reset);
    return () => dialog.removeEventListener('close', reset);
  }, []);

  const showClear = query.length > 0;

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
            aria-activedescendant={
              results[activeIdx] ? `srch-r-${activeIdx}` : undefined
            }
            autoComplete="off"
            spellCheck={false}
          />
          {showClear ? (
            <button
              type="button"
              className="srch-dialog-clear"
              aria-label={t(messages, 'placeholders.searchClearLabel')}
              onClick={onClear}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="14"
                height="14"
              >
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          ) : (
            <kbd className="srch-kbd srch-dialog-kbd">
              {t(messages, 'nav.searchKbd')}
            </kbd>
          )}
        </div>

        <ul
          id="srch-results"
          ref={resultsRef}
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
          {status.kind === 'idle' && (
            <li className="srch-dialog-status srch-dialog-status--idle">
              {t(messages, 'placeholders.searchHintIdle')}
            </li>
          )}
          {status.kind === 'empty' && (
            <li className="srch-dialog-status">
              {t(messages, 'placeholders.searchEmpty')}
            </li>
          )}
          {status.kind === 'error' && (
            <li className="srch-dialog-status">
              <span>{t(messages, 'placeholders.searchError')}</span>
              <span className="srch-dialog-error-detail">
                {(status as { kind: 'error'; message: string }).message}
              </span>
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
                  <span className="srch-dialog-title">{titleFromUrl(r.url)}</span>
                  <span className="srch-dialog-meta">{breadcrumbFromUrl(r.url)}</span>
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

/**
 * Derive a human title from the Pagefind result URL.
 * `/en/blog/nextjs/cache-components-model` → "Cache components model".
 * Falls back to the last path segment if the URL has no recognisable
 * shape (defensive — current Pagefind output always has it).
 */
function titleFromUrl(url: string): string {
  try {
    const path = new URL(url, 'https://nxhhuy.tech').pathname;
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1] ?? '';
    if (!last) return url;
    return last
      .split('-')
      .map((w) => (w.length === 0 ? w : w[0]?.toUpperCase() + w.slice(1)))
      .join(' ');
  } catch {
    return url;
  }
}

/**
 * Derive a breadcrumb from the URL segments.
 * `/en/blog/nextjs/cache-components-model` → "Next.js · Blog".
 * Used as a tiny meta line under the title so the result list reads
 * as a list of places in the corpus, not a wall of excerpts.
 */
function breadcrumbFromUrl(url: string): string {
  try {
    const path = new URL(url, 'https://nxhhuy.tech').pathname;
    const segments = path.split('/').filter(Boolean);
    // Drop the locale (always first) and the slug (always last).
    const middle = segments.slice(1, -1);
    if (middle.length === 0) return '';
    return middle
      .map((s) =>
        s
          .split('-')
          .map((w) => (w.length === 0 ? w : w[0]?.toUpperCase() + w.slice(1)))
          .join(' '),
      )
      .join(' · ');
  } catch {
    return '';
  }
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