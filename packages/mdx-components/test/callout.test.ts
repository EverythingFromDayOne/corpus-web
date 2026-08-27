import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calloutClassName, calloutSurfaceClass, calloutShouldReveal, renderInlineMarkdown, Callout } from '../src/callout';

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

test('initial callout HTML has av-callout without is-revealed', () => {
  const tree = Callout({ id: 'tip', variant: 'info', title: 'Tip', body: 'A note.' });
  assert.equal(tree.props.className, 'av-callout av-callout--info');
  assert.equal(tree.props.className.includes('is-revealed'), false);
  assert.equal(calloutSurfaceClass('info', false).includes('is-revealed'), false);
  assert.equal(calloutSurfaceClass('info', true), 'av-callout av-callout--info is-revealed');
});

test('calloutShouldReveal disconnects after the first intersecting entry', () => {
  assert.equal(calloutShouldReveal([{ isIntersecting: false }]), false);
  assert.equal(calloutShouldReveal([{ isIntersecting: true }]), true);
  assert.equal(calloutShouldReveal([{ isIntersecting: false }, { isIntersecting: true }]), true);
});
