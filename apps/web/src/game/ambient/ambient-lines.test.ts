import { describe, expect, it } from 'vitest';
import { AMBIENT_LINES } from './ambient-lines';
import { AMBIENT_LINES_EN } from './ambient-lines-en';

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '');

describe('villagers speak both languages', () => {
  it('gives every pool its English twin, line for line, with the same placeholders', () => {
    expect(Object.keys(AMBIENT_LINES_EN).sort()).toEqual(Object.keys(AMBIENT_LINES).sort());
    for (const [pool, lines] of Object.entries(AMBIENT_LINES)) {
      const en = AMBIENT_LINES_EN[pool] ?? [];
      expect(en.length, pool).toBe(lines.length);
      lines.forEach((line, i) => expect(placeholders(en[i] ?? ''), `${pool}[${i}]`).toEqual(placeholders(line)));
    }
  });
});
