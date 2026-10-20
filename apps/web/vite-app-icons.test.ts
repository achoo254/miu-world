import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { brand } from '@miu/brand/brand';
import { APP_ICON_PATHS, APP_LOGO } from './vite-app-icons';

/** The value of a custom property declared in the UI token file. */
function token(name: string): string | undefined {
  const css = readFileSync(new URL('./src/ui/tokens.css', import.meta.url), 'utf8');
  return new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
}

describe('app icons and colours', () => {
  it('paints the browser bar and splash with the sky of the UI tokens', () => {
    expect(brand.colors.theme).toBe(token('--color-sky-top'));
    expect(brand.colors.background).toBe(token('--color-sky-mid'));
  });

  it('ships every icon the pages link, with the 192 px logo beside the name', () => {
    expect(APP_LOGO).toBe('generated/brand/miu-logo-192.png');
    expect(APP_ICON_PATHS).toContain(APP_LOGO);
    expect(APP_ICON_PATHS).toContain(brand.iconMaskable);
  });
});
