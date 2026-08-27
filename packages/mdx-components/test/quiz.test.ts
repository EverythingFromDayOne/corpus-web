/**
 * Throwaway quiz fixture — not a corpus article, not under content/.
 */
import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { test } from 'node:test';
import { gradeQuestion, toClientQuestion, unrevealedOptions } from '../src/quiz-model';
import { END_OF_ARTICLE, injectAfterSections } from '../src/inject-after-sections';

const question = {
  id: 'q1',
  prompt: 'Which default did Next 16 invert?',
  options: [
    { label: 'A', body: 'Cached by default', correct: false },
    { label: 'B', body: 'Uncached by default', correct: true },
  ],
  explanation: 'Cache Components made caching opt-in.',
};

test('gradeQuestion accepts the correct label and rejects others, and carries the explanation', () => {
  assert.deepEqual(gradeQuestion(question, 'B'), {
    selectedLabel: 'B',
    correctLabel: 'B',
    isCorrect: true,
    explanation: question.explanation,
  });
  assert.equal(gradeQuestion(question, 'A').isCorrect, false);
});

test('gradeQuestion throws when the fixture has no unique correct option', () => {
  assert.throws(() =>
    gradeQuestion({ ...question, options: question.options.map((o) => ({ ...o, correct: false })) }, 'A'),
  );
});

test('unrevealedOptions drops `correct`', () => {
  const options = unrevealedOptions(question);
  for (const option of options) {
    assert.equal('correct' in option, false);
  }
});

test('toClientQuestion drops `correct` and `explanation` off the whole question', () => {
  const client = toClientQuestion(question);
  assert.equal('explanation' in client, false);
  for (const option of client.options) {
    assert.equal('correct' in option, false);
  }
  assert.deepEqual(client, {
    id: 'q1',
    prompt: 'Which default did Next 16 invert?',
    code: undefined,
    language: undefined,
    options: [
      { label: 'A', body: 'Cached by default' },
      { label: 'B', body: 'Uncached by default' },
    ],
  });
});

test('injectAfterSections places a node after the matching section body', () => {
  const quiz = createElement('aside', { 'data-quiz': '1' });
  const body = createElement(Fragment, null, [
    createElement('h2', { id: 'warm-up', key: 'h' }, 'Warm-up'),
    createElement('p', { key: 'p' }, 'Read this first.'),
    createElement('h2', { id: 'next-part', key: 'n' }, 'Next'),
  ]);
  const injected = injectAfterSections(body, [{ afterSection: 'warm-up', node: quiz }]);
  const kids = (injected as { props: { children: unknown[] } }).props.children;
  const types = (Array.isArray(kids) ? kids : [kids]).map((child) => {
    if (!child || typeof child !== 'object' || !('props' in child)) return '';
    const el = child as { type?: unknown; props?: { id?: string; 'data-quiz'?: string } };
    if (el.props?.['data-quiz']) return 'quiz';
    if (typeof el.type === 'string') return el.props?.id ? `${el.type}#${el.props.id}` : el.type;
    return '';
  });
  assert.deepEqual(types, ['h2#warm-up', 'p', 'quiz', 'h2#next-part']);
});

test('injectAfterSections appends END_OF_ARTICLE after the last section', () => {
  const quiz = createElement('aside', { 'data-quiz': 'end' });
  const body = createElement('div', null, [
    createElement('h2', { id: 'only', key: 'h' }, 'Only'),
    createElement('p', { key: 'p' }, 'Body.'),
  ]);
  const injected = injectAfterSections(body, [{ afterSection: END_OF_ARTICLE, node: quiz }]);
  const kids = (injected as { props: { children: unknown[] } }).props.children as unknown[];
  const last = kids.at(-1) as { props?: { 'data-quiz'?: string } };
  assert.equal(last.props?.['data-quiz'], 'end');
});

test('injectAfterSections throws when afterSection is missing from the tree', () => {
  const body = createElement('h2', { id: 'present' }, 'Present');
  assert.throws(
    () => injectAfterSections(body, [{ afterSection: 'absent', node: createElement('div') }]),
    /afterSection not found/,
  );
});

test('injectAfterSections mounts three .av-qz cards at three heading anchors', () => {
  const body = createElement(Fragment, null, [
    createElement('h2', { id: 'warm-up', key: 'a' }, 'Warm-up'),
    createElement('p', { key: 'ap' }, 'Intro.'),
    createElement('h2', { id: 'how-it-works-under-the-hood', key: 'b' }, 'How it works'),
    createElement('p', { key: 'bp' }, 'Body.'),
    createElement('h3', { id: 'element--component--instance', key: 'c' }, 'Element'),
    createElement('p', { key: 'cp' }, 'Distinction.'),
    createElement('h2', { id: 'basic-usage', key: 'd' }, 'Basic'),
  ]);
  const injected = injectAfterSections(body, [
    { afterSection: 'warm-up', node: createElement('section', { className: 'av-qz', 'data-quiz': '1' }) },
    {
      afterSection: 'how-it-works-under-the-hood',
      node: createElement('section', { className: 'av-qz', 'data-quiz': '2' }),
    },
    {
      afterSection: 'element--component--instance',
      node: createElement('section', { className: 'av-qz', 'data-quiz': '3' }),
    },
  ]);
  const types = childSummary(injected);
  assert.equal(types.filter((item) => item === 'quiz').length, 3);
  assert.deepEqual(types, [
    'h2#warm-up',
    'p',
    'quiz',
    'h2#how-it-works-under-the-hood',
    'p',
    'quiz',
    'h3#element--component--instance',
    'p',
    'quiz',
    'h2#basic-usage',
  ]);
});

test('injectAfterSections mix of afterSection empty and a heading slug', () => {
  const body = createElement(Fragment, null, [
    createElement('h2', { id: 'warm-up', key: 'h' }, 'Warm-up'),
    createElement('p', { key: 'p' }, 'Intro.'),
    createElement('h2', { id: 'next', key: 'n' }, 'Next'),
    createElement('p', { key: 'q' }, 'End body.'),
  ]);
  const injected = injectAfterSections(body, [
    { afterSection: 'warm-up', node: createElement('section', { className: 'av-qz', 'data-quiz': 'inline' }) },
    { afterSection: END_OF_ARTICLE, node: createElement('section', { className: 'av-qz', 'data-quiz': 'end' }) },
  ]);
  const types = childSummary(injected);
  assert.equal(types.filter((item) => item === 'quiz').length, 2);
  assert.equal(types[2], 'quiz');
  assert.equal(types.at(-1), 'quiz');
});

/**
 * fumadocs `MarkdownServer` does not emit native `h2`/`h3` nodes when those
 * tags are overridden: the tree child is the function component, and the
 * native heading exists only after React renders it. Production assigns the
 * catalog slug as `props.id` on that function (via a remark plugin); inject
 * must read it there, not only from `type === 'h2'`.
 */
function MarkdownHeading(props: { id?: string; children?: unknown }) {
  return createElement('h2', { id: props.id }, props.children as never);
}

function childSummary(node: unknown): string[] {
  const kids = (node as { props?: { children?: unknown } }).props?.children;
  const list = Array.isArray(kids) ? kids : kids == null ? [] : [kids];
  return list.map((child) => {
    if (!child || typeof child !== 'object' || !('props' in child)) return '';
    const el = child as {
      type?: unknown;
      props?: { id?: string; className?: string; 'data-quiz'?: string };
    };
    if (el.props?.['data-quiz'] || el.props?.className === 'av-qz') return 'quiz';
    if (typeof el.type === 'function') {
      return el.props?.id ? `heading#${el.props.id}` : 'heading';
    }
    if (typeof el.type === 'string') return el.props?.id ? `${el.type}#${el.props.id}` : el.type;
    return '';
  });
}

test('injectAfterSections places a node after a function-component heading slug', () => {
  const heading = 'How it works under the hood';
  const afterSection = heading.toLowerCase().replace(/[^\w\- ]/g, '').replace(/ /g, '-');
  assert.equal(afterSection, 'how-it-works-under-the-hood');
  const quiz = createElement('section', { className: 'av-qz', 'data-quiz': 'heading' });
  const body = createElement(Fragment, null, [
    createElement(MarkdownHeading, { id: afterSection, key: 'h' }, heading),
    createElement('p', { key: 'p' }, 'The compiler emits elements, not DOM nodes.'),
    createElement(MarkdownHeading, { id: 'basic-usage', key: 'n' }, 'Basic usage'),
  ]);
  const injected = injectAfterSections(body, [{ afterSection, node: quiz }]);
  assert.deepEqual(childSummary(injected), [
    'heading#how-it-works-under-the-hood',
    'p',
    'quiz',
    'heading#basic-usage',
  ]);
});

test('injectAfterSections still throws when a function-component heading has no matching id', () => {
  const body = createElement(MarkdownHeading, { id: 'present' }, 'Present');
  assert.throws(
    () =>
      injectAfterSections(body, [
        { afterSection: 'how-it-works-under-the-hood', node: createElement('div') },
      ]),
    /afterSection not found/,
  );
});
