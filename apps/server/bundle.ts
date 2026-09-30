// Production bundle: one ESM file with every dependency inlined, so a host needs only Node, the
// migrations and `content/` — no workspace install, no tsx.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Two levels below apps/server, like src/db and src/content: their `import.meta.url` anchors
  // (migrations at apps/server/drizzle, content at <repo>/content) resolve unchanged.
  outfile: 'dist/server/index.mjs',
  // PGlite is dev/test only and loaded on demand; pg-native is an optional driver pg never needs here.
  external: ['@electric-sql/pglite', 'drizzle-orm/pglite', 'drizzle-orm/pglite/migrator', 'pg-native'],
  // Inlined CommonJS packages (express, pg) still call require().
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  sourcemap: true,
  logLevel: 'info',
});
