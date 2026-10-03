import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMathRace, makeSum } from './logic';

// Tapping answers without reading them must not win.
let n = 0;
describeMinigame('math-race', {
  loser: ({ arena }) => {
    n += 1;
    return n % 3 === 0 ? { tap: { x: arena.width / 2 + ((n % 2) * 2 - 1) * Math.min(arena.width / 3, 220), y: arena.height - 100 } } : {};
  },
});

describe('math race rules', () => {
  it('makes grade 2 sums with three different answers, one of them right', () => {
    const rng = createRng(9);
    for (let i = 0; i < 300; i += 1) {
      const sum = makeSum(rng, 2);
      expect(new Set(sum.options).size).toBe(3);
      expect(sum.options).toContain(sum.answer);
      expect(sum.answer).toBeGreaterThanOrEqual(0);
      expect(sum.answer).toBeLessThanOrEqual(100);
      const [a, op, b] = sum.text.split(' ');
      expect(op === '+' ? Number(a) + Number(b) : Number(a) - Number(b)).toBe(sum.answer);
    }
  });

  it('speeds the car up for a right answer and slows it for a wrong one', () => {
    const game = createMathRace({ arena: { width: 863, height: 600 }, goal: 3, duration: 60, params: { level: 1 }, rng: createRng(2) });
    const tapAnswer = (right: boolean) => {
      const i = game.state.sum.options.findIndex((v) => (v === game.state.sum.answer) === right);
      const b = game.state.buttons[i];
      if (b) game.step(1 / 60, { ...NO_INPUT, taps: [b] });
    };
    tapAnswer(true);
    const fast = game.state.cars[0]?.speed ?? 0;
    tapAnswer(false);
    const slow = game.state.cars[0]?.speed ?? 0;
    game.step(1 / 60, NO_INPUT);
    expect(fast).toBeGreaterThan(40);
    expect(slow).toBeLessThan(10);
  });
});
