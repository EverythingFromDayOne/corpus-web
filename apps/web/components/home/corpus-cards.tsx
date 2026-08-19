import type { CSSProperties } from 'react';
import type { Census, CorpusStats } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { blogCorpusPath, blogPath } from '@/lib/routes';

export function CensusReadout({
  census,
  messages,
}: {
  census: Census;
  messages: Messages;
}) {
  return (
    <div className="ls-readout" role="group" aria-label={t(messages, 'home.censusLabel')}>
      <div>
        <p className="n">{census.articles}</p>
        <p className="l">{t(messages, 'home.censusArticles')}</p>
      </div>
      <div>
        <p className="n">{census.edges}</p>
        <p className="l">{t(messages, 'home.censusLinks')}</p>
      </div>
      <div>
        <p className="n">{census.corpora}</p>
        <p className="l">{t(messages, 'home.censusCorpora')}</p>
      </div>
      <div>
        <p className="n warn">{census.unresolved}</p>
        <p className="l">{t(messages, 'home.censusUnresolved')}</p>
      </div>
    </div>
  );
}

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
    <section className="ls-sec" aria-labelledby="corpora-heading">
      <div className="ls-sechd">
        <h2 id="corpora-heading">{t(messages, 'home.corpusHeading')}</h2>
        <a className="ls-more" href={blogPath(locale)}>
          {t(messages, 'home.allArticles')}
        </a>
      </div>
      <div className="ls-grid ls-g2">
        {corpora.map((corpus) => {
          const pct =
            corpus.selected === 0 ? 0 : Math.round((corpus.adapting / corpus.selected) * 100);
          const partial = pct < 100;
          return (
            <a
              key={corpus.repo}
              className="ls-card"
              href={blogCorpusPath(locale, corpus.repo)}
            >
              <p className="meta">{t(messages, `corpora.${corpus.repo}.label`)}</p>
              <h3>{t(messages, `corpora.${corpus.repo}.scope`)}</h3>
              <p>{t(messages, `corpora.${corpus.repo}.blurb`)}</p>
              <div
                className={partial ? 'ls-bar ls-bar-part' : 'ls-bar'}
                style={{ '--ls-bar': `${pct}%` } as CSSProperties}
              >
                <i />
              </div>
              <div className="ls-card-foot">
                <span className="meta">
                  {t(messages, 'home.adaptingRatio', {
                    adapting: corpus.adapting,
                    selected: corpus.selected,
                  })}
                </span>
                <span className="ls-tag">{corpus.baseline.version}</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
