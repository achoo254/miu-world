import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { bagSum, createThreeSpanBag, makeBag } from './logic';

describeMinigame('three-span-bag');

describe('three-span bag rules', () => {
  const setup = () => createThreeSpanBag({ arena: { width: 600, height: 863 }, goal: 6, duration: 90, params: {}, rng: createRng(5) });

  it('always has an exact way within grade 2 adding', () => {
    const rng = createRng(11);
    for (let round = 0; round < 40; round += 1) {
      const { capacity, values, answer } = makeBag(rng, round % 8);
      expect(capacity).toBeLessThanOrEqual(20);
      expect(values.every((v) => v >= 1 && v <= 9)).toBe(true);
      expect(answer.reduce((sum, i) => sum + (values[i] ?? 99), 0)).toBe(capacity);
      expect(new Set(answer).size).toBe(answer.length);
    }
  });

  it('scores an exact bag and spills one that is too full', () => {
    const game = setup();
    const tap = (i: number) => {
      const gem = game.state.gems[i];
      if (!gem) throw new Error('no gem');
      game.step(1 / 60, { ...NO_INPUT, taps: [gem.home] });
    };
    for (const i of game.state.answer) tap(i);
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('fly');

    const over = setup();
    const order = over.state.gems.map((g, i) => ({ v: g.value, i })).sort((a, b) => b.v - a.v);
    for (const { i } of order) {
      if (over.state.phase !== 'choose') break;
      const gem = over.state.gems[i];
      if (gem) over.step(1 / 60, { ...NO_INPUT, taps: [gem.home] });
    }
    if (over.score === 0) {
      expect(over.state.phase).toBe('burst');
      expect(bagSum(over.state)).toBe(0);
    }
  });
});
