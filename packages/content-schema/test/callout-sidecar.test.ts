import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CalloutSidecar,
  CalloutSidecarFile,
  normaliseCalloutSidecars,
} from '../src/callout-sidecar.js';

test('CalloutSidecar accepts the four variants', () => {
  for (const variant of ['info', 'success', 'warn', 'error'] as const) {
    const parsed = CalloutSidecar.parse({
      id: `note-${variant}`,
      variant,
      body: 'Body text.',
      afterSection: 'warm-up',
    });
    assert.equal(parsed.variant, variant);
  }
});

test('CalloutSidecarFile envelope expands callouts[]', () => {
  const file = CalloutSidecarFile.parse({
    schema: 1,
    article_id: 'jsx-and-rendering',
    callouts: [
      { id: 'tip', variant: 'info', body: 'Tip body.', afterSection: 'how-it-works-under-the-hood' },
      { id: 'watch', variant: 'warn', body: 'Watch body.', afterSection: 'element--component--instance' },
    ],
  });
  const notes = normaliseCalloutSidecars(file);
  assert.equal(notes.length, 2);
  assert.equal(notes[0]?.variant, 'info');
  assert.equal(notes[1]?.variant, 'warn');
});
