/**
 * Throwaway fixture — not a corpus article, not under content/.
 *
 * Regression coverage for the RSC answer-key leak: `article-markdown.tsx`
 * builds `<Quiz>`'s props by calling `toClientQuizWidget()` — this is that
 * exact function, not a parallel helper nobody calls (that was the bug with
 * `toClientQuiz()` in `packages/content-schema`, which existed and passed
 * its own unit test while the real render path ignored it entirely).
 *
 * `renderArticleMarkdown()` itself cannot be unit-tested directly here: it
 * calls `cacheLife('max')` from `next/cache`, which throws
 * ("`cacheLife()` is only available with the `cacheComponents` config")
 * outside a real Next build/request — verified by hand before writing this
 * fixture. `toClientQuizWidget()` is the projection `article-markdown.tsx`
 * spreads onto `<Quiz>` without any Next-specific wrapping, so it is both
 * the actual render-path function and the one piece that is unit-testable
 * in isolation from Next.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toClientQuizWidget, type QuizWidget } from '../lib/article-widgets';

const widget: QuizWidget = {
  afterSection: 'warm-up',
  sidecar: {
    schema: 1,
    article_id: 'js-patterns',
    questions: [
      {
        id: 'q1',
        prompt: 'Which default did Next 16 invert?',
        language: 'ts',
        options: [
          { label: 'A', body: 'Cached by default', correct: false },
          { label: 'B', body: 'Uncached by default', correct: true },
        ],
        explanation: 'Cache Components made caching opt-in.',
      },
      {
        id: 'q2',
        prompt: 'Where does `correct` live before submit?',
        language: 'ts',
        options: [
          { label: 'A', body: 'Nowhere the client can read', correct: true },
          { label: 'B', body: 'In the Quiz props', correct: false },
        ],
        explanation: 'It stays server-side until the grade action runs.',
      },
    ],
  },
};

/** True if `key` appears on any plain object anywhere in `value`'s tree. */
function hasKeyDeep(value: unknown, key: string): boolean {
  if (Array.isArray(value)) return value.some((item) => hasKeyDeep(item, key));
  if (value !== null && typeof value === 'object') {
    if (Object.hasOwn(value, key)) return true;
    return Object.values(value).some((child) => hasKeyDeep(child, key));
  }
  return false;
}

test('sanity: the raw sidecar (pre-strip) does contain `correct` and `explanation`', () => {
  // Proves the assertions below are actually discriminating, not vacuously
  // true because the fixture never had the leaking fields to begin with.
  assert.equal(hasKeyDeep(widget.sidecar.questions, 'correct'), true);
  assert.equal(hasKeyDeep(widget.sidecar.questions, 'explanation'), true);
});

test('toClientQuizWidget (the actual render-path function) never emits `correct`', () => {
  const client = toClientQuizWidget('nextjs/js-patterns', widget);
  assert.equal(hasKeyDeep(client, 'correct'), false);
});

test('toClientQuizWidget (the actual render-path function) never emits `explanation`', () => {
  const client = toClientQuizWidget('nextjs/js-patterns', widget);
  assert.equal(hasKeyDeep(client, 'explanation'), false);
});

test('toClientQuizWidget output is exactly the prop shape spread onto <Quiz>', () => {
  const client = toClientQuizWidget('nextjs/js-patterns', widget);
  assert.deepEqual(Object.keys(client).sort(), ['articleUid', 'questions', 'schema']);
  assert.equal(client.articleUid, 'nextjs/js-patterns');
  assert.equal(client.schema, 1);
  assert.deepEqual(
    client.questions.map((question) => Object.keys(question).sort()),
    [
      ['code', 'id', 'language', 'options', 'prompt'],
      ['code', 'id', 'language', 'options', 'prompt'],
    ],
  );
  for (const question of client.questions) {
    for (const option of question.options) {
      assert.deepEqual(Object.keys(option).sort(), ['body', 'label']);
    }
  }
});

test('toClientQuizWidget preserves the non-secret question content', () => {
  const client = toClientQuizWidget('nextjs/js-patterns', widget);
  assert.equal(client.questions[0]?.prompt, 'Which default did Next 16 invert?');
  assert.deepEqual(client.questions[0]?.options, [
    { label: 'A', body: 'Cached by default' },
    { label: 'B', body: 'Uncached by default' },
  ]);
});
