'use client';

import { useId, useState, type FormEvent } from 'react';
import type { ClientQuizQuestion, GradeResult, QuizGradeAction } from './quiz-model';

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

export function Quiz({ schema, articleUid, questions, labels, gradeAction }: QuizProps) {
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

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
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || submitted || pending) return;
    setPending(true);
    setFailed(false);
    try {
      const graded = await gradeAction({
        articleUid,
        questionId: current.id,
        selectedLabel: selected,
      });
      setResult(graded);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }

  return (
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
          <p className="av-qz-verdict no" role="alert">
            {labels.error}
          </p>
        ) : null}
        {submitted ? (
          <>
            <p
              className={`av-qz-verdict${result.isCorrect ? ' ok' : ' no'}`}
              id={statusId}
              role="status"
            >
              {result.isCorrect ? labels.correct : labels.incorrect}
            </p>
            <div className="av-qz-ex" id={explanationId}>
              <p className="av-qz-ex-l">{labels.explanation}</p>
              <p>
                <b>{result.correctLabel}.</b> {result.explanation}
              </p>
            </div>
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
  );
}
