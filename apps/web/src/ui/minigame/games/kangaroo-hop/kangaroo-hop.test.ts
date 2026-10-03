import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKangarooHop, stonePos, stonesFor } from './logic';

describeMinigame('kangaroo-hop');

describe('kangaroo hop rules', () => {
  it('always offers the right landing among three stones ahead', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      for (const step of [2, 5, 10]) {
        const stones = stonesFor(20, step, createRng(seed));
        expect(stones).toContain(20 + step);
        expect(stones.every((n) => n > 20)).toBe(true);
      }
    }
  });

  it('eats a carrot on the right stone and hops past a wrong one', () => {
    const game = createKangarooHop({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: {}, rng: createRng(3) });
    const s = game.state;
    const wrong = s.stones.find((n) => n !== s.at + s.step);
    if (wrong === undefined) throw new Error('no wrong stone');
    game.step(1 / 60, { ...NO_INPUT, taps: [stonePos(s, wrong)] });
    expect(s.carrot).toBe(wrong);
    for (let i = 0; i < 60 * 4 && s.jumps === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    const right = s.at + s.step;
    game.step(1 / 60, { ...NO_INPUT, taps: [stonePos(s, right)] });
    for (let i = 0; i < 60 * 4 && s.jumps === 1; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });
});
