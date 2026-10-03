import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { describeMinigame } from '../../testing/describe-minigame';
import { keeps, makeClues } from './logic';

describeMinigame('seat-logic');

describe('seat logic rules', () => {
  it('reads the cards', () => {
    const seats = [0, 1, 3, 2];
    expect(keeps({ kind: 'crown', a: 0 }, seats)).toBe(true);
    expect(keeps({ kind: 'next', a: 0, b: 1 }, seats)).toBe(true);
    expect(keeps({ kind: 'apart', a: 0, b: 2 }, seats)).toBe(true);
    expect(keeps({ kind: 'next', a: 0, b: 3 }, seats)).toBe(false);
  });

  it('makes cards the hidden seating keeps, a few of them', () => {
    const rng = createRng(3);
    for (let k = 0; k < 20; k += 1) {
      const n = k % 2 === 0 ? 4 : 5;
      const seats = Array.from({ length: n }, (_, i) => i).sort(() => rng.next() - 0.5);
      const clues = makeClues(rng, n, seats);
      expect(clues.every((c) => keeps(c, seats))).toBe(true);
      expect(clues.length).toBeLessThanOrEqual(n + 1);
    }
  });
});
