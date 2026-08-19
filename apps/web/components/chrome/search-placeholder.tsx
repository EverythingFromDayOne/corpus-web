import { t, type Messages } from '@/lib/i18n';

export function SearchPlaceholder({ messages }: { messages: Messages }) {
  return (
    <label className="border-graphite bg-surface flex max-w-56 cursor-not-allowed items-center gap-2 rounded-md border px-3 py-1.5 opacity-60">
      <span className="sr-only">{t(messages, 'placeholders.search')}</span>
      <input
        type="search"
        disabled
        aria-disabled="true"
        placeholder={t(messages, 'placeholders.search')}
        className="placeholder:text-muted w-full bg-transparent text-sm outline-none"
      />
      <span className="meta">{t(messages, 'placeholders.comingSoon')}</span>
    </label>
  );
}
