import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createParachuteLand } from './logic';

describeMinigame('parachute-land');

describe('parachute land rules', () => {
  const setup = (seed = 1) => createParachuteLand({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(seed) });

  it('drifts with the wind when nobody steers, and the X is never where the wind goes', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const game = setup(seed);
      const startX = game.state.x;
      while (game.state.landedAgo < 0) game.step(1 / 60, NO_INPUT);
      expect(Math.sign(game.state.x - startX)).toBe(Math.sign(game.state.breeze));
      expect(game.score).toBe(0);
    }
  });

  it('steers toward the finger and scores two points on the X', () => {
    const game = setup(2);
    while (game.state.landedAgo < 0) {
      const x = game.state.target - game.state.wind / 3;
      game.step(1 / 60, { ...NO_INPUT, pointer: { x, y: 400 } });
    }
    expect(game.state.landing).toBe('bullseye');
    expect(game.score).toBe(2);
  });
});
