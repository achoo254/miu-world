import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBumperCars } from './logic';

describeMinigame('bumper-cars');

describe('bumper cars rules', () => {
  const setup = () => createBumperCars({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: {}, rng: createRng(1) });

  it('scores a car the child bumps off the floor, not one that drives off alone', () => {
    const game = setup();
    const [me, other, third] = game.state.cars;
    if (!me || !other || !third) throw new Error('cars');
    const { centre, radius } = game.state;
    third.x = centre.x;
    third.y = centre.y - radius + 10;
    third.vx = 0;
    third.vy = -500;
    me.x = centre.x + radius - 120;
    me.y = centre.y;
    other.x = centre.x + radius - 50;
    other.y = centre.y;
    other.vx = 0;
    me.vx = 400;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: centre.x + radius + 100, y: centre.y } });
    expect(other.out).toBeGreaterThanOrEqual(0);
    expect(third.out).toBeGreaterThanOrEqual(0);
    expect(game.score).toBe(1);
  });
});
