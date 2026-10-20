import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TOKEN_FILE, checkBrand, colourLiteralLines, productNameLines } from './check-brand';

describe('productNameLines', () => {
  it('finds the name as a whole string or a whole JSX text, not inside a sentence or a comment', () => {
    const source = [
      "const a = 'Miu World';",
      'const b = "Miu World";',
      'const c = `Miu World`;',
      '<h1 className="x">Miu World</h1>',
      "const d = 'Chào mừng tới Miu World!';",
      '/** The game title "Miu World". */',
      "// 'Miu World'",
      '<p>Về Miu World</p>',
    ].join('\n');
    expect(productNameLines(source, 'Miu World')).toEqual([1, 2, 3, 4]);
  });

  it('escapes the name for the pattern', () => {
    expect(productNameLines("x = 'A.B'; y = 'AxB';", 'A.B')).toEqual([1]);
    expect(productNameLines("y = 'AxB';", 'A.B')).toEqual([]);
  });
});

describe('colourLiteralLines', () => {
  it('finds hex colours and colour functions, not tokens, ids or comments', () => {
    const css = [
      '.a { color: #fff; }',
      '.b { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }',
      '.c { color: var(--color-ink); }',
      '/* was #ffffff, see',
      '   rgb(1, 2, 3) */',
      '.d { background: hsl(10 20% 30%); }',
      '.e { color: #12345; }',
      'a[href="#top"] { color: var(--color-primary); }',
      '.f { border-color: #aabbccdd; }',
    ].join('\n');
    expect(colourLiteralLines(css)).toEqual([1, 2, 6, 9]);
  });
});

describe('checkBrand', () => {
  let root = '';
  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
  });

  function write(file: string, text: string): void {
    const full = path.join(root, file);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }

  it('reports app code and UI CSS, and leaves tests, the token file and the game runtime alone', () => {
    root = mkdtempSync(path.join(os.tmpdir(), 'check-brand-'));
    write('apps/server/src/mail.ts', "const SENDER = 'Miu World';\n");
    write('apps/server/src/mail.test.ts', "expect(x).toBe('Miu World');\n");
    write('apps/web/e2e/flow.spec.ts', "getByText('Miu World');\n");
    write('apps/web/src/ui/kit/x.css', '.x {\n  color: #333;\n}\n');
    write(TOKEN_FILE, ':root { --color-ink: #2b2140; }\n');
    write('apps/web/src/game/game.css', '.hud { color: #fff; }\n');
    write('apps/web/src/seo/page.css', '.p { color: rgb(1, 2, 3); }\n');
    expect(checkBrand(root, 'Miu World')).toEqual([
      'apps/server/src/mail.ts:1 hard-codes the product name "Miu World"; read it from @miu/brand/brand',
      `apps/web/src/ui/kit/x.css:2 writes a colour; add a token to ${TOKEN_FILE} and use var(--color-…)`,
      `apps/web/src/seo/page.css:1 writes a colour; add a token to ${TOKEN_FILE} and use var(--color-…)`,
    ]);
  });
});
