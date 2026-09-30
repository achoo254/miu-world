import { describe, expect, it } from 'vitest';
import { freshPicker } from './pick-fresh';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

describe('freshPicker', () => {
  it('uses every line once per round and never says the same line twice in a row', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const pool = ['a', 'b', 'c', 'd'];
      const pick = freshPicker(pool, seeded(seed));
      const said = Array.from({ length: 40 }, () => pick.next());
      for (let round = 0; round < 10; round += 1) expect(new Set(said.slice(round * 4, round * 4 + 4)).size).toBe(4);
      for (let i = 1; i < said.length; i += 1) expect(said[i]).not.toBe(said[i - 1]);
    }
  });

  it('works with a single line and refuses an empty pool', () => {
    expect(freshPicker(['only']).next()).toBe('only');
    expect(() => freshPicker([])).toThrow();
  });
});
