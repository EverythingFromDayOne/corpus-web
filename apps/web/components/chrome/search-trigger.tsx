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
      <span className="meta">{t(messages, 'nav.search')}</span>
      <span aria-hidden="true" className="srch-trigger-input">
        {t(messages, 'placeholders.searchInput')}
      </span>
      <span aria-hidden="true" className="srch-kbd">
        {t(messages, 'nav.searchKbd')}
      </span>
    </button>
  );
}