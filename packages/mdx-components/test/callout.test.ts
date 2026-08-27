import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calloutClassName, renderInlineMarkdown } from '../src/callout';

test('calloutClassName applies the variant modifier', () => {
  assert.equal(calloutClassName('info'), 'av-callout av-callout--info');
  assert.equal(calloutClassName('warn'), 'av-callout av-callout--warn');
  assert.equal(calloutClassName('success'), 'av-callout av-callout--success');
  assert.equal(calloutClassName('error'), 'av-callout av-callout--error');
});

test('renderInlineMarkdown handles bold and inline code only', () => {
  const nodes = renderInlineMarkdown('Use `jsx()` not **innerHTML**.');
  const types = nodes.map((node) => {
    if (typeof node === 'string') return 'text';
    if (node && typeof node === 'object' && 'type' in node) {
      return (node as { type: unknown }).type;
    }
    return typeof node;
  });
  assert.deepEqual(types, ['text', 'code', 'text', 'strong', 'text']);
});
