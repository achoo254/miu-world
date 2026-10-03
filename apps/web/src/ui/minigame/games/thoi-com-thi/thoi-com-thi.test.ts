import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BAND_HIGH, BAND_LOW, COOK_SECONDS, createThoiComThi } from './logic';

/** Throws on wood all the time: the fire roars and the rice never cooks. */
describeMinigame('thoi-com-thi', { loser: (context) => ({ tap: { x: context.arena.width / 2, y: context.arena.height - 80 } }) });

describe('thổi cơm thi rules', () => {
  const setup = () => createThoiComThi({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(12) });

  it('cooks only in the band and scores a good pot two points', () => {
    const game = setup();
    game.state.fire = (BAND_LOW + BAND_HIGH) / 2;
    for (let i = 0; i < COOK_SECONDS * 60 + 30; i += 1) {
      game.state.fire = (BAND_LOW + BAND_HIGH) / 2;
      game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(2);
  });

  it('scorches instead of cooking when too hot, and halves that pot', () => {
    const game = setup();
    for (let i = 0; i < 120; i += 1) {
      game.state.fire = 0.95;
      game.step(1 / 60, NO_INPUT);
    }
    expect(game.state.cooked).toBe(0);
    expect(game.state.burnt).toBeGreaterThan(1.5);
    for (let i = 0; i < COOK_SECONDS * 60 + 30; i += 1) {
      game.state.fire = (BAND_LOW + BAND_HIGH) / 2;
      game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(1);
  });
});
