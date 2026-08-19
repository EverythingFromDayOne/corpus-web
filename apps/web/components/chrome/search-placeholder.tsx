import { t, type Messages } from '@/lib/i18n';

export function SearchPlaceholder({ messages }: { messages: Messages }) {
  return (
    <label className="srch" aria-disabled="true">
      <span className="meta">{t(messages, 'nav.search')}</span>
      <input
        type="search"
        disabled
        aria-disabled="true"
        tabIndex={-1}
        placeholder={t(messages, 'placeholders.comingSoon')}
      />
      <span className="srch-kbd">{t(messages, 'nav.searchKbd')}</span>
    </label>
  );
}
