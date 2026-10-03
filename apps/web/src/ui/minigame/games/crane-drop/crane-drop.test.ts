import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCraneDrop, hookX, towerX } from './logic';

describeMinigame('crane-drop');

describe('crane drop rules', () => {
  const setup = () => createCraneDrop({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: { speed: 1 }, rng: createRng(3) });
  const settle = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 120 && game.state.falling; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('builds a floor on the tower, and loses a heart for a floor dropped beside it', () => {
    const game = setup();
    // Swing until the hook is over the base, then let go.
    for (let i = 0; i < 600 && Math.abs(hookX(game.state) - towerX(game.state)) > 20; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    settle(game);
    expect(game.score).toBe(1);
    for (let i = 0; i < 60 && game.state.hooked === null; i += 1) game.step(1 / 60, NO_INPUT);
    for (let i = 0; i < 600 && Math.abs(hookX(game.state) - towerX(game.state)) < game.state.floorW * 0.62 + 15; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    settle(game);
    expect(game.score).toBe(1);
    expect(game.lives).toBe(2);
  });
});
