import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLanternParade, SAFE_SPEED } from './logic';

describeMinigame('lantern-parade');

describe('lantern parade rules', () => {
  const setup = (seed = 1) => createLanternParade({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { pace: 1 }, rng: createRng(seed) });
  const hold = { ...NO_INPUT, pointer: { x: 300, y: 400 } };

  it('blows the candle out when she hurries too long, and she stops to light it', () => {
    const game = setup();
    let fast = 0;
    for (let i = 0; i < 240 && game.state.relight === 0; i += 1) {
      game.step(1 / 60, hold);
      if (game.state.speed > SAFE_SPEED) fast += 1;
    }
    expect(game.state.relight).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(50);
    game.step(1 / 60, hold);
    expect(game.state.speed).toBe(0);
  });

  it('picks up a mooncake walked over with the lantern lit', () => {
    const game = setup();
    const cake = game.state.cakes[0];
    if (!cake) throw new Error('no cake');
    game.state.x = cake.x - 5;
    game.state.paradeX = cake.x + 200;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('is lost holding the finger down all the way (the candle keeps going out)', () => {
    for (const seed of [1, 2, 3]) {
      const game = setup(seed);
      for (let i = 0; i < 3600; i += 1) game.step(1 / 60, hold);
      expect(game.score).toBeLessThan(10);
    }
  });
});
