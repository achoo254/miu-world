import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRunner } from './logic';

describeMinigame('runner');

describe('runner rules', () => {
  const setup = () => createRunner({ arena: { width: 863, height: 600 }, goal: 15, duration: 45, params: { speed: 1 }, rng: createRng(1) });

  it('jumps on a tap and lands back on the trail', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    expect(game.state.vy).toBeGreaterThan(0);
    expect(game.drainEvents().map((e) => e.type)).toEqual(['action']);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.lift).toBe(0);
  });

  it('ducks on a swipe down', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'down', from: { x: 400, y: 300 }, dx: 0, dy: 120, speed: 900 }] });
    expect(game.state.sliding).toBeGreaterThan(0);
  });

  it('ends after three bumps when nobody jumps', () => {
    const game = setup();
    for (let i = 0; i < 60 * 45 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.lives).toBe(0);
  });
});
