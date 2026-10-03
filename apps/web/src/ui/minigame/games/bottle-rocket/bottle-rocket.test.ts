import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBottleRocket, flightDistance } from './logic';

describeMinigame('bottle-rocket');

describe('bottle rocket rules', () => {
  const setup = () => createBottleRocket({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(1) });
  const pump: GameInput = { ...NO_INPUT, swipes: [{ direction: 'up', from: { x: 400, y: 400 }, dx: 0, dy: -100, speed: 900 }] };

  it('flies farthest at 45° and further with more pressure', () => {
    expect(flightDistance(600, 0.5, Math.PI / 4)).toBeCloseTo(300);
    expect(flightDistance(600, 0.5, Math.PI / 3)).toBeLessThan(300);
  });

  it('spurts the water out when pumped too much', () => {
    const game = setup();
    for (let i = 0; i < 12; i += 1) game.step(1 / 60, pump);
    expect(game.state.pressure).toBeGreaterThan(0.9);
    game.step(1 / 60, pump);
    expect(game.state.pressure).toBe(0);
    expect(game.drainEvents().some((e) => e.type === 'hit')).toBe(true);
  });

  it('does not launch without pressure, and lands after a launch', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    expect(game.state.phase).toBe('pump');
    for (let i = 0; i < 6; i += 1) game.step(1 / 60, pump);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    expect(game.state.phase).toBe('flight');
    for (let i = 0; i < 140; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('landed');
  });
});
