/**
 * Load OverrideFile YAML from `curation/overrides/` and optional sidecars
 * beside an article (`.quiz.yaml`, `.flashcard.yaml`, `.callout.yaml`).
 * `apps/web` does not import `@corpus/content-schema` (Turbopack cannot
 * resolve that package's NodeNext `.js` specifiers), so the zod shapes
 * here are a local subset of sidecars.ts / flashcard-sidecar.ts /
 * callout-sidecar.ts / dragdrop-sidecar.ts / curation.ts.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import { z } from 'zod';
import { isRegisteredComponent, fallbackAnswerLine } from '@corpus/mdx-components';
import { articleFilePath, type ArticleListItem } from './catalog';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OVERRIDES_DIR = join(ROOT, 'curation', 'overrides');

const Slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const QuizOption = z.object({
  label: z.string().regex(/^[A-Z]$/),
  body: z.string().min(1),
  correct: z.boolean().default(false),
});

const QuizQuestion = z.object({
  id: Slug,
  prompt: z.string().min(1),
  code: z.string().optional(),
  language: z.string().default('ts'),
  options: z.array(QuizOption).min(2).max(6),
  explanation: z.string().min(1),
  afterSection: z.string().optional(),
});
type QuizQuestionData = z.infer<typeof QuizQuestion>;

const QuizBlock = z.object({
  id: Slug,
  title: z.string().min(1).optional(),
  afterSection: z.string(),
  questions: z.array(QuizQuestion).min(1),
});
type QuizBlockData = z.infer<typeof QuizBlock>;

function refineQuestion(question: QuizQuestionData, path: (string | number)[], ctx: z.RefinementCtx) {
  const correct = question.options.filter((option) => option.correct).length;
  if (correct !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: [...path, 'options'],
      message: `question "${question.id}" has ${correct} correct options — exactly one required`,
    });
  }
}

export const QuizSidecarData = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    questions: z.array(QuizQuestion).min(1).optional(),
    quiz: z.union([QuizBlock, z.array(QuizBlock).min(1)]).optional(),
  })
  .superRefine((sidecar, ctx) => {
    const hasQuestions = sidecar.questions !== undefined;
    const hasQuiz = sidecar.quiz !== undefined;
    if (hasQuestions === hasQuiz) {
      ctx.addIssue({
        code: 'custom',
        path: hasQuestions ? ['quiz'] : ['questions'],
        message: 'provide exactly one of `questions` or `quiz`',
      });
      return;
    }
    const questions = questionsOf(sidecar);
    questions.forEach((question, index) => refineQuestion(question, ['questions', index], ctx));
  });
export type QuizSidecarData = z.infer<typeof QuizSidecarData>;

/** One mounted quiz card after normalisation — always has `questions`. */
export const QuizWidgetSidecar = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    questions: z.array(QuizQuestion).min(1),
  })
  .superRefine((sidecar, ctx) => {
    sidecar.questions.forEach((question, index) => refineQuestion(question, ['questions', index], ctx));
  });
export type QuizWidgetSidecar = z.infer<typeof QuizWidgetSidecar>;

export const FlashcardSidecarData = z.object({
  id: Slug,
  title: z.string().min(1),
  afterSection: z.string(),
  cards: z
    .array(z.object({ front: z.string().min(1), back: z.string().min(1) }))
    .min(1),
});
export type FlashcardSidecarData = z.infer<typeof FlashcardSidecarData>;

export const CalloutSidecarData = z.object({
  id: Slug,
  variant: z.enum(['info', 'success', 'warn', 'error']),
  title: z.string().min(1).optional(),
  body: z.string().min(1),
  afterSection: z.string().optional(),
});
export type CalloutSidecarData = z.infer<typeof CalloutSidecarData>;

const DragDropSlot = z.object({
  id: Slug,
  label: z.string().min(1).optional(),
  accepts: z.array(Slug).min(1),
});

const DragDropChip = z.object({
  id: Slug,
  text: z.string().min(1),
  correctSlots: z.array(Slug),
});

export const DragDropSidecarData = z
  .object({
    id: Slug,
    title: z.string().min(1),
    afterSection: z.string(),
    mode: z.enum(['exact', 'ordered']).optional(),
    prompt: z.string().min(1).optional(),
    explanation: z.string().min(1).optional(),
    slots: z.array(DragDropSlot).min(1),
    chips: z.array(DragDropChip).min(1),
  })
  .superRefine((sidecar, ctx) => {
    const slotIds = sidecar.slots.map((slot) => slot.id);
    const chipIds = sidecar.chips.map((chip) => chip.id);
    const allIds = [...slotIds, ...chipIds];
    if (new Set(allIds).size !== allIds.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['slots'],
        message: 'slot ids and chip ids must be unique within the sidecar',
      });
    }
    const slotSet = new Set(slotIds);
    const chipSet = new Set(chipIds);
    sidecar.slots.forEach((slot, index) => {
      for (const chipId of slot.accepts) {
        if (!chipSet.has(chipId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['slots', index, 'accepts'],
            message: `slot "${slot.id}" accepts unknown chip "${chipId}"`,
          });
        }
      }
    });
    sidecar.chips.forEach((chip, index) => {
      for (const slotId of chip.correctSlots) {
        if (!slotSet.has(slotId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['chips', index, 'correctSlots'],
            message: `chip "${chip.id}" lists unknown slot "${slotId}"`,
          });
        }
      }
    });
  });
export type DragDropSidecarData = z.infer<typeof DragDropSidecarData>;

const OverrideInjection = z.object({
  afterSection: z.string(),
  component: z.string().regex(/^[A-Z][A-Za-z0-9]*$/),
  props: z.record(z.string(), z.unknown()).default({}),
});

const OverrideFile = z.object({
  schema: z.literal(1),
  article: z.string().min(1),
  inject: z.array(OverrideInjection).min(1),
});
export type OverrideFileData = z.infer<typeof OverrideFile>;

export type QuizWidget = {
  kind: 'quiz';
  afterSection: string;
  sidecar: QuizWidgetSidecar;
};

export type FlashcardWidget = {
  kind: 'flashcard';
  afterSection: string;
  sidecar: FlashcardSidecarData;
};

export type CalloutWidget = {
  kind: 'callout';
  afterSection: string;
  sidecar: CalloutSidecarData;
};

export type DragDropWidget = {
  kind: 'dragdrop';
  afterSection: string;
  sidecar: DragDropSidecarData;
};

/** Prompt name for the ArticleWidget union member. */
export type DragDropItem = DragDropWidget;

export type LessonWidget = QuizWidget | FlashcardWidget | CalloutWidget | DragDropWidget;

export type ClientQuizOption = { label: string; body: string };

export type ClientQuizQuestion = {
  id: string;
  prompt: string;
  code?: string;
  language: string;
  options: ClientQuizOption[];
};

export type ClientQuizWidget = {
  articleUid: string;
  schema: 1;
  questions: ClientQuizQuestion[];
};

export type ClientDragDropWidget = {
  articleUid: string;
  sidecarId: string;
  title: string;
  prompt?: string;
  explanation?: string;
  fallbackLine: string;
  slots: { id: string; label?: string }[];
  chips: { id: string; text: string }[];
};

function questionsOf(sidecar: {
  questions?: QuizQuestionData[];
  quiz?: QuizBlockData | QuizBlockData[];
}): QuizQuestionData[] {
  if (sidecar.questions) return sidecar.questions;
  if (!sidecar.quiz) return [];
  return Array.isArray(sidecar.quiz)
    ? sidecar.quiz.flatMap((block) => block.questions)
    : sidecar.quiz.questions;
}

export function normaliseQuizBlocks(sidecar: QuizSidecarData): QuizBlockData[] {
  if (sidecar.quiz) {
    return Array.isArray(sidecar.quiz) ? sidecar.quiz : [sidecar.quiz];
  }
  const questions = sidecar.questions ?? [];
  const groups = new Map<string, QuizQuestionData[]>();
  for (const question of questions) {
    const key = question.afterSection ?? '';
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }
  return [...groups.entries()].map(([afterSection, grouped], index) => ({
    id: `quiz-${index + 1}`,
    afterSection,
    questions: grouped,
  }));
}

function widgetSidecarFromBlock(articleId: string, block: QuizBlockData): QuizWidgetSidecar {
  return QuizWidgetSidecar.parse({
    schema: 1,
    article_id: articleId,
    questions: block.questions,
  });
}

/**
 * The exact projection `article-markdown.tsx` spreads onto `<Quiz>`. This is
 * the real render-path function, not an isolated helper — `correct` and
 * `explanation` are dropped here, before any widget data becomes a prop on
 * the `'use client'` `Quiz` component. RSC serializes a client component's
 * entire prop tree into the initial payload regardless of what it renders,
 * so stripping inside `Quiz` itself (as `unrevealedOptions()` alone does)
 * is too late — the leak this fixes shipped `correct` in that payload.
 *
 * Mirrors `toClientQuiz()` in `packages/content-schema/src/sidecars.ts`,
 * duplicated locally for the same reason the sidecar schema above is:
 * `apps/web` does not import `@corpus/content-schema`.
 */
export function toClientQuizWidget(articleUid: string, widget: QuizWidget): ClientQuizWidget {
  return {
    articleUid,
    schema: widget.sidecar.schema,
    questions: widget.sidecar.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      code: question.code,
      language: question.language,
      options: question.options.map((option) => ({ label: option.label, body: option.body })),
    })),
  };
}

/**
 * The projection `article-markdown.tsx` spreads onto `<DragDrop>`.
 * `accepts` and `correctSlots` are the answer key — dropped here, before
 * they can become props on the `'use client'` component. RSC serializes
 * the whole prop tree into the initial payload; stripping inside DragDrop
 * itself is too late.
 */
export function toClientDragDropWidget(articleUid: string, widget: DragDropWidget): ClientDragDropWidget {
  const sidecar = widget.sidecar;
  return {
    articleUid,
    sidecarId: sidecar.id,
    title: sidecar.title,
    prompt: sidecar.prompt,
    explanation: sidecar.explanation,
    fallbackLine: fallbackAnswerLine({
      slots: sidecar.slots,
      chips: sidecar.chips,
    }),
    slots: sidecar.slots.map((slot) => ({ id: slot.id, label: slot.label })),
    chips: sidecar.chips.map((chip) => ({ id: chip.id, text: chip.text })),
  };
}

function sidecarPathFor(article: ArticleListItem, ext: string): string {
  return articleFilePath(article).replace(/\.mdx?$/, ext);
}

function parseYamlFile(path: string): unknown {
  return YAML.parse(readFileSync(path, 'utf8'));
}

export function loadQuizSidecar(article: ArticleListItem): QuizSidecarData | null {
  const path = sidecarPathFor(article, '.quiz.yaml');
  if (!existsSync(path)) return null;
  const parsed = QuizSidecarData.safeParse(parseYamlFile(path));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
      .join('; ');
    throw new Error(`${path}: ${issues}`);
  }
  return parsed.data;
}

export function loadFlashcardSidecars(article: ArticleListItem): FlashcardSidecarData[] {
  const path = sidecarPathFor(article, '.flashcard.yaml');
  if (!existsSync(path)) return [];
  const raw = parseYamlFile(path);
  const single = FlashcardSidecarData.safeParse(raw);
  if (single.success) return [single.data];
  const envelope = z
    .object({
      schema: z.literal(1),
      article_id: Slug,
      flashcard: z.union([FlashcardSidecarData, z.array(FlashcardSidecarData).min(1)]),
    })
    .safeParse(raw);
  if (!envelope.success) {
    throw new Error(`${path}: flashcard sidecar failed schema validation`);
  }
  return Array.isArray(envelope.data.flashcard)
    ? envelope.data.flashcard
    : [envelope.data.flashcard];
}

export function loadCalloutSidecars(article: ArticleListItem): CalloutSidecarData[] {
  const path = sidecarPathFor(article, '.callout.yaml');
  if (!existsSync(path)) return [];
  const raw = parseYamlFile(path);
  const single = CalloutSidecarData.safeParse(raw);
  if (single.success) return [single.data];
  const envelope = z
    .object({
      schema: z.literal(1),
      article_id: Slug,
      callouts: z.array(CalloutSidecarData).min(1),
    })
    .safeParse(raw);
  if (!envelope.success) {
    throw new Error(`${path}: callout sidecar failed schema validation`);
  }
  return envelope.data.callouts;
}

export function loadDragDropSidecars(article: ArticleListItem): DragDropSidecarData[] {
  const path = sidecarPathFor(article, '.dragdrop.yaml');
  if (!existsSync(path)) return [];
  const raw = parseYamlFile(path);
  const single = DragDropSidecarData.safeParse(raw);
  if (single.success) return [single.data];
  const envelope = z
    .object({
      schema: z.literal(1),
      article_id: Slug,
      dragdrop: z.union([DragDropSidecarData, z.array(DragDropSidecarData).min(1)]),
    })
    .safeParse(raw);
  if (!envelope.success) {
    throw new Error(`${path}: dragdrop sidecar failed schema validation`);
  }
  return Array.isArray(envelope.data.dragdrop) ? envelope.data.dragdrop : [envelope.data.dragdrop];
}

export function loadArticleOverrides(articleUid: string): OverrideFileData[] {
  if (!existsSync(OVERRIDES_DIR)) return [];
  const files = readdirSync(OVERRIDES_DIR).filter(
    (file) => file.endsWith('.yaml') || file.endsWith('.yml'),
  );
  const matched: OverrideFileData[] = [];
  for (const file of files) {
    const path = join(OVERRIDES_DIR, file);
    const raw = YAML.parse(readFileSync(path, 'utf8'));
    const parsed = OverrideFile.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
        .join('; ');
      throw new Error(`curation/overrides/${file}: ${issues}`);
    }
    if (parsed.data.article !== articleUid) continue;
    for (const injection of parsed.data.inject) {
      if (!isRegisteredComponent(injection.component)) {
        throw new Error(
          `curation/overrides/${file}: component "${injection.component}" is not in the mdx-components registry`,
        );
      }
    }
    matched.push(parsed.data);
  }
  return matched;
}

function looksLikeQuiz(props: Record<string, unknown>): boolean {
  return Array.isArray(props.questions) || props.quiz !== undefined;
}

function looksLikeFlashcard(props: Record<string, unknown>): boolean {
  return Array.isArray(props.cards);
}

function looksLikeCallout(props: Record<string, unknown>): boolean {
  return typeof props.body === 'string' && typeof props.variant === 'string';
}

function looksLikeDragDrop(props: Record<string, unknown>): boolean {
  return Array.isArray(props.slots) && Array.isArray(props.chips);
}

function quizWidgetsFromSidecar(sidecar: QuizSidecarData): QuizWidget[] {
  return normaliseQuizBlocks(sidecar).map((block) => ({
    kind: 'quiz' as const,
    afterSection: block.afterSection,
    sidecar: widgetSidecarFromBlock(sidecar.article_id, block),
  }));
}

/**
 * Resolve lesson widgets for one article.
 *
 * Overrides are the working mechanism (D35). Corpus sidecars auto-place
 * leftover quizzes / flashcards / callouts by `afterSection` (empty = end
 * of article). Override props that include the widget payload win over the
 * sidecar for that injection.
 */
export function resolveLessonWidgets(
  article: ArticleListItem,
  quizSidecar: QuizSidecarData | null,
  flashcards: FlashcardSidecarData[],
  callouts: CalloutSidecarData[],
  overrides: OverrideFileData[],
  dragdrops: DragDropSidecarData[] = [],
): LessonWidget[] {
  const widgets: LessonWidget[] = [];
  const usedQuestions = new Set<string>();
  const usedFlashcards = new Set<string>();
  const usedCallouts = new Set<string>();
  const usedDragDrops = new Set<string>();

  for (const file of overrides) {
    for (const injection of file.inject) {
      if (injection.component === 'Quiz') {
        let quiz: QuizSidecarData;
        if (looksLikeQuiz(injection.props)) {
          const parsed = QuizSidecarData.safeParse(
            injection.props.schema === 1
              ? injection.props
              : { schema: 1, article_id: article.articleId, ...injection.props },
          );
          if (!parsed.success) {
            throw new Error(`${article.uid}: Quiz override props failed schema validation`);
          }
          quiz = parsed.data;
        } else if (quizSidecar) {
          const sectionQuestions = questionsOf(quizSidecar).filter(
            (question) => question.afterSection === injection.afterSection,
          );
          const fallback = questionsOf(quizSidecar).filter((question) => !question.afterSection);
          const questions = sectionQuestions.length > 0 ? sectionQuestions : fallback;
          if (questions.length === 0) {
            throw new Error(
              `${article.uid}: Quiz override after "${injection.afterSection}" has no questions`,
            );
          }
          quiz = { schema: 1, article_id: quizSidecar.article_id, questions };
        } else {
          throw new Error(
            `${article.uid}: Quiz override after "${injection.afterSection}" has neither props.questions nor a sidecar`,
          );
        }
        for (const widget of quizWidgetsFromSidecar(quiz)) {
          widgets.push({ ...widget, afterSection: injection.afterSection || widget.afterSection });
          for (const question of widget.sidecar.questions) usedQuestions.add(question.id);
        }
      } else if (injection.component === 'Flashcard') {
        let card: FlashcardSidecarData;
        if (looksLikeFlashcard(injection.props)) {
          const parsed = FlashcardSidecarData.safeParse({
            afterSection: injection.afterSection,
            ...injection.props,
          });
          if (!parsed.success) {
            throw new Error(`${article.uid}: Flashcard override props failed schema validation`);
          }
          card = parsed.data;
        } else {
          const match = flashcards.find((item) => item.afterSection === injection.afterSection);
          if (!match) {
            throw new Error(
              `${article.uid}: Flashcard override after "${injection.afterSection}" has neither props.cards nor a sidecar`,
            );
          }
          card = match;
        }
        widgets.push({ kind: 'flashcard', afterSection: injection.afterSection, sidecar: card });
        usedFlashcards.add(card.id);
      } else if (injection.component === 'Callout') {
        let note: CalloutSidecarData;
        if (looksLikeCallout(injection.props)) {
          const parsed = CalloutSidecarData.safeParse({
            afterSection: injection.afterSection,
            ...injection.props,
          });
          if (!parsed.success) {
            throw new Error(`${article.uid}: Callout override props failed schema validation`);
          }
          note = parsed.data;
        } else {
          const match = callouts.find((item) => (item.afterSection ?? '') === injection.afterSection);
          if (!match) {
            throw new Error(
              `${article.uid}: Callout override after "${injection.afterSection}" has neither props.body nor a sidecar`,
            );
          }
          note = match;
        }
        widgets.push({
          kind: 'callout',
          afterSection: injection.afterSection,
          sidecar: note,
        });
        usedCallouts.add(note.id);
      } else if (injection.component === 'DragDrop') {
        let exercise: DragDropSidecarData;
        if (looksLikeDragDrop(injection.props)) {
          const parsed = DragDropSidecarData.safeParse({
            afterSection: injection.afterSection,
            ...injection.props,
          });
          if (!parsed.success) {
            throw new Error(`${article.uid}: DragDrop override props failed schema validation`);
          }
          exercise = parsed.data;
        } else {
          const match = dragdrops.find((item) => item.afterSection === injection.afterSection);
          if (!match) {
            throw new Error(
              `${article.uid}: DragDrop override after "${injection.afterSection}" has neither props.slots nor a sidecar`,
            );
          }
          exercise = match;
        }
        widgets.push({
          kind: 'dragdrop',
          afterSection: injection.afterSection,
          sidecar: exercise,
        });
        usedDragDrops.add(exercise.id);
      } else {
        throw new Error(
          `${article.uid}: override component "${injection.component}" has no render path yet`,
        );
      }
    }
  }

  if (quizSidecar) {
    for (const widget of quizWidgetsFromSidecar(quizSidecar)) {
      const unused = widget.sidecar.questions.filter((question) => !usedQuestions.has(question.id));
      if (unused.length === 0) continue;
      widgets.push({
        ...widget,
        sidecar: { ...widget.sidecar, questions: unused },
      });
    }
  }

  for (const card of flashcards) {
    if (usedFlashcards.has(card.id)) continue;
    widgets.push({ kind: 'flashcard', afterSection: card.afterSection, sidecar: card });
  }
  for (const note of callouts) {
    if (usedCallouts.has(note.id)) continue;
    widgets.push({
      kind: 'callout',
      afterSection: note.afterSection ?? '',
      sidecar: note,
    });
  }
  for (const exercise of dragdrops) {
    if (usedDragDrops.has(exercise.id)) continue;
    widgets.push({
      kind: 'dragdrop',
      afterSection: exercise.afterSection,
      sidecar: exercise,
    });
  }

  return widgets;
}

/**
 * Quiz-only view of `resolveLessonWidgets`. `gradeQuizAnswer` (quiz-actions.ts)
 * looks questions up through this function — keep the return shape a list of
 * quiz widgets whose `sidecar.questions` still carry `correct`.
 */
export function resolveQuizWidgets(
  article: ArticleListItem,
  sidecar: QuizSidecarData | null,
  overrides: OverrideFileData[],
): QuizWidget[] {
  return resolveLessonWidgets(article, sidecar, [], [], overrides).filter(
    (widget): widget is QuizWidget => widget.kind === 'quiz',
  );
}

export function widgetsCacheKey(widgets: LessonWidget[]): string {
  return createHash('sha256').update(JSON.stringify(widgets)).digest('hex');
}

export function loadArticleLessonWidgets(article: ArticleListItem): LessonWidget[] {
  const quizSidecar = loadQuizSidecar(article);
  const flashcards = loadFlashcardSidecars(article);
  const callouts = loadCalloutSidecars(article);
  const dragdrops = loadDragDropSidecars(article);
  const overrides = loadArticleOverrides(article.uid);
  return resolveLessonWidgets(article, quizSidecar, flashcards, callouts, overrides, dragdrops);
}

export function loadArticleQuizWidgets(article: ArticleListItem): QuizWidget[] {
  return loadArticleLessonWidgets(article).filter(
    (widget): widget is QuizWidget => widget.kind === 'quiz',
  );
}

export function loadArticleDragDropWidgets(article: ArticleListItem): DragDropWidget[] {
  return loadArticleLessonWidgets(article).filter(
    (widget): widget is DragDropWidget => widget.kind === 'dragdrop',
  );
}
