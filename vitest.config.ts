import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tools/**/*.test.ts', 'packages/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'apps/*/*.test.ts', 'apps/server/test/**/*.test.ts'],
          exclude: [...configDefaults.exclude, 'apps/web/src/**'],
          // One migrated PGlite for the whole run (see the file); a file's database then boots in a
          // fraction of a second. The limits leave room for a machine under full load: a server route
          // test making dozens of requests can take seconds when every core is busy.
          globalSetup: ['apps/server/test/pglite-template.ts'],
          hookTimeout: 30_000,
          testTimeout: 20_000,
        },
      },
      'apps/web/vitest.config.ts',
    ],
  },
});
