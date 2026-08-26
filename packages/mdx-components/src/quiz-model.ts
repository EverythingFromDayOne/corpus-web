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

/** Full sidecar shape the Quiz component receives. Matches content-schema. */
export type QuizSidecarProps = {
  schema: 1;
  article_id: string;
  questions: QuizQuestion[];
};

export type GradeResult = {
  selectedLabel: string;
  correctLabel: string;
  isCorrect: boolean;
};

export function correctLabelOf(question: QuizQuestion): string {
  const matches = question.options.filter((option) => option.correct);
  if (matches.length !== 1 || !matches[0]) {
    throw new Error(`question "${question.id}" must have exactly one correct option`);
  }
  return matches[0].label;
}

export function gradeQuestion(question: QuizQuestion, selectedLabel: string): GradeResult {
  const correctLabel = correctLabelOf(question);
  return {
    selectedLabel,
    correctLabel,
    isCorrect: selectedLabel === correctLabel,
  };
}

/** Unrevealed option list — same strip `toClientQuiz()` applies to options. */
export function unrevealedOptions(question: QuizQuestion): Array<{ label: string; body: string }> {
  return question.options.map((option) => ({ label: option.label, body: option.body }));
}
