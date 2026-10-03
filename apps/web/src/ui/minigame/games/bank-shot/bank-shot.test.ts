import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { advance, bestAngle, createBankShot, throwReaches, type Ball } from './logic';

describeMinigame('bank-shot');

describe('bank shot rules', () => {
  const setup = (seed = 1) => createBankShot({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(seed) });

  it('bounces off the ceiling', () => {
    const game = setup();
    const ball: Ball = { x: 300, y: game.state.ceiling + 25, vx: 0, vy: -600, bounces: 0, age: 0 };
    advance(game.state, ball, 1 / 60);
    expect(ball.vy).toBeGreaterThan(0);
    expect(ball.bounces).toBe(1);
  });

  it('places the crates so the friend can always be reached, but not straight', () => {
    for (let seed = 1; seed <= 8; seed += 1) {
      const { state } = setup(seed);
      expect(bestAngle(state)).not.toBeNull();
      const straight = Math.atan2(state.friend.y - state.thrower.y, state.friend.x - state.thrower.x);
      expect(throwReaches(state, straight)).toBe(false);
    }
  });

  it('throws along the aim when the finger lets go', () => {
    const game = setup();
    const { thrower } = game.state;
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: thrower.x + 100, y: thrower.y - 100 }, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.state.ball?.vx).toBeGreaterThan(0);
    expect(game.state.ball?.vy).toBeLessThan(0);
    expect(game.state.balls).toBe(1);
  });
});
