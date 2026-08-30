import type { ArticleListItem } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';

/**
 * Post-header chrome for long-form reading on /en/blog/[corpus]/[slug].
 * Vendor-neutral port of prompts/design-spec-2026-08-blog.md §5.
 *
 * Three spec adaptations vs nxhhuy.tech constraints:
 * 1. Badge shows the corpus label (Next.js / React / Angular / NestJS),
 *    not a free-text category — the corpus has no author-curated tags.
 * 2. Meta row uses fields the corpus carries (corpus · kind · reading-time
 *    · baseline version). No author byline (personal-content boundary,
 *    .cursor/rules/20-never-violate.mdc), no publication date (corpus
 *    has no dates — roadmap.md §15.1).
 * 3. Pipe separator matches spec's `|` divider but uses the existing
 *    .meta mono uppercase tracking; no new colors.
 *
 * The shape mirrors the spec: badge → H1 → meta row → 40px gap → body.
 * The gap is the existing .av-mr border rule that comes next in the
 * article chrome.
 */
export function PostHeader({
  article,
  messages,
}: {
  article: ArticleListItem;
  messages: Messages;
}) {
  const corpusLabel = t(messages, `corpora.${article.repo}.label`);
  const kindLabel = t(
    messages,
    article.kind === 'recipe' ? 'article.kindRecipe' : 'article.kindConcept',
  );
  const readingTime = t(messages, 'blog.readingTime', { minutes: article.minutes });
  const baselineLabel = `${article.baseline.framework} ${article.baseline.version}`;

  return (
    <header className="post-header">
      <p className="post-header-badge meta">{corpusLabel}</p>
      <h1 className="post-header-title">{article.title}</h1>
      <div
        className="post-header-meta meta"
        aria-label={t(messages, 'blog.postMetaLabel')}
      >
        <span>{corpusLabel}</span>
        <span aria-hidden="true">|</span>
        <span>{kindLabel}</span>
        <span aria-hidden="true">|</span>
        <span>{readingTime}</span>
        <span aria-hidden="true">|</span>
        <span>{baselineLabel}</span>
      </div>
    </header>
  );
}