/**
 * Load OverrideFile YAML from `curation/overrides/` and optional `.quiz.yaml`
 * sidecars beside an article. `apps/web` does not import `@corpus/content-schema`
 * (Turbopack cannot resolve that package's NodeNext `.js` specifiers), so the
 * zod shapes here are a local subset of sidecars.ts / curation.ts.
 *
 * No override files or sidecars exist yet. This is the mechanism; lesson YAML
 * is a later task.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import YAML from 'yaml';
import { z } from 'zod';
import { isRegisteredComponent } from '@corpus/mdx-components';
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

export const QuizSidecarData = z
  .object({
    schema: z.literal(1),
    article_id: Slug,
    questions: z.array(QuizQuestion).min(1),
  })
  .superRefine((sidecar, ctx) => {
    sidecar.questions.forEach((question, index) => {
      const correct = question.options.filter((option) => option.correct).length;
      if (correct !== 1) {
        ctx.addIssue({
          code: 'custom',
          path: ['questions', index, 'options'],
          message: `question "${question.id}" has ${correct} correct options — exactly one required`,
        });
      }
    });
  });
export type QuizSidecarData = z.infer<typeof QuizSidecarData>;

const OverrideInjection = z.object({
  afterSection: z.string().min(1),
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
  afterSection: string;
  sidecar: QuizSidecarData;
};

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

function sidecarPathFor(article: ArticleListItem): string {
  return articleFilePath(article).replace(/\.mdx?$/, '.quiz.yaml');
}

export function loadQuizSidecar(article: ArticleListItem): QuizSidecarData | null {
  const path = sidecarPathFor(article);
  if (!existsSync(path)) return null;
  const raw = YAML.parse(readFileSync(path, 'utf8'));
  const parsed = QuizSidecarData.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'} ${issue.message}`)
      .join('; ');
    throw new Error(`${path}: ${issues}`);
  }
  return parsed.data;
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
  return Array.isArray(props.questions);
}

function groupQuestions(questions: QuizSidecarData['questions']): Map<string, QuizSidecarData['questions']> {
  const groups = new Map<string, QuizSidecarData['questions']>();
  for (const question of questions) {
    const key = question.afterSection ?? '';
    const list = groups.get(key) ?? [];
    list.push(question);
    groups.set(key, list);
  }
  return groups;
}

/**
 * Resolve Quiz widgets for one article.
 *
 * Overrides (`component: Quiz`) are the working mechanism (D35). A corpus
 * sidecar auto-places leftover questions by `afterSection` (empty = end of
 * article). Override props that include `questions` win over the sidecar for
 * that injection.
 */
export function resolveQuizWidgets(
  article: ArticleListItem,
  sidecar: QuizSidecarData | null,
  overrides: OverrideFileData[],
): QuizWidget[] {
  const widgets: QuizWidget[] = [];
  const used = new Set<string>();

  for (const file of overrides) {
    for (const injection of file.inject) {
      if (injection.component !== 'Quiz') {
        throw new Error(
          `${article.uid}: override component "${injection.component}" has no render path yet`,
        );
      }
      let quiz: QuizSidecarData;
      if (looksLikeQuiz(injection.props)) {
        const parsed = QuizSidecarData.safeParse(injection.props);
        if (!parsed.success) {
          throw new Error(`${article.uid}: Quiz override props failed schema validation`);
        }
        quiz = parsed.data;
      } else if (sidecar) {
        const sectionQuestions = sidecar.questions.filter(
          (question) => question.afterSection === injection.afterSection,
        );
        const fallback = sidecar.questions.filter((question) => !question.afterSection);
        const questions = sectionQuestions.length > 0 ? sectionQuestions : fallback;
        if (questions.length === 0) {
          throw new Error(
            `${article.uid}: Quiz override after "${injection.afterSection}" has no questions`,
          );
        }
        quiz = { ...sidecar, questions };
      } else {
        throw new Error(
          `${article.uid}: Quiz override after "${injection.afterSection}" has neither props.questions nor a sidecar`,
        );
      }
      widgets.push({ afterSection: injection.afterSection, sidecar: quiz });
      for (const question of quiz.questions) used.add(question.id);
    }
  }

  if (sidecar) {
    const remaining = sidecar.questions.filter((question) => !used.has(question.id));
    for (const [afterSection, questions] of groupQuestions(remaining)) {
      widgets.push({ afterSection, sidecar: { ...sidecar, questions } });
    }
  }

  return widgets;
}

export function widgetsCacheKey(widgets: QuizWidget[]): string {
  return createHash('sha256').update(JSON.stringify(widgets)).digest('hex');
}

export function loadArticleQuizWidgets(article: ArticleListItem): QuizWidget[] {
  const sidecar = loadQuizSidecar(article);
  const overrides = loadArticleOverrides(article.uid);
  return resolveQuizWidgets(article, sidecar, overrides);
}
