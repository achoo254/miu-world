import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBlockCount, makeChoices, makeStack } from './logic';

describeMinigame('block-count');

describe('block count rules', () => {
  it('builds stacks where every cube stands on the table or on another cube', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const cubes = makeStack(createRng(seed), 3, 3, 6, 11);
      const at = new Set(cubes.map((c) => `${c.x},${c.y},${c.z}`));
      expect(cubes.length).toBeGreaterThanOrEqual(6);
      expect(cubes.length).toBeLessThanOrEqual(11);
      for (const c of cubes) if (c.z > 0) expect(at.has(`${c.x},${c.y},${c.z - 1}`)).toBe(true);
    }
  });

  it('offers three different answers with the right one, none below one', () => {
    for (let seed = 1; seed < 40; seed += 1) {
      const answer = (seed % 12) + 1;
      const values = makeChoices(createRng(seed), answer);
      expect(new Set(values).size).toBe(3);
      expect(values).toContain(answer);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(1);
    }
  });

  it('turns the stack round after a wrong answer and scores the right one', () => {
    const game = createBlockCount({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(5) });
    const wrong = game.state.choices.find((c) => c.value !== game.state.cubes.length);
    const right = game.state.choices.find((c) => c.value === game.state.cubes.length);
    if (!wrong || !right) throw new Error('no choices');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(game.state.turning).toBeGreaterThan(0);
    // The buttons rest while the stack starts turning.
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: right.x, y: right.y }] });
    expect(game.score).toBe(1);
  });
});
