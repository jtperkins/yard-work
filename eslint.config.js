// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', '.wrangler', '.sisyphus', 'node_modules', 'functions/**/*.js'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // TypeScript everywhere
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Browser app (React)
  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'react/prop-types': 'off',
    },
  },

  // Server (Pages Functions + server/lib) and tooling run outside the browser.
  {
    files: ['functions/**/*.ts', 'server/**/*.ts', 'test/**/*.ts'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.node } },
  },
  {
    files: ['*.{js,ts}', 'scripts/**/*.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // src/shared must stay runtime-agnostic (used by both browser and Workers).
  {
    files: ['src/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-*', 'react/*'], message: 'src/shared is runtime-agnostic.' },
            {
              group: [
                '../{app,features,ui,api,domain,i18n,styles}/**',
                '**/server/**',
                '**/functions/**',
              ],
              message:
                'src/shared must not import app or server code (catalog JSON in data/ is fine).',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // COMPONENT-FIRST RATCHET (owned by the UI-library agent).
  // Screens and the app shell compose src/ui only: no raw interactive/semantic
  // elements the library owns. Tighten (never loosen) as src/ui grows.
  // ---------------------------------------------------------------------------
  {
    files: ['src/features/**/*.tsx', 'src/app/**/*.tsx'],
    rules: {
      'react/forbid-elements': [
        'error',
        {
          forbid: [
            { element: 'button', message: 'Use Button / IconButton / ToggleChip from src/ui.' },
            { element: 'a', message: 'Use TextLink / LinkButton (as={Link}) from src/ui.' },
            {
              element: 'input',
              message: 'Use Input / DateInput / ComboInput / Checkbox from src/ui.',
            },
            { element: 'select', message: 'Use Select / SegmentedControl from src/ui.' },
            { element: 'textarea', message: 'Use Textarea from src/ui.' },
            { element: 'dialog', message: 'Use Dialog / Sheet / ConfirmDialog from src/ui.' },
            { element: 'datalist', message: 'Use ComboInput from src/ui.' },
          ],
        },
      ],
      // No hand-typed styling recipes on raw elements: lay out with Stack/Grid/AsideLayout, write
      // copy with Text/SectionHeader, and add a component to src/ui when nothing fits.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/] > JSXAttribute[name.name='className']",
          message:
            'No className on raw elements in screens: compose src/ui (Stack, Grid, Text, …) or add a component there.',
        },
      ],
    },
  },
  // --- END COMPONENT-FIRST RATCHET ---------------------------------------------
);
