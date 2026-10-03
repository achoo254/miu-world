import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFairShare, isFair, pieces } from './logic';

describeMinigame('fair-share');

describe('fair share rules', () => {
  it('measures the pieces between the cuts and judges them fair within a margin', () => {
    expect(pieces(0, 300, [200, 100])).toEqual([100, 100, 100]);
    expect(isFair([100, 108, 92])).toBe(true);
    expect(isFair([100, 130, 70])).toBe(false);
  });

  it('scores a fair cut and asks for the same cake again after an uneven one', () => {
    const game = createFairShare({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(1) });
    const { x0, x1, y } = game.state.cake;
    const stroke = (x: number): GameInput => ({ ...NO_INPUT, swipes: [{ direction: 'down', from: { x, y: y - 120 }, dx: 0, dy: 240, speed: 1500 }] });
    expect(game.state.friends.length).toBe(2);
    game.step(1 / 60, stroke(x0 + (x1 - x0) * 0.3));
    expect(game.state.phase).toBe('uneven');
    expect(game.state.tooBig).toEqual([1]);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.cuts).toEqual([]);
    game.step(1 / 60, stroke((x0 + x1) / 2));
    expect(game.state.phase).toBe('shared');
    expect(game.score).toBe(1);
  });
});
