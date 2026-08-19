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
  const lines = code.replace(/\n$/, '').split('\n');
  const filename = provenance?.path.split('/').at(-1) ?? (lang ? `snippet.${lang}` : 'snippet.txt');

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
          {lines.map((line, index) => (
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
