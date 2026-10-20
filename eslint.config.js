import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

// Quest files hold the answers; only the server may read them (the web app gets answer-free views).
const noQuestContent = {
  group: ['**/content/quests', '**/content/quests/**'],
  message: 'Quest content holds answers: only the server reads it; the client uses QuestView from the API.',
};

// import.meta.glob and dynamic import() take plain strings, which no-restricted-imports cannot see. Also a wildcard
// right under content/ (`content/*/…`, `content/quest*/…`), which could sweep quests in.
const noQuestContentStrings = [
  { selector: 'Literal[value=/content\\/(quests|[^\\/]*[*?{])/]', message: noQuestContent.message },
  { selector: 'TemplateElement[value.raw=/content\\/(quests|[^\\/]*[*?{])/]', message: noQuestContent.message },
];

// A colour written in code: a hex colour (#abc, #aabbcc, with alpha) or a CSS colour function. The web UI takes its
// colours from src/ui/tokens.css (var(--color-…)); tools/brand/check-brand.ts checks the UI's CSS files the same way.
const COLOUR_LITERAL = '(^|[^&\\w])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b|\\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(';
const colourMessage = 'Colours live in apps/web/src/ui/tokens.css: add a token there and use var(--color-…).';
const noColourLiterals = [
  { selector: `Literal[value=/${COLOUR_LITERAL}/]`, message: colourMessage },
  { selector: `TemplateElement[value.raw=/${COLOUR_LITERAL}/]`, message: colourMessage },
];

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
            noQuestContent,
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [noQuestContent] }] },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    rules: { 'no-restricted-syntax': ['error', ...noQuestContentStrings] },
  },
  {
    // The React UI and the static lesson pages: no colour literals. The Three.js runtime (src/game) colours its
    // materials and canvases in code (numbers and hex strings) and is out of scope, as are the internal review and
    // render-tool pages (src/review, src/preview), tests and test helpers.
    files: ['apps/web/src/ui/**/*.{ts,tsx}', 'apps/web/src/seo/**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/testing/**'],
    rules: { 'no-restricted-syntax': ['error', ...noQuestContentStrings, ...noColourLiterals] },
  },
  {
    // The runtime talks to React only through game-bridge events.
    files: ['apps/web/src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react-dom/*', 'react-router'], message: 'The game runtime must not depend on React.' },
            noQuestContent,
          ],
        },
      ],
    },
  },
  {
    // Given a bare app, supertest binds the IPv6 wildcard and connects to 127.0.0.1, where on macOS another
    // program on the same port can answer instead. Server tests reach the app through test/test-app.ts.
    files: ['apps/server/**/*.ts'],
    ignores: ['apps/server/test/test-app.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'supertest',
              allowTypeImports: true,
              message: 'Use agent(), request() or agentFor() from test/test-app.ts: they serve the app on 127.0.0.1.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
