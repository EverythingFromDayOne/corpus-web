import type { ReactElement, ReactNode } from 'react';
import { CodeBlockCopy, CodeBlockToolbar } from './code-block-controls';

export type CodeBlockLabels = {
  copy: string;
  copied: string;
  download: string;
  expand: string;
  extracted: string;
};

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (typeof node === 'object' && 'props' in node) {
    return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  }
  return '';
}

function parseExtract(raw: string | undefined): { path: string; symbol: string | null } | null {
  if (!raw) return null;
  const [path, symbol] = raw.split('#');
  if (!path) return null;
  return { path, symbol: symbol || null };
}

export function CodeBlock({
  children,
  className,
  labels,
  extract,
  extractHref,
  ...rest
}: {
  children?: ReactNode;
  className?: string;
  labels: CodeBlockLabels;
  extract?: string;
  extractHref?: string | null;
  [key: string]: unknown;
}) {
  const child = Array.isArray(children) ? children[0] : children;
  const props =
    child && typeof child === 'object' && 'props' in child
      ? (child as ReactElement<{ className?: string; children?: ReactNode; 'data-extract'?: string }>).props
      : undefined;
  const cls = props?.className ?? className ?? '';
  const langMatch = /language-([a-zA-Z0-9_+-]+)/.exec(cls);
  const lang = langMatch?.[1];
  const fromRest = typeof rest['data-extract'] === 'string' ? rest['data-extract'] : undefined;
  const extractRaw = extract ?? props?.['data-extract'] ?? fromRest;
  const code = textOf(props?.children ?? children);
  const provenance = parseExtract(extractRaw);
  const filename = provenance?.path.split('/').at(-1) ?? (lang ? `snippet.${lang}` : 'snippet.txt');

  // D20 polish: when children carry Shiki/rehype-pretty-code token spans
  // (an array of React elements rather than a plain text string), render
  // them verbatim inside the `<pre>` instead of re-splitting on `\n`.
  // The earlier behaviour discarded Shiki's nested `<span style="--shiki:…">`
  // markup by mapping each `\n`-separated line to a single `<span class="av-ln">`,
  // leaving the code block visually un-highlighted. With this branch, Shiki's
  // per-token spans + the `class="line"` markers (added by onVisitLine in
  // apps/web/lib/article-markdown.tsx) flow straight through to the DOM,
  // and the existing `.av-cb` CSS handles line-number gutters + token colours.
  const isShikiTree =
    Array.isArray(props?.children) &&
    typeof props?.children !== 'string' &&
    typeof props?.children?.[0] === 'object';

  return (
    <div className="av-cb">
      {provenance ? (
        <div className="av-prov">
          {extractHref ? (
            <a className="av-prov-path" href={extractHref}>
              {provenance.path}
            </a>
          ) : (
            <span className="av-prov-path">{provenance.path}</span>
          )}
          {provenance.symbol ? <span className="av-prov-sym">{provenance.symbol}</span> : null}
          <span className="av-prov-ok">{labels.extracted}</span>
        </div>
      ) : null}
      <div className="av-cbhd">
        {lang ? <span className="av-lang">{lang}</span> : null}
        <CodeBlockToolbar code={code} filename={filename} labels={labels} />
      </div>
      <pre className={className}>
        <code>
          {isShikiTree
            ? props?.children
            : code
                .replace(/\n$/, '')
                .split('\n')
                .map((line, index) => (
                  <span key={index} className="av-ln" data-n={index + 1}>
                    {line.length === 0 ? '\n' : line}
                  </span>
                ))}
        </code>
      </pre>
      <div className="av-cbft">
        <CodeBlockCopy code={code} labels={labels} />
      </div>
    </div>
  );
}
