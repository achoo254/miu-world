import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CATCH_FROM, createBoomerang, FLIGHT, flightPoint } from './logic';

describeMinigame('boomerang-throw');

describe('boomerang rules', () => {
  const setup = () => createBoomerang({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(1) });

  it('flies out and comes back to the hand', () => {
    const hand = { x: 100, y: 500 };
    const f = { dir: { x: 0, y: -1 }, reach: 300 };
    expect(flightPoint(hand, f, FLIGHT / 2).y).toBeCloseTo(200);
    const end = flightPoint(hand, f, FLIGHT);
    expect(Math.hypot(end.x - hand.x, end.y - hand.y)).toBeLessThan(1);
  });

  it('is caught by a tap on the way back, and lands in the grass when missed', () => {
    const game = setup();
    const swipe = { direction: 'up' as const, from: game.state.hand, dx: 0, dy: -150, speed: 900 };
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    while ((game.state.flight?.t ?? 0) < FLIGHT * CATCH_FROM) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.state.flight).toBeNull();
    expect(game.state.wait).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    for (let i = 0; i < 60 * 2.2; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.wait).toBeGreaterThan(0);
  });
});
