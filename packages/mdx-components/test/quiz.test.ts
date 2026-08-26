/**
 * Throwaway quiz fixture — not a corpus article, not under content/.
 */
import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { test } from 'node:test';
import { gradeQuestion, unrevealedOptions } from '../src/quiz-model';
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

test('gradeQuestion accepts the correct label and rejects others', () => {
  assert.deepEqual(gradeQuestion(question, 'B'), {
    selectedLabel: 'B',
    correctLabel: 'B',
    isCorrect: true,
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
