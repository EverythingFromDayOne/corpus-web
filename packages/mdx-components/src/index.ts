import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from './code-block';
import { Quiz } from './quiz';
import { Flashcard } from './flashcard';
import { Callout } from './callout';
import { DragDrop } from './dragdrop';

export { CodeBlock, type CodeBlockLabels } from './code-block';
export { copyButtonClassName } from './code-block-controls';
export { Quiz, type QuizLabels, type QuizProps } from './quiz';
export { Flashcard, type FlashcardLabels, type FlashcardProps } from './flashcard';
export { Callout, type CalloutProps, type CalloutVariant, calloutClassName, calloutSurfaceClass, renderInlineMarkdown } from './callout';
export {
  DragDrop,
  type DragDropLabels,
  type DragDropProps,
} from './dragdrop';
export {
  nextCardIndex,
  prevCardIndex,
  toggleFlip,
  shouldHandleFlipKey,
  flashcardCardClassName,
  flashcardFaceAriaHidden,
  flashcardScrollBehavior,
} from './flashcard-model';
export type {
  QuizQuestion,
  ClientQuizOption,
  ClientQuizQuestion,
  GradeResult,
  QuizGradeInput,
  QuizGradeAction,
} from './quiz-model';
export { gradeQuestion, correctLabelOf, unrevealedOptions, toClientQuestion, quizRevealMounted } from './quiz-model';
export type {
  DragDropGradeAction,
  DragDropGradeInput,
  DragDropGradeResult,
  DragDropExercise,
  ClientDragDropChip,
  ClientDragDropSlot,
} from './dragdrop-model';
export {
  FLASH_MS,
  fallbackAnswerLine,
  gradeSubmission,
  toClientChips,
  toClientSlots,
} from './dragdrop-model';
export {
  END_OF_ARTICLE,
  injectAfterSections,
  injectDragDrop,
  type SectionInjection,
} from './inject-after-sections';

/**
 * Named widgets that `curation/overrides/*.yaml` may address. PascalCase,
 * matching OverrideInjection.component. An unregistered name must fail at
 * load time, not silently skip.
 */
export const mdxRegistry = {
  Quiz,
  Flashcard,
  Callout,
  DragDrop,
} as const;

export type MdxRegistryName = keyof typeof mdxRegistry;

export function isRegisteredComponent(name: string): name is MdxRegistryName {
  return Object.hasOwn(mdxRegistry, name);
}

/**
 * Single registration map for article MDX. Routes must not define components
 * inline — every interactive widget is exported from this package.
 */
export function getMDXComponents(components: MDXComponents = {}): MDXComponents {
  return {
    pre: CodeBlock as unknown as MDXComponents['pre'],
    Quiz,
    Flashcard,
    Callout,
    DragDrop,
    ...components,
  };
}
