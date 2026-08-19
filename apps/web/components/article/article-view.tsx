import type { ReactNode } from 'react';
import type { ArticleListItem, CatalogView, CourseView, Neighbor } from '@/lib/catalog';
import { relatedHref } from '@/lib/catalog';
import { t, type Messages } from '@/lib/i18n';
import type { Locale } from '@/lib/locales';
import { articlePath, blogPath, coursePath, coursesPath, homePath } from '@/lib/routes';
import { isRepoId, type RepoId } from '@/lib/repos';
import { corpusTree } from '@/lib/catalog';
import { REPOS } from '@/lib/repos';
import { renderArticleMarkdown, countExtracts, hoistExtractComments } from '@/lib/article-markdown';
import { railParts } from '@/lib/rail-parts';
import { ArticleProgressBar, ArticleScrim } from './article-shell';
import { CorpusSidebar, CurriculumSidebar } from './sidebars';
import { TocRail } from './toc-rail';
import './article.css';

export type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

export type ArticleChrome =
  | { variant: 'corpus' }
  | { variant: 'course'; course: CourseView };

export type ArticleViewProps = {
  locale: Locale;
  messages: Messages;
  view: CatalogView;
  article: ArticleListItem;
  markdown: string;
  chrome: ArticleChrome;
  breadcrumb: BreadcrumbCrumb[];
  prev: Neighbor | null;
  next: Neighbor | null;
  prevHref: string | null;
  nextHref: string | null;
  prevLabel: string;
  nextLabel: string;
  lead?: ReactNode;
};

function relatedItemHref(view: CatalogView, locale: Locale, uid: string): string | null {
  return relatedHref(view, locale, uid, (loc, id) => {
    const slash = id.indexOf('/');
    if (slash <= 0) return '';
    const repo = id.slice(0, slash);
    const slug = id.slice(slash + 1);
    if (!isRepoId(repo) || !slug) return '';
    return articlePath(loc, repo, slug);
  });
}

export async function ArticleView({
  locale,
  messages,
  view,
  article,
  markdown,
  chrome,
  breadcrumb,
  prev,
  next,
  prevHref,
  nextHref,
  prevLabel,
  nextLabel,
  lead,
}: ArticleViewProps) {
  const body = await renderArticleMarkdown({
    contentHash: article.contentHash,
    markdown,
    repo: article.repo,
    locale,
    liveUids: view.liveUids,
    messages,
    sourceUrl: article.sourceUrl,
  });
  const extractCount = countExtracts(hoistExtractComments(markdown));
  const collapseLabel = t(messages, 'article.collapseSidebar');
  const firstSlugs: Partial<Record<RepoId, string>> = {};
  for (const repo of REPOS) {
    const first = view.articles.find((item) => item.repo === repo);
    if (first) firstSlugs[repo] = first.articleId;
  }

  const sidebar =
    chrome.variant === 'course' ? (
      <CurriculumSidebar
        locale={locale}
        messages={messages}
        course={chrome.course}
        currentUid={article.uid}
        collapseLabel={collapseLabel}
      />
    ) : (
      <CorpusSidebar
        locale={locale}
        messages={messages}
        repo={article.repo}
        currentUid={article.uid}
        groups={corpusTree(view, article.repo)}
        firstSlugs={firstSlugs}
        collapseLabel={collapseLabel}
      />
    );

  return (
    <>
      <ArticleProgressBar />
      <div className="av-view">
        {sidebar}
        <main id="content" className="av-main">
          <div className="av-inner">
            <nav aria-label={t(messages, 'breadcrumb.label')}>
              <ol className="av-crumb meta">
                {breadcrumb.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`}>
                    {index > 0 ? (
                      <span className="av-sep" aria-hidden="true">
                        /
                      </span>
                    ) : null}{' '}
                    {crumb.href ? <a href={crumb.href}>{crumb.label}</a> : <span>{crumb.label}</span>}
                  </li>
                ))}
              </ol>
            </nav>
            <h1>{article.title}</h1>
            <p className="av-dek">{article.description}</p>
            <div className="av-mr meta">
              <div>
                {t(messages, 'article.baseline')}{' '}
                <b>
                  {article.baseline.framework} {article.baseline.version}
                </b>
              </div>
              <div>
                {t(messages, 'article.kind')}{' '}
                <b>{t(messages, article.kind === 'recipe' ? 'article.kindRecipe' : 'article.kindConcept')}</b>
              </div>
              {article.wave != null ? (
                <div>
                  {t(messages, 'article.wave')} <b>{article.wave}</b>
                </div>
              ) : null}
              {article.difficulty ? (
                <div>
                  {t(messages, 'article.difficulty')} <b>{article.difficulty}</b>
                </div>
              ) : null}
              {extractCount > 0 ? (
                <div className="av-verified">
                  {t(messages, 'article.blocksVerified', { count: extractCount })}
                </div>
              ) : null}
              {article.sourceUrl ? (
                <div>
                  <a className="av-source" href={article.sourceUrl}>
                    {t(messages, 'article.viewSource')}
                  </a>
                </div>
              ) : null}
            </div>
            {lead}
            <div className="av-prose">{body}</div>
            <RelatedList
              locale={locale}
              messages={messages}
              view={view}
              article={article}
            />
            <nav className="av-pnav" aria-label={t(messages, 'article.pageNav')}>
              {prev && prevHref ? (
                <a href={prevHref}>
                  <p className="av-pnav-l">{prevLabel}</p>
                  <p className="av-pnav-t">{prev.title}</p>
                </a>
              ) : (
                <span />
              )}
              {next && nextHref ? (
                <a className="nx" href={nextHref}>
                  <p className="av-pnav-l">{nextLabel}</p>
                  <p className="av-pnav-t">{next.title}</p>
                </a>
              ) : (
                <span />
              )}
            </nav>
          </div>
        </main>
        <TocRail
          uid={article.uid}
          parts={railParts(article.sections, (n) => t(messages, 'article.partEyebrow', { n })).map(
            (part) => ({
              ...part,
              jumpLabel: t(messages, 'article.jumpTo', {
                heading: `${part.eyebrow} ${part.partTitle}`,
              }),
            }),
          )}
        />
      </div>
      <ArticleScrim label={t(messages, 'article.closeSidebar')} />
    </>
  );
}

function RelatedList({
  locale,
  messages,
  view,
  article,
}: {
  locale: Locale;
  messages: Messages;
  view: CatalogView;
  article: ArticleListItem;
}) {
  if (article.related.length === 0) return null;
  return (
    <section className="av-related" aria-labelledby="av-related-heading">
      <h2 id="av-related-heading">{t(messages, 'article.related')}</h2>
      <ul>
        {article.related.map((ref) => {
          const href = relatedItemHref(view, locale, ref.uid);
          const title = view.byUid[ref.uid]?.title ?? ref.raw;
          return (
            <li key={`${ref.uid}:${ref.raw}`}>
              {href ? <a href={href}>{title}</a> : <span>{title}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function corpusBreadcrumb(
  locale: Locale,
  messages: Messages,
  article: ArticleListItem,
): BreadcrumbCrumb[] {
  return [
    { label: t(messages, 'breadcrumb.articles'), href: blogPath(locale) },
    { label: t(messages, `corpora.${article.repo}.label`), href: `${blogPath(locale)}#${article.repo}` },
    { label: article.title },
  ];
}

export function courseBreadcrumb(
  locale: Locale,
  messages: Messages,
  courseTitle: string,
  courseSlug: string,
  articleTitle: string,
): BreadcrumbCrumb[] {
  return [
    { label: t(messages, 'breadcrumb.home'), href: homePath(locale) },
    { label: t(messages, 'breadcrumb.courses'), href: coursesPath(locale) },
    { label: courseTitle, href: coursePath(locale, courseSlug) },
    { label: articleTitle },
  ];
}
