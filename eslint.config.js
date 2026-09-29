import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      'assets/**',
      'plans/**',
      '**/test-results/**',
      '**/playwright-report/**',
      '.data/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Shared by web and server: plain TypeScript, no renderer or UI framework.
    files: ['packages/quest/**/*.ts', 'packages/voxel/**/*.ts', 'packages/schema/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['three', 'three/*'], message: 'Pure packages must not depend on three.js.' },
            { group: ['react', 'react-dom', 'react-dom/*'], message: 'Pure packages must not depend on React.' },
          ],
        },
      ],
    },
  },
  {
    // The runtime talks to React only through game-bridge events.
    files: ['apps/web/src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react', 'react-dom', 'react-dom/*', 'react-router'], message: 'The game runtime must not depend on React.' }] },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
