'use client';

import { t, type Messages } from '@/lib/i18n';

/**
 * Trigger button for the global search dialog. Visually identical to the
 * old disabled <SearchPlaceholder> but rendered as a real <button> with
 * an aria-label, click handler, and full keyboard focusability.
 *
 * The dialog itself is mounted once at the [locale]/layout level; this
 * trigger just calls `window.__corpusSearch.open()` to raise it.
 */
export function SearchTrigger({ messages }: { messages: Messages }) {
  return (
    <button
      type="button"
      className="srch srch-trigger"
      onClick={() => window.dispatchEvent(new CustomEvent('corpus:open-search'))}
      aria-label={t(messages, 'placeholders.searchTriggerLabel')}
      aria-keyshortcuts="Meta+K Control+K"
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
        className="srch-trigger-icon shrink-0"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span aria-hidden="true" className="srch-trigger-input">
        {t(messages, 'placeholders.searchInput')}
      </span>
      <span aria-hidden="true" className="srch-kbd">
        {t(messages, 'nav.searchKbd')}
      </span>
    </button>
  );
}