import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPotteryWheel, makeTarget, matchOf, SLICES } from './logic';

describeMinigame('pottery-wheel');

describe('pottery wheel rules', () => {
  it('never asks for a shape the plain lump already matches', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const target = makeTarget(createRng(seed), 1, 85);
      expect(matchOf(Array.from({ length: SLICES }, () => 85), target)).toBeLessThan(0.55);
    }
  });

  it('moves the clay toward the finger at its height, and finishes a matching pot', () => {
    const game = createPotteryWheel({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(2) });
    const s = game.state;
    const before = [...s.profile];
    const y = s.baseY - (s.baseY - s.topY) / 2;
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: s.axisX + 30, y } });
    const k = Math.round((SLICES - 1) / 2);
    expect(s.profile[k]).toBeLessThan(before[k] ?? 0);
    expect(s.profile[0]).toBe(before[0]);
    s.profile = [...s.target];
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });
});
