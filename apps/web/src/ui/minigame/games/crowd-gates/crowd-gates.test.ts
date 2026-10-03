import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { applyOp, bestPath, createCrowdGates, laneOnly, NEEDED } from './logic';

describeMinigame('crowd-gates');

describe('crowd gates rules', () => {
  it('adds, takes away (never below one) and doubles', () => {
    expect(applyOp(7, { kind: '+', n: 5 })).toBe(12);
    expect(applyOp(3, { kind: '-', n: 5 })).toBe(1);
    expect(applyOp(12, { kind: 'x', n: 2 })).toBe(24);
  });

  it('makes roads where good choices push the car and one lane never does', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const game = createCrowdGates({ arena: { width: 863, height: 600 }, goal: NEEDED, duration: 55, params: {}, rng: createRng(seed) });
      expect(bestPath(game.state.pairs)).toBeGreaterThanOrEqual(NEEDED + 8);
      expect(laneOnly(game.state.pairs, 0)).toBeLessThan(NEEDED);
      expect(laneOnly(game.state.pairs, 1)).toBeLessThan(NEEDED);
    }
  });

  it('goes through the gate of the lane it is in', () => {
    const game = createCrowdGates({ arena: { width: 863, height: 600 }, goal: NEEDED, duration: 55, params: {}, rng: createRng(2) });
    const first = game.state.pairs[0];
    if (!first) throw new Error('no gates');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 800, y: 400 }] });
    while (first.taken < 0) game.step(1 / 60, NO_INPUT);
    expect(first.taken).toBe(1);
    expect(game.state.crowd).toBe(applyOp(3, first.ops[1]));
  });
});
