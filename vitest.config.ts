import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'node',
          include: ['tools/**/*.test.ts', 'packages/**/*.test.ts', 'apps/*/src/**/*.test.ts', 'apps/*/*.test.ts'],
          exclude: [...configDefaults.exclude, 'apps/web/src/**'],
        },
      },
      'apps/web/vitest.config.ts',
    ],
  },
});
