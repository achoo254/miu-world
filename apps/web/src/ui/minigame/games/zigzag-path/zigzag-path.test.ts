import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createZigzagPath } from './logic';

describeMinigame('zigzag-path');

describe('zigzag path rules', () => {
  const setup = () => createZigzagPath({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: { speed: 1 }, rng: createRng(2) });

  it('keeps the path on the screen and slants every stretch the other way', () => {
    const game = setup();
    const { corners, dirs } = game.state;
    for (const c of corners) {
      expect(c.x).toBeGreaterThanOrEqual(60);
      expect(c.x).toBeLessThanOrEqual(803);
    }
    for (let i = 1; i < dirs.length; i += 1) expect(dirs[i]).toBe(-(dirs[i - 1] ?? 0));
  });

  it('drops the ball that misses a corner and brings it back rolling the right way, with no point', () => {
    const game = setup();
    for (let i = 0; i < 60 * 3 && game.state.falling === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.falling).toBeGreaterThan(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.falling).toBe(0);
    expect(game.state.turned.size).toBe(0);
  });
});
