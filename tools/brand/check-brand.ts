// Adapted from chat-next/scripts/check-brand.mjs @a5be0b4; keep in sync until shared package exists.
/**
 * Part of `pnpm lint`. Fails when the brand is written by hand instead of read from its single source:
 * - the product name (brand.config.json `appName`) as a whole string literal or a whole JSX text in app or package
 *   code (apps/, packages/): read it from `@miu/brand/brand`. Tests, end-to-end specs and test helpers may name the
 *   product, and copy that names it inside a sentence (the locales, the legal texts, the HTML pages, content/) is
 *   words, not a constant; renaming the product means editing brand.config.json and that copy.
 * - a colour literal (hex or a CSS colour function) in the web UI's CSS (apps/web/src/ui, apps/web/src/seo) outside
 *   apps/web/src/ui/tokens.css. The UI's TypeScript gets the same check from ESLint (eslint.config.js).
 * Unlike chat-next there is no "former repository name" check: `miu-world` is still the public repository and the
 * file name of the pictures players download (share cards), which stay as they are.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBrandConfig } from '../../packages/brand/src/config';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAME_SCANNED = ['apps', 'packages'];
const COLOUR_SCANNED = ['apps/web/src/ui', 'apps/web/src/seo'];
export const TOKEN_FILE = 'apps/web/src/ui/tokens.css';
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'generated', 'test-results', 'playwright-report', 'e2e', 'test', 'testing']);
const CODE = /\.(ts|tsx|js|mjs|cjs)$/;
const TEST_FILE = /\.(test|spec)\.(ts|tsx|js|mjs)$/;
/** Same pattern as COLOUR_LITERAL in eslint.config.js. */
const COLOUR_LITERAL = /(^|[^&\w])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b|\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/;

function* files(dir: string, accept: (name: string) => boolean): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIPPED_DIRS.has(name) || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* files(full, accept);
    else if (accept(name)) yield full;
  }
}

/** A line that is all comment (`//`, `/*`, or a `*` line inside a block comment): it may quote the name. */
const COMMENT_LINE = /^\s*(\/\/|\/\*|\*)/;

/** Lines (1-based) of `source` that hard-code `appName`: a whole quoted string, or the whole text of a JSX element. */
export function productNameLines(source: string, appName: string): number[] {
  const escaped = appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const literal = new RegExp(`(["'\`])${escaped}\\1|>\\s*${escaped}\\s*<`);
  return source.split('\n').flatMap((line, index) => (!COMMENT_LINE.test(line) && literal.test(line) ? [index + 1] : []));
}

/** Lines (1-based) of a CSS file that write a colour literal, comments left out. */
export function colourLiteralLines(css: string): number[] {
  // Blank out comments but keep their newlines, so line numbers stay right.
  const code = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  return code.split('\n').flatMap((line, index) => (COLOUR_LITERAL.test(line) ? [index + 1] : []));
}

export function checkBrand(root: string, appName: string): string[] {
  const problems: string[] = [];
  for (const top of NAME_SCANNED) {
    for (const file of files(path.join(root, top), (name) => CODE.test(name) && !TEST_FILE.test(name))) {
      for (const line of productNameLines(readFileSync(file, 'utf8'), appName)) {
        problems.push(`${path.relative(root, file)}:${line} hard-codes the product name "${appName}"; read it from @miu/brand/brand`);
      }
    }
  }
  const tokens = path.join(root, TOKEN_FILE);
  for (const top of COLOUR_SCANNED) {
    for (const file of files(path.join(root, top), (name) => name.endsWith('.css'))) {
      if (file === tokens) continue;
      for (const line of colourLiteralLines(readFileSync(file, 'utf8'))) {
        problems.push(`${path.relative(root, file)}:${line} writes a colour; add a token to ${TOKEN_FILE} and use var(--color-…)`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkBrand(ROOT, loadBrandConfig().appName);
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('check-brand: no hard-coded product name, no colour outside the UI tokens');
}
