import { defineConfig } from 'eslint/config';
import tseslint from '@electron-toolkit/eslint-config-ts';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginPromise from 'eslint-plugin-promise';
import pluginUnicorn from 'eslint-plugin-unicorn';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import pluginReactRefresh from 'eslint-plugin-react-refresh';

export default defineConfig(
  // ── Ignores ──────────────────────────────────────────────
  { ignores: ['**/node_modules', '**/dist', '**/out'] },

  // ── Base: ESLint recommended + TypeScript recommended ───
  tseslint.configs.recommended,

  // ── Plugin: eslint-plugin-promise ───────────────────────
  pluginPromise.configs['flat/recommended'],

  // ── React Plugins (for renderer / JSX files) ────────────
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...pluginReactHooks.configs.flat.recommended,
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...pluginReactRefresh.configs.vite,
  },

  // ── Plugin: eslint-plugin-unicorn (curated) ─────────────
  {
    plugins: { unicorn: pluginUnicorn },
    rules: {
      // Modern code quality
      'unicorn/better-regex': 'error',
      'unicorn/catch-error-name': 'error',
      'unicorn/consistent-destructuring': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/error-message': 'error',
      'unicorn/escape-case': 'error',
      'unicorn/new-for-builtins': 'error',
      'unicorn/no-abusive-eslint-disable': 'error',
      'unicorn/no-for-each': 'error',
      'unicorn/no-instanceof-builtins': 'error',
      'unicorn/no-lonely-if': 'error',
      'unicorn/no-new-array': 'error',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/no-typeof-undefined': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-unreadable-iife': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/no-zero-fractions': 'error',
      'unicorn/number-literal-case': 'error',
      'unicorn/numeric-separators-style': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-default-parameters': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-modern-math-apis': 'error',
      'unicorn/prefer-negative-index': 'error',
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-object-from-entries': 'error',
      'unicorn/prefer-optional-catch-binding': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-spread': 'error',
      'unicorn/prefer-string-replace-all': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',
      'unicorn/prefer-switch': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/prefer-top-level-await': 'off', // Disabled for Electron CJS bundle compatibility
      'unicorn/prefer-type-error': 'error',
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/prefer-structured-clone': 'error',
      'unicorn/prefer-at': 'error',
      'unicorn/prefer-early-return': 'error',
      'unicorn/no-negated-condition': 'error',
      'unicorn/no-static-only-class': 'error',
      'unicorn/throw-new-error': 'error',

      // Relaxed — too opinionated for most projects
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },

  // ── Custom: Modern best-practice rules ──────────────────
  {
    rules: {
      // --- Promise best practices ---
      'promise/always-return': ['error', { ignoreLastCallback: true }],

      // --- General best practices ---
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'warn',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-destructuring': ['error', { object: true, array: false }],
      'object-shorthand': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-useless-concat': 'error',
      'no-unneeded-ternary': 'error',
      'no-lonely-if': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-throw-literal': 'error',
      'no-param-reassign': ['error', { props: false }],
      'no-nested-ternary': 'error',
      'no-multi-assign': 'error',
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'default-case-last': 'error',
      'grouped-accessor-pairs': ['error', 'getBeforeSet'],
      'guard-for-in': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-extend-native': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-new-wrappers': 'error',
      'no-proto': 'error',
      'no-return-assign': ['error', 'except-parens'],
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-restricted-globals': [
        'error',
        { name: 'isNaN', message: 'Use Number.isNaN instead.' },
        { name: 'isFinite', message: 'Use Number.isFinite instead.' },
      ],

      // --- TypeScript overrides ---
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },

  // ── Prettier must be last to override formatting rules ──
  eslintConfigPrettier,
);
