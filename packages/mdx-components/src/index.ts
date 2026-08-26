import type { MDXComponents } from 'mdx/types';
import { CodeBlock } from './code-block';
import { Quiz } from './quiz';

export { CodeBlock, type CodeBlockLabels } from './code-block';
export { Quiz, type QuizLabels, type QuizProps } from './quiz';
export type {
  QuizQuestion,
  ClientQuizOption,
  ClientQuizQuestion,
  GradeResult,
  QuizGradeInput,
  QuizGradeAction,
} from './quiz-model';
export { gradeQuestion, correctLabelOf, unrevealedOptions, toClientQuestion } from './quiz-model';
export {
  END_OF_ARTICLE,
  injectAfterSections,
  type SectionInjection,
} from './inject-after-sections';

/**
 * Named widgets that `curation/overrides/*.yaml` may address. PascalCase,
 * matching OverrideInjection.component. An unregistered name must fail at
 * load time, not silently skip.
 */
export const mdxRegistry = {
  Quiz,
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
    ...components,
  };
}
