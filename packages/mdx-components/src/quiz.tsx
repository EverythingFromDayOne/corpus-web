'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import type { ClientQuizQuestion, GradeResult, QuizGradeAction } from './quiz-model';
import { quizRevealMounted } from './quiz-model';
import { WidgetRise } from './widget-rise';

export type QuizLabels = {
  eyebrow: string;
  progress: string;
  submit: string;
  next: string;
  correct: string;
  incorrect: string;
  explanation: string;
  error: string;
};

export type QuizProps = {
  schema: 1;
  /** Globally-unique article id (`${repo}/${slug}`) — the grade action's lookup key. */
  articleUid: string;
  /** Already stripped of `correct` and `explanation` before this component ever saw it. */
  questions: ClientQuizQuestion[];
  labels: QuizLabels;
  /** Runs server-side. The answer key is looked up there, not held here. */
  gradeAction: QuizGradeAction;
};

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export type QuizVerdictBlockProps = {
  ok: boolean;
  statusId: string;
  explanationId: string;
  statusLabel: string;
  explanationLabel: string;
  correctLabel: string;
  explanation: string;
  paintReady: boolean;
};

/**
 * Verdict + explanation. Tests call this as a function so the tree exists
 * without `react-dom`. `data-mounted` stays `'false'` until `paintReady`.
 */
export function QuizVerdictBlock({
  ok,
  statusId,
  explanationId,
  statusLabel,
  explanationLabel,
  correctLabel,
  explanation,
  paintReady,
}: QuizVerdictBlockProps) {
  const mounted = quizRevealMounted(true, paintReady);
  return (
    <>
      <p className={`av-qz-verdict${ok ? ' ok' : ' no'}`} id={statusId} role="status" data-mounted={mounted}>
        {statusLabel}
      </p>
      <div className="av-qz-ex" id={explanationId} data-mounted={mounted}>
        <p className="av-qz-ex-l">{explanationLabel}</p>
        <p>
          <b>{correctLabel}.</b> {explanation}
        </p>
      </div>
    </>
  );
}

export function Quiz({ schema, articleUid, questions, labels, gradeAction }: QuizProps) {
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paintReady, setPaintReady] = useState(false);

  useEffect(() => {
    if (result !== null || failed) {
      setPaintReady(true);
      return;
    }
    setPaintReady(false);
  }, [result, failed]);

  const total = questions.length;
  const question = questions[index];
  if (schema !== 1 || question === undefined) return null;
  const current = question;

  const submitted = result !== null;
  const hasNext = index < total - 1;
  const name = `${uid}-${current.id}`;
  const statusId = `${name}-status`;
  const explanationId = `${name}-explanation`;

  function resetQuestion(nextIndex: number) {
    setIndex(nextIndex);
    setSelected(null);
    setResult(null);
    setFailed(false);
    setPaintReady(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitted || pending) return;
    setPending(true);
    setFailed(false);
    setPaintReady(false);
    try {
      const graded = await gradeAction({
        articleUid,
        questionId: current.id,
        selectedLabel: selected,
      });
      setResult(graded);
    } catch (error) {
      // PR #129 polish/quiz-error-and-flashcard-mobile: log the
      // underlying error so dev tools shows whether the failure
      // is a Vercel Preview auth 401 (the user's known
      // deployment config blocker) or a genuine code error from
      // the action body. The user-facing message stays the
      // generic `quizError` key — distinguishing auth-vs-code
      // in the UI requires leaking deployment details that don't
      // belong on a public reading surface.
      setFailed(true);
      console.error('gradeQuizAnswer failed:', error);
    } finally {
      setPending(false);
    }
  }

  return (
    <WidgetRise>
    <section className="av-qz" data-article={articleUid} aria-label={labels.eyebrow}>
      <header className="av-qz-hd">
        <span>{labels.eyebrow}</span>
        <span>{format(labels.progress, { current: index + 1, total })}</span>
      </header>
      <form className="av-qz-bd" onSubmit={onSubmit}>
        {current.code ? (
          <pre className="av-qz-code">
            <code>{current.code}</code>
          </pre>
        ) : null}
        <fieldset
          className="av-qz-opts"
          aria-describedby={submitted ? `${statusId} ${explanationId}` : undefined}
        >
          <legend className="av-qz-q">{current.prompt}</legend>
          {current.options.map((option) => {
            const optionId = `${name}-${option.label}`;
            const isCorrectOption = submitted && option.label === result.correctLabel;
            const isWrongPick =
              submitted && option.label === result.selectedLabel && !result.isCorrect;
            let stateClass = '';
            if (isCorrectOption) stateClass = ' ok';
            else if (isWrongPick) stateClass = ' no';
            return (
              <label key={option.label} className={`av-qz-opt${stateClass}`} htmlFor={optionId}>
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={option.label}
                  checked={selected === option.label}
                  disabled={submitted || pending}
                  required
                  onChange={() => setSelected(option.label)}
                />
                <span className="av-qz-lt" aria-hidden="true">
                  {option.label}
                </span>
                <span>{option.body}</span>
              </label>
            );
          })}
        </fieldset>
        {failed ? (
          <p
            className="av-qz-verdict no"
            role="alert"
            data-mounted={quizRevealMounted(true, paintReady)}
          >
            {labels.error}
          </p>
        ) : null}
        {submitted ? (
          <>
            <QuizVerdictBlock
              ok={result.isCorrect}
              statusId={statusId}
              explanationId={explanationId}
              statusLabel={result.isCorrect ? labels.correct : labels.incorrect}
              explanationLabel={labels.explanation}
              correctLabel={result.correctLabel}
              explanation={result.explanation}
              paintReady={paintReady}
            />
            {hasNext ? (
              <button className="av-qz-go" type="button" onClick={() => resetQuestion(index + 1)}>
                {labels.next}
              </button>
            ) : null}
          </>
        ) : (
          <button className="av-qz-go" type="submit" disabled={!selected || pending}>
            {labels.submit}
          </button>
        )}
      </form>
    </section>
    </WidgetRise>
  );
}
