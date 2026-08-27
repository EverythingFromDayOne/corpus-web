import type { ReactNode } from 'react';
import { CalloutReveal } from './callout-reveal';

export type CalloutVariant = 'info' | 'success' | 'warn' | 'error';

export type CalloutProps = {
  id: string;
  variant: CalloutVariant;
  title?: string;
  body: string;
};

export function calloutClassName(variant: CalloutVariant): string {
  return `av-callout av-callout--${variant}`;
}

export function calloutSurfaceClass(variant: CalloutVariant, revealed: boolean): string {
  const base = calloutClassName(variant);
  return revealed ? `${base} is-revealed` : base;
}

export { calloutShouldReveal } from './callout-reveal';

/**
 * Very small inline markdown: `**bold**` and `` `code` ``. No nested
 * callouts, no fenced blocks, no links.
 */
export function renderInlineMarkdown(input: string): ReactNode[] {
  const token = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = token.exec(input)) !== null) {
    if (match.index > last) {
      nodes.push(input.slice(last, match.index));
    }
    const chunk = match[0];
    if (chunk.startsWith('**')) {
      nodes.push(<strong key={key}>{chunk.slice(2, -2)}</strong>);
    } else {
      nodes.push(<code key={key}>{chunk.slice(1, -1)}</code>);
    }
    key += 1;
    last = match.index + chunk.length;
  }
  if (last < input.length) nodes.push(input.slice(last));
  return nodes;
}

export function Callout({ id, variant, title, body }: CalloutProps) {
  return (
    <CalloutReveal className={calloutClassName(variant)} data-callout={id}>
      {title ? <p className="av-callout-title">{title}</p> : null}
      <p className="av-callout-body">{renderInlineMarkdown(body)}</p>
    </CalloutReveal>
  );
}
