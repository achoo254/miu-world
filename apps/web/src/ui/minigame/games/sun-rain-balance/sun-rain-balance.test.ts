import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSunRain } from './logic';

describeMinigame('sun-rain-balance');

describe('sun and rain rules', () => {
  const setup = () => createSunRain({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(1) });

  it('rains (water up, light down) while the cloud covers the sun', () => {
    const game = setup();
    const { light, water } = game.state;
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.sun.x, y: 200 } });
    expect(game.state.raining).toBe(true);
    expect(game.state.water).toBeGreaterThan(water);
    expect(game.state.light).toBeLessThan(light);
  });

  it('grows slowly when the soil is dry', () => {
    const game = setup();
    for (let i = 0; i < 60 * 20; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.water).toBe(0);
    expect(game.score).toBeLessThanOrEqual(1);
  });
});
