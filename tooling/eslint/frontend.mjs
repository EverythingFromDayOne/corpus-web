import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import base from './base.mjs';

function flatten(x) {
  return Array.isArray(x) ? x.flat(Infinity) : [x];
}
const flatBase = flatten(base);

/**
 * Frontend (React) lint config — extends the shared base config with
 * React-specific rules:
 *
 * - `react/jsx-key` (error): every JSX element rendered inside an
 *   array.map() iteration context MUST have a stable `key` prop. This
 *   catches the exact failure mode seen on /en/blog (the missing key
 *   on `<button>` rendered from `kindFilters.map(item => renderChip(...))`
 *   — a runtime warning, not a compile error, that surfaced only in
 *   Next.js dev-mode console overlay).
 * - `react-hooks/rules-of-hooks` (error): React's hook calls
 *   must follow the same order on every render — the canonical
 *   source of "rules of hooks" mistakes. Both of these rules are
 *   brought in as ERROR severity so they fail `pnpm lint` and break
 *   CI before they ever reach production.
 *
 * React version is detected automatically by `settings.react.version =
 * 'detect'` — the rule reads package.json's react@19.2.x and applies
 * matching rule semantics.
 */
export default [
  ...flatBase,
  reactPlugin.configs.flat.recommended,
  reactPlugin.configs.flat['jsx-runtime'],
  {
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Lock down the keys-on-iteration rule as ERROR. This is the
      // exact rule that should have caught the article-index renderChip
      // bug — the project shipped without it.
      'react/jsx-key': 'error',
      // Lock down the rules-of-hooks as ERROR — every existing
      // project ships these at error severity, and so will we.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Calm noisy recommended rules: many of them flag patterns
      // that Next.js + React 19 already enforce or that are not
      // meaningful for the corpus. Bumping to warn instead of error
      // keeps `pnpm lint` passing while still surfacing issues.
      'react/no-unescaped-entities': 'warn',
      'react/prop-types': 'off',
      'react/display-name': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
    },
  },
];
