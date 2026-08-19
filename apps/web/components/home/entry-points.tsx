import type { Census, CourseView } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { blogPath, coursePath } from '@/lib/routes';

export function EntryPoints({
  locale,
  featured,
  census,
  messages,
}: {
  locale: Locale;
  featured: CourseView | undefined;
  census: Census;
  messages: Messages;
}) {
  return (
    <section className="ls-sec" aria-labelledby="entries-heading">
      <div className="ls-split">
        <div className="ls-split-main">
          <div className="ls-sechd">
            <h2 id="entries-heading">{t(messages, 'home.entriesHeading')}</h2>
          </div>
          <div className="ls-grid ls-g3">
            {featured ? (
              <a className="ls-card" href={coursePath(locale, featured.slug)}>
                <p className="meta">{t(messages, 'home.entryCourseEyebrow')}</p>
                <h3>{t(messages, 'home.entryCourseTitle')}</h3>
                <p>{t(messages, 'home.entryCourseBody')}</p>
                <div className="ls-card-foot">
                  <span className="meta">
                    {t(messages, 'home.entryCourseFoot', { count: featured.lessonCount })}
                  </span>
                </div>
              </a>
            ) : null}
            <a className="ls-card" href={blogPath(locale)}>
              <p className="meta">{t(messages, 'home.entryBrowseEyebrow')}</p>
              <h3>{t(messages, 'home.entryBrowseTitle', { count: census.articles })}</h3>
              <p>{t(messages, 'home.entryBrowseBody')}</p>
              <div className="ls-card-foot">
                <span className="meta">
                  {t(messages, 'home.entryBrowseFoot', { count: census.corpora })}
                </span>
              </div>
            </a>
            <div className="ls-card ls-card-soon">
              <p className="meta">{t(messages, 'home.entryGraphEyebrow')}</p>
              <h3>{t(messages, 'home.entryGraphTitle')}</h3>
              <p>{t(messages, 'home.entryGraphBody', { count: census.edges })}</p>
              <div className="ls-card-foot">
                <span className="ls-tag ls-tag-soon">{t(messages, 'placeholders.comingSoon')}</span>
              </div>
            </div>
          </div>
        </div>
        <aside className="ls-split-side">
          <div className="ls-ph">
            <p className="ls-ph-lab">{t(messages, 'placeholders.comingSoon')}</p>
            <p className="ls-ph-title">{t(messages, 'placeholders.demoTitle')}</p>
            <p>{t(messages, 'placeholders.demoHint')}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function ReadingConventions({ messages }: { messages: Messages }) {
  return (
    <section className="ls-sec" aria-labelledby="reading-heading">
      <div className="ls-sechd">
        <h2 id="reading-heading">{t(messages, 'home.readingHeading')}</h2>
      </div>
      <ul className="ls-conv">
        <li>
          <span className="ls-tag ls-tag-concept">{t(messages, 'home.readingConceptLabel')}</span>
          <span>{t(messages, 'home.readingConcept')}</span>
        </li>
        <li>
          <span className="ls-tag ls-tag-recipe">{t(messages, 'home.readingRecipeLabel')}</span>
          <span>{t(messages, 'home.readingRecipe')}</span>
        </li>
        <li>
          <span className="ls-tag">{t(messages, 'home.readingBaselineLabel')}</span>
          <span>{t(messages, 'home.readingBaseline')}</span>
        </li>
        <li>
          <span className="ls-tag">{t(messages, 'home.readingProvenanceLabel')}</span>
          <span>{t(messages, 'home.readingProvenance')}</span>
        </li>
      </ul>
    </section>
  );
}
