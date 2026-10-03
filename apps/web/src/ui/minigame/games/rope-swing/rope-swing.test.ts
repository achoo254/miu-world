import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRopeSwing } from './logic';

describeMinigame('rope-swing');

describe('rope swing rules', () => {
  const setup = () => createRopeSwing({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: { reach: 1 }, rng: createRng(3) });
  const hold = { ...NO_INPUT, pointer: { x: 300, y: 300 } };

  it('hooks the vine ahead on a hold and lets go on release', () => {
    const game = setup();
    game.step(1 / 60, hold);
    expect(game.state.hooked).toBe(0);
    expect(game.state.standing).toBe(-1);
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, hold);
    expect(game.state.vx).toBeGreaterThan(0);
    game.step(1 / 60, NO_INPUT);
    expect(game.state.hooked).toBe(-1);
  });

  it('keeps the monkey on the vine: never further from the hook than the vine is long', () => {
    const game = setup();
    for (let i = 0; i < 90; i += 1) {
      game.step(1 / 60, hold);
      const hook = game.state.hooks[game.state.hooked];
      if (hook) expect(Math.hypot(game.state.x - hook.x, game.state.y - hook.y)).toBeLessThanOrEqual(game.state.ropeLength + 0.01);
    }
  });

  it('puts a monkey that falls in the river back on its last stump, and scores a stump it passes', () => {
    const game = setup();
    game.state.standing = -1;
    game.state.y = game.state.riverY + 5;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.splashed).toBeGreaterThan(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.standing).toBe(0);
    const next = game.state.stumps[1];
    if (!next) throw new Error('no stump');
    game.state.standing = -1;
    game.state.x = next.x;
    game.state.y = next.y - 100;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });
});
