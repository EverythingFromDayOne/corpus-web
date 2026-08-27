export type QuizOption = {
  label: string;
  body: string;
  correct?: boolean;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  code?: string;
  language?: string;
  options: QuizOption[];
  explanation: string;
  afterSection?: string;
};

/**
 * The projection that is allowed to cross the server/client boundary before
 * a reader submits an answer. No `correct`, no `explanation` — those two
 * fields are the answer key and stay server-side until `QuizGradeAction`
 * hands back a `GradeResult` for the one question just answered.
 *
 * `apps/web` builds this same shape locally (`toClientQuizWidget` in
 * `article-widgets.ts`) because it does not import `@corpus/content-schema`;
 * this type is the contract the two sides agree on.
 */
export type ClientQuizOption = {
  label: string;
  body: string;
};

export type ClientQuizQuestion = {
  id: string;
  prompt: string;
  code?: string;
  language?: string;
  options: ClientQuizOption[];
};

export type GradeResult = {
  selectedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
  /** Only field carrying the "why" — released alongside the grade, never before. */
  explanation: string;
};

/**
 * Input to `QuizGradeAction`. Deliberately narrow: enough to look the
 * question up server-side again, nothing the client already knows the
 * answer to.
 */
export type QuizGradeInput = {
  articleUid: string;
  questionId: string;
  selectedLabel: string;
};

/**
 * A grading function that runs where the answer key lives (server-side —
 * a Next.js Server Action in `apps/web/lib/quiz-actions.ts`). The `Quiz`
 * component only ever holds a reference to this function, never the key
 * it closes over.
 */
export type QuizGradeAction = (input: QuizGradeInput) => Promise<GradeResult>;

export function correctLabelOf(question: QuizQuestion): string {
  const matches = question.options.filter((option) => option.correct);
  if (matches.length !== 1 || !matches[0]) {
    throw new Error(`question "${question.id}" must have exactly one correct option`);
  }
  return matches[0].label;
}

/** Grades a full (server-held) question. Never call this with client-received data. */
export function gradeQuestion(question: QuizQuestion, selectedLabel: string): GradeResult {
  const correctLabel = correctLabelOf(question);
  return {
    selectedLabel,
    correctLabel,
    isCorrect: selectedLabel === correctLabel,
    explanation: question.explanation,
  };
}

/** Unrevealed-options projection — same strip `toClientQuestion()` applies to a whole question. */
export function unrevealedOptions(question: QuizQuestion): ClientQuizOption[] {
  return question.options.map((option) => ({ label: option.label, body: option.body }));
}

/**
 * Strips `correct` and `explanation` off a full question. This is the
 * function that must run server-side, before the result is ever handed to
 * the `Quiz` client component as a prop — RSC serializes a client
 * component's entire prop tree into the initial payload regardless of what
 * the component renders, so hiding the answer key inside the component's
 * own render logic (as `unrevealedOptions()` alone does) is not enough.
 */
export function toClientQuestion(question: QuizQuestion): ClientQuizQuestion {
  return {
    id: question.id,
    prompt: question.prompt,
    code: question.code,
    language: question.language,
    options: unrevealedOptions(question),
  };
}

/** `data-mounted` on the verdict/explanation: false until the grade has painted. */
export function quizRevealMounted(hasVerdict: boolean, paintReady: boolean): 'true' | 'false' {
  return hasVerdict && paintReady ? 'true' : 'false';
}
