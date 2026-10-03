import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSealBalance, FALL_LEAN } from './logic';

describeMinigame('seal-balance');

describe('seal balance rules', () => {
  const setup = () => createSealBalance({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: { wind: 0 }, rng: createRng(1) });

  it('lets a leaning ball fall when nobody moves, then tosses a new one', () => {
    const game = setup();
    for (let i = 0; i < 60 * 3 && game.state.fallen < 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.fallen).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < 60 * 1.5; i += 1) game.step(1 / 60, NO_INPUT);
    expect(Math.abs(game.state.lean)).toBeLessThan(FALL_LEAN / 4);
    expect(game.state.fallen).toBe(-1);
  });

  it('turns a leaning ball back when the seal slides under the lean', () => {
    const game = setup();
    game.state.lean = 0.2;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.x + 300, y: 400 } });
    for (let i = 0; i < 8; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.x + 300, y: 400 } });
    expect(game.state.spin).toBeLessThan(0);
  });
});
