import type { CorpusStats } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { blogCorpusPath } from '@/lib/routes';

export function CorpusCards({
  locale,
  corpora,
  messages,
}: {
  locale: Locale;
  corpora: CorpusStats[];
  messages: Messages;
}) {
  return (
    <section aria-labelledby="corpora-heading">
      <h2 id="corpora-heading" className="text-2xl">
        {t(messages, 'home.corpusHeading')}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {corpora.map((corpus) => (
          <li key={corpus.repo}>
            <a
              href={blogCorpusPath(locale, corpus.repo)}
              className="border-graphite bg-surface hover:border-muted block rounded-md border p-5 no-underline"
            >
              <p className="meta">{t(messages, `corpora.${corpus.repo}.label`)}</p>
              <p className="text-display mt-2 text-lg">{t(messages, `corpora.${corpus.repo}.scope`)}</p>
              <p className="text-muted mt-3 text-sm">
                {t(messages, 'home.adaptingCount', { adapting: corpus.adapting })}
                {' · '}
                {t(messages, 'home.selectedCount', { selected: corpus.selected })}
              </p>
              <p className="meta mt-2">
                {t(messages, 'home.baseline', {
                  framework: corpus.baseline.framework,
                  version: corpus.baseline.version,
                })}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DemoLabsPlaceholder({ messages }: { messages: Messages }) {
  return (
    <div className="border-graphite bg-surface mt-4 rounded-md border p-5 opacity-60">
      <p className="meta">{t(messages, 'placeholders.comingSoon')}</p>
      <p className="text-display mt-2">{t(messages, 'placeholders.demoLabsTitle')}</p>
      <p className="text-muted mt-2 text-sm">{t(messages, 'placeholders.demoLabsHint')}</p>
    </div>
  );
}

export function DemoPlaceholder({ messages }: { messages: Messages }) {
  return (
    <aside className="border-graphite bg-surface rounded-md border p-5 opacity-60">
      <p className="meta">{t(messages, 'placeholders.comingSoon')}</p>
      <p className="text-display mt-2">{t(messages, 'placeholders.demoTitle')}</p>
      <p className="text-muted mt-2 text-sm">{t(messages, 'placeholders.demoHint')}</p>
    </aside>
  );
}
