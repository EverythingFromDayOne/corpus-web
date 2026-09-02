'use client';

import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import type { ClientQuizQuestion, GradeResult, QuizGradeAction } from './quiz-model';
import { quizRevealMounted } from './quiz-model';
import { WidgetRise } from './widget-rise';

export type QuizLabels = {
  eyebrow: string;
  progress: string;
  submit: string;
  next: string;
  /** Label shown when the user is on the last question. */
  finish: string;
  /** Tooltip / aria-label for the previous-question affordance. */
  previous: string;
  /** Tooltip / aria-label for the reset affordance. */
  reset: string;
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

/**
 * Reset glyph — single SVG so the component does not depend on an icon
 * library. Mirrors the circular-arrow icon in the sydexa reference.
 */
function ResetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/**
 * Chevron icon — left/right variants share one path shape. `direction` flips
 * the path horizontally rather than rotating, so it reads as a glyph rather
 * than as a reflected arrow.
 */
function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === 'left' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function Quiz({ schema, articleUid, questions, labels, gradeAction }: QuizProps) {
  const uid = useId();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paintReady, setPaintReady] = useState(false);
  /**
   * Per-question graded results, keyed by `question.id`. Keeping a Map (not a
   * single `result`) lets the reader navigate prev/next between answered
   * questions and see their previously-shown verdict again. `null` = not yet
   * graded.
   */
  const [results, setResults] = useState<Record<string, GradeResult | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, null])),
  );

  const total = questions.length;
  const currentQuestion = questions[index];
  const isValidSchema = schema === 1 && currentQuestion !== undefined;
  const result = isValidSchema && currentQuestion ? (results[currentQuestion.id] ?? null) : null;
  const submitted = result !== null;

  /* polish/react-jsx-key-hygiene: hooks must run unconditionally.
     React's `rules-of-hooks` lint rule flags hooks called after an
     early-return guard because hook order can desync across renders
     (sometimes the guard fires, sometimes it doesn't). The two
     conditional hooks below (`useEffect` + `useMemo`) are relocated
     ABOVE the `if (!isValidSchema) return null;` guard so the hook
     call order is stable across renders. The early-return still
     happens after the hooks run; the effect body itself reads
     `isValidSchema` to behave correctly when no question is at
     `index` (no setState in that case = nothing fires). */
  useEffect(() => {
    if (submitted || failed) {
      setPaintReady(true);
      return;
    }
    setPaintReady(false);
  }, [submitted, failed]);

  const visitedCount = useMemo(
    () => Object.values(results).filter((value) => value !== null).length,
    [results],
  );

  if (!isValidSchema || !currentQuestion) return null;
  // currentQuestion is now narrowed to Question (non-undefined) for the rest
  // of the render. The earlier `current = currentQuestion` was a no-op alias
  // that TypeScript's narrowing doesn't track — re-bind current here so the
  // rest of the function reads from the narrowed type.
  const current = currentQuestion;
  const hasNext = index < total - 1;
  const hasPrev = index > 0;
  const name = `${uid}-${current.id}`;
  const statusId = `${name}-status`;
  const explanationId = `${name}-explanation`;

  function gotoQuestion(nextIndex: number) {
    setIndex(nextIndex);
    setSelected(null);
    setFailed(false);
    setPaintReady(false);
  }

  function resetAll() {
    setIndex(0);
    setSelected(null);
    setFailed(false);
    setPaintReady(false);
    setResults(Object.fromEntries(questions.map((q) => [q.id, null])));
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
      setResults((previous) => ({ ...previous, [current.id]: graded }));
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
            const isCorrectOption = submitted && option.label === result!.correctLabel;
            const isWrongPick =
              submitted && option.label === result!.selectedLabel && !result!.isCorrect;
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
          <QuizVerdictBlock
            ok={result!.isCorrect}
            statusId={statusId}
            explanationId={explanationId}
            statusLabel={result!.isCorrect ? labels.correct : labels.incorrect}
            explanationLabel={labels.explanation}
            correctLabel={result!.correctLabel}
            explanation={result!.explanation}
            paintReady={paintReady}
          />
        ) : null}
        {/* Three-zone footer: reset (left) · pagination (centre) · primary CTA (right).
            Lives inside the <form> so the submit button stays in-form; reset and the
            chevrons are `type="button"` so they do not submit the form by accident. */}
        <div className="av-qz-ft" data-visited={visitedCount} data-total={total}>
          <button
            type="button"
            className="av-qz-reset"
            aria-label={labels.reset}
            title={labels.reset}
            disabled={visitedCount === 0}
            onClick={resetAll}
          >
            <ResetIcon />
          </button>
          <div className="av-qz-pag" role="group" aria-label={labels.progress}>
            <button
              type="button"
              className="av-qz-arrow"
              aria-label={labels.previous}
              title={labels.previous}
              disabled={!hasPrev}
              onClick={() => gotoQuestion(index - 1)}
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="av-qz-counter" aria-live="polite">
              {format(labels.progress, { current: index + 1, total })}
            </span>
            <button
              type="button"
              className="av-qz-arrow"
              aria-label={labels.next}
              title={labels.next}
              disabled={!hasNext}
              onClick={() => gotoQuestion(index + 1)}
            >
              <ChevronIcon direction="right" />
            </button>
          </div>
          {submitted ? (
            hasNext ? (
              <button
                type="button"
                className="av-qz-go"
                onClick={() => gotoQuestion(index + 1)}
              >
                {labels.next}
              </button>
            ) : (
              <button
                type="button"
                className="av-qz-go av-qz-finish"
                onClick={resetAll}
              >
                {labels.finish}
              </button>
            )
          ) : (
            <button className="av-qz-go" type="submit" disabled={!selected || pending}>
              {labels.submit}
            </button>
          )}
        </div>
      </form>
    </section>
    </WidgetRise>
  );
}
