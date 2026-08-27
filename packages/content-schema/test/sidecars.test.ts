/**
 * Quiz sidecar parsing and `toClientQuiz()` projection.
 *
 * Fixtures are inline objects, not files under any corpus `docs/` path.
 * Authoring real lesson YAML is a later task.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QuizSidecar, normaliseQuizBlocks, toClientQuiz } from '../src/sidecars.js';

const fixture = {
  schema: 1 as const,
  article_id: 'fixture-article',
  questions: [
    {
      id: 'q-cache-default',
      prompt: 'What happens to a server component with no cache directive?',
      language: 'ts',
      options: [
        { label: 'A', body: 'Cached until revalidated', correct: false },
        { label: 'B', body: 'Rendered per request', correct: true },
        { label: 'C', body: 'Cached for 60 seconds', correct: false },
      ],
      explanation: 'Next 16 inverted the default.',
      afterSection: 'warm-up',
    },
  ],
};

test('QuizSidecar accepts a well-formed local quiz', () => {
  const parsed = QuizSidecar.parse(fixture);
  assert.equal(parsed.questions?.length, 1);
  assert.equal(parsed.questions?.[0]?.options.filter((o) => o.correct).length, 1);
});

test('QuizSidecar rejects a question with zero or two correct options', () => {
  const none = {
    ...fixture,
    questions: [
      {
        ...fixture.questions[0]!,
        options: fixture.questions[0]!.options.map((o) => ({ ...o, correct: false })),
      },
    ],
  };
  assert.equal(QuizSidecar.safeParse(none).success, false);

  const two = {
    ...fixture,
    questions: [
      {
        ...fixture.questions[0]!,
        options: fixture.questions[0]!.options.map((o) => ({ ...o, correct: true })),
      },
    ],
  };
  assert.equal(QuizSidecar.safeParse(two).success, false);
});

test('toClientQuiz drops `correct` from every option and keeps labels', () => {
  const parsed = QuizSidecar.parse(fixture);
  const client = toClientQuiz(parsed);
  assert.equal(client.articleId, 'fixture-article');
  assert.equal(client.questions[0]?.options.length, 3);
  for (const option of client.questions[0]!.options) {
    assert.equal('correct' in option, false);
    assert.ok(option.label);
    assert.ok(option.body);
  }
  const encoded = JSON.stringify(client);
  assert.equal(encoded.includes('"correct"'), false);
});

function question(id: string, afterSection?: string) {
  return {
    id,
    prompt: `Prompt ${id}`,
    language: 'ts' as const,
    options: [
      { label: 'A', body: 'No', correct: false },
      { label: 'B', body: 'Yes', correct: true },
    ],
    explanation: 'Because the article said so.',
    ...(afterSection !== undefined ? { afterSection } : {}),
  };
}

test('QuizSidecar accepts quiz as a single block object', () => {
  const parsed = QuizSidecar.parse({
    schema: 1,
    article_id: 'fixture-article',
    quiz: {
      id: 'warmup',
      afterSection: 'warm-up',
      questions: [question('q-one')],
    },
  });
  const blocks = normaliseQuizBlocks(parsed);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0]?.id, 'warmup');
  assert.equal(blocks[0]?.afterSection, 'warm-up');
});

test('QuizSidecar accepts quiz as an array of blocks at different anchors', () => {
  const parsed = QuizSidecar.parse({
    schema: 1,
    article_id: 'fixture-article',
    quiz: [
      { id: 'hood', afterSection: 'how-it-works-under-the-hood', questions: [question('q-hood')] },
      { id: 'element', afterSection: 'element--component--instance', questions: [question('q-el')] },
      { id: 'end', afterSection: '', questions: [question('q-end')] },
    ],
  });
  const blocks = normaliseQuizBlocks(parsed);
  assert.equal(blocks.length, 3);
  assert.deepEqual(
    blocks.map((block) => block.afterSection),
    ['how-it-works-under-the-hood', 'element--component--instance', ''],
  );
});

test('QuizSidecar mix of afterSection empty and a heading slug in one sidecar', () => {
  const parsed = QuizSidecar.parse({
    schema: 1,
    article_id: 'fixture-article',
    questions: [question('q-inline', 'warm-up'), question('q-end', '')],
  });
  const blocks = normaliseQuizBlocks(parsed);
  assert.equal(blocks.length, 2);
  const anchors = new Set(blocks.map((block) => block.afterSection));
  assert.equal(anchors.has('warm-up'), true);
  assert.equal(anchors.has(''), true);
});

test('QuizSidecar rejects both questions and quiz on the same file', () => {
  const both = {
    schema: 1 as const,
    article_id: 'fixture-article',
    questions: [question('q1')],
    quiz: { id: 'block', afterSection: '', questions: [question('q2')] },
  };
  assert.equal(QuizSidecar.safeParse(both).success, false);
});
