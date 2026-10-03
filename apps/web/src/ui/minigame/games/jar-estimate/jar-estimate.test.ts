import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createJarEstimate, isClose, SHOW_SECONDS } from './logic';

describeMinigame('jar-estimate');

describe('jar estimate rules', () => {
  it('counts a guess within a fifth (at least 2) as close', () => {
    expect(isClose(48, 40)).toBe(true);
    expect(isClose(49, 40)).toBe(false);
    expect(isClose(12, 10)).toBe(true);
    expect(isClose(13, 10)).toBe(false);
  });

  it('reads the needle from the ruler and scores a close guess', () => {
    const game = createJarEstimate({ arena: { width: 863, height: 600 }, goal: 6, duration: 100, params: {}, rng: createRng(5) });
    for (let i = 0; i < SHOW_SECONDS * 60 + 2; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('guess');
    const { x0, x1, y } = game.state.ruler;
    const at = { x: x0 + (game.state.count / 100) * (x1 - x0), y };
    game.step(1 / 60, { ...NO_INPUT, pointer: at, pressed: true });
    expect(game.state.guess).toBe(game.state.count);
    game.step(1 / 60, { ...NO_INPUT, released: true });
    const { done } = game.state;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: done.x + 20, y: done.y + 20 }] });
    expect(game.state.phase).toBe('reveal');
    expect(game.score).toBe(1);
  });
});
