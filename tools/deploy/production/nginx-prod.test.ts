import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../../../apps/web/vite.config';

const conf = readFileSync(new URL('./nginx-prod.conf', import.meta.url), 'utf8');
const lines = conf.split('\n');

/** `add_header <Name> "<value>" always;` lines of the config, with their line index. */
const headers = lines.flatMap((line, index) => {
  const match = /^\s*add_header\s+(\S+)\s+"([^"]*)"\s+always;\s*$/.exec(line);
  return match ? [{ index, name: match[1] ?? '', value: match[2] ?? '' }] : [];
});

const directives = (policy: string): Map<string, string> =>
  new Map(
    policy
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name = '', ...values] = d.split(/\s+/);
        return [name, values.join(' ')] as const;
      }),
  );

describe('production nginx security headers', () => {
  it('sends each header once, with `always` so error pages carry it too', () => {
    expect(lines.filter((line) => /^\s*add_header\s/.test(line)).length).toBe(headers.length);
    expect(headers.map((h) => h.name).sort()).toEqual(
      ['Content-Security-Policy', 'Permissions-Policy', 'Referrer-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'X-Frame-Options'].sort(),
    );
  });

  it('declares them in `location /` only, ahead of its nested locations, so the nested ones inherit them and /api/ (helmet) gets none', () => {
    const root = lines.findIndex((line) => /^\s*location \/ \{\s*$/.test(line));
    expect(root).toBeGreaterThan(-1);
    const firstNested = lines.findIndex((line, i) => i > root && /^\s*location\s/.test(line));
    expect(firstNested).toBeGreaterThan(root);
    for (const { index } of headers) {
      expect(index).toBeGreaterThan(root);
      expect(index).toBeLessThan(firstNested);
    }
    const api = lines.findIndex((line) => /^\s*location \/api\/ \{\s*$/.test(line));
    expect(api).toBeGreaterThan(-1);
    expect(api).toBeLessThan(root);
  });

  it("allows everything the pages' meta policy allows, and adds only frame-ancestors and manifest-src", () => {
    const header = directives(headers.find((h) => h.name === 'Content-Security-Policy')?.value ?? '');
    const meta = directives(CONTENT_SECURITY_POLICY);
    for (const [name, value] of meta) expect(header.get(name), name).toBe(value);
    expect([...header.keys()].filter((name) => !meta.has(name)).sort()).toEqual(['frame-ancestors', 'manifest-src']);
    expect(header.get('frame-ancestors')).toBe("'none'");
    expect(header.get('manifest-src')).toBe("'self'");
  });

  it('pins HTTPS for a year without joining the preload list', () => {
    expect(headers.find((h) => h.name === 'Strict-Transport-Security')?.value).toBe('max-age=31536000; includeSubDomains');
  });
});
