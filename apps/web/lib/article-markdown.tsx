import type { ReactNode } from 'react';
import { cacheLife } from 'next/cache';
import { createMarkdownRenderer } from 'fumadocs-core/content/md';
import { remarkGfm } from 'fumadocs-core/mdx-plugins';
import { CodeBlock, type CodeBlockLabels, Quiz, type QuizLabels, injectAfterSections } from '@corpus/mdx-components';
import { toClientQuizWidget, type QuizWidget } from '@/lib/article-widgets';
import { gradeQuizAnswer } from '@/lib/quiz-actions';
import type { Locale } from '@/lib/locales';
import { articlePath } from '@/lib/routes';
import { isRepoId } from '@/lib/repos';
import { remarkAssignHeadingIds } from '@/lib/heading-ids';
import { t, type Messages } from '@/lib/i18n';

const { MarkdownServer } = createMarkdownRenderer({
  remarkPlugins: [remarkGfm, remarkDropHtmlComments, remarkCodeExtract, remarkAssignHeadingIds],
});

type MdNode = {
  type?: string;
  value?: string;
  lang?: string | null;
  meta?: string | null;
  data?: { hProperties?: Record<string, string> };
  children?: MdNode[];
};

function walk(node: MdNode, visit: (n: MdNode) => void) {
  visit(node);
  node.children?.forEach((child) => walk(child, visit));
}

function remarkDropHtmlComments() {
  return (tree: MdNode) => {
    if (!tree.children) return;
    tree.children = tree.children.filter(
      (node) => !(node.type === 'html' && /^\s*<!--/.test(node.value ?? '')),
    );
  };
}

function remarkCodeExtract() {
  return (tree: MdNode) => {
    walk(tree, (node) => {
      if (node.type !== 'code') return;
      const meta = node.meta ?? '';
      const match = /extract=(\S+)/.exec(meta);
      if (!match?.[1]) return;
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, 'data-extract': match[1] },
      };
    });
  };
}

function flatten(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flatten).join('');
  if (typeof node === 'object' && 'props' in node) {
    const el = node as { props?: { children?: ReactNode } };
    return flatten(el.props?.children);
  }
  return '';
}

function resolveMarkdownHref(
  href: string,
  repo: string,
  locale: Locale,
  liveUids: string[],
): string | null {
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return href;
  if (/^https?:\/\//.test(href)) return href;
  const [path, hash] = href.split('#');
  if (!path) return hash ? `#${hash}` : null;
  const file = path.split('/').pop() ?? '';
  const slug = file.replace(/\.mdx?$/, '');
  if (!slug || !isRepoId(repo)) return null;
  const uid = `${repo}/${slug}`;
  if (!liveUids.includes(uid)) return null;
  const live = articlePath(locale, repo, slug);
  return hash ? `${live}#${hash}` : live;
}

function githubBlobBase(sourceUrl: string | null): string | null {
  if (!sourceUrl) return null;
  const match = /^(https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/[^/]+)\//.exec(sourceUrl);
  return match?.[1] ?? null;
}

export function hoistExtractComments(markdown: string): string {
  return markdown.replace(
    /<!--\s*extract:\s*(\S+)\s*-->\s*\n```([^\n]*)/g,
    (_full, extract: string, info: string) => `\`\`\`${info} extract=${extract}`,
  );
}

export function countExtracts(markdown: string): number {
  return (markdown.match(/extract=\S+/g) ?? []).length;
}

export async function renderArticleMarkdown({
  contentHash,
  markdown,
  repo,
  articleUid,
  locale,
  liveUids,
  messages,
  sourceUrl,
  widgets = [],
  widgetsKey = '',
}: {
  contentHash: string;
  markdown: string;
  repo: string;
  articleUid: string;
  locale: Locale;
  liveUids: string[];
  messages: Messages;
  sourceUrl: string | null;
  widgets?: QuizWidget[];
  widgetsKey?: string;
}): Promise<ReactNode> {
  'use cache';
  cacheLife('max');
  void contentHash;
  void widgetsKey;
  const labels: CodeBlockLabels = {
    copy: t(messages, 'article.copy'),
    copied: t(messages, 'article.copied'),
    download: t(messages, 'article.download'),
    expand: t(messages, 'article.expand'),
    extracted: t(messages, 'article.extracted'),
  };
  const blobBase = githubBlobBase(sourceUrl);
  const leadLabel = t(messages, 'article.lead');
  const quizLabels: QuizLabels = {
    eyebrow: t(messages, 'article.quizEyebrow'),
    progress: t(messages, 'article.quizProgress'),
    submit: t(messages, 'article.quizSubmit'),
    next: t(messages, 'article.quizNext'),
    correct: t(messages, 'article.quizCorrect'),
    incorrect: t(messages, 'article.quizIncorrect'),
    explanation: t(messages, 'article.quizExplanation'),
    error: t(messages, 'article.quizError'),
  };

  const body = await Promise.resolve(
    MarkdownServer({
      children: hoistExtractComments(markdown),
      components: {
        h1: () => null,
        h2: (props) => {
          const text = flatten(props.children);
          const id = typeof props.id === 'string' && props.id.length > 0 ? props.id : undefined;
          const part = /^(Part\s+\d+)\s+(.*)$/i.exec(text);
          if (part?.[1] && part[2]) {
            return (
              <h2 id={id}>
                <span className="av-pn">{part[1]}</span>
                {part[2]}
              </h2>
            );
          }
          return <h2 id={id}>{props.children}</h2>;
        },
        h3: (props) => {
          const id = typeof props.id === 'string' && props.id.length > 0 ? props.id : undefined;
          return <h3 id={id}>{props.children}</h3>;
        },
        a: (props) => {
          const href = typeof props.href === 'string' ? props.href : '';
          const resolved = resolveMarkdownHref(href, repo, locale, liveUids);
          if (!resolved) return <span>{props.children}</span>;
          return <a href={resolved}>{props.children}</a>;
        },
        blockquote: (props) => {
          const text = flatten(props.children);
          const lead = /^\s*Lead with this/i.test(text);
          return (
            <div className={lead ? 'av-hook' : 'av-co'}>
              {lead ? <div className="av-lab">{leadLabel}</div> : null}
              {props.children}
            </div>
          );
        },
        img: (props) => (
          <figure className="av-fig">
            <img alt={typeof props.alt === 'string' ? props.alt : ''} src={props.src} />
            {props.alt ? <figcaption className="av-cap">{String(props.alt)}</figcaption> : null}
          </figure>
        ),
        table: (props) => (
          <div className="av-tw">
            <table>{props.children}</table>
          </div>
        ),
        pre: (props) => {
          const extractValue = (props as { 'data-extract'?: unknown })['data-extract'];
          const extract = typeof extractValue === 'string' ? extractValue : undefined;
          const path = extract?.split('#')[0];
          const extractHref = blobBase && path ? `${blobBase}/${path}` : null;
          return (
            <CodeBlock
              className={props.className}
              labels={labels}
              extract={extract}
              extractHref={extractHref}
            >
              {props.children}
            </CodeBlock>
          );
        },
      },
    }),
  );

  if (widgets.length === 0) return body;

  return injectAfterSections(
    body,
    widgets.map((widget) => {
      // `correct` and `explanation` are dropped right here, before this ever
      // becomes a prop on the `'use client'` Quiz component — see
      // `toClientQuizWidget()` for why that has to happen on this side of
      // the boundary, not inside Quiz's own render logic.
      const client = toClientQuizWidget(articleUid, widget);
      return {
        afterSection: widget.afterSection,
        node: (
          <Quiz
            schema={client.schema}
            articleUid={client.articleUid}
            questions={client.questions}
            labels={quizLabels}
            gradeAction={gradeQuizAnswer}
          />
        ),
      };
    }),
  );
}
