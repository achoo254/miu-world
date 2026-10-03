import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCustomerMemory } from './logic';

describeMinigame('customer-memory');

describe('customer memory rules', () => {
  it('serves the right dish for a point and repeats the order once after a wrong one', () => {
    const game = createCustomerMemory({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(6) });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    const c = game.state.seats[0];
    if (!c) throw new Error('no customer');
    const want = c.wants[0] ?? 0;
    const wrong = (want + 1) % 6;
    const tap = (p: { x: number; y: number }) => game.step(1 / 60, { ...NO_INPUT, taps: [p] });
    for (let i = 0; i < 200; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.time).toBeGreaterThan(c.sayUntil);
    tap(game.state.seatAt[0] ?? { x: 0, y: 0 });
    tap(game.state.dishAt[wrong] ?? { x: 0, y: 0 });
    expect(c.sayUntil).toBeGreaterThan(game.state.time);
    expect(c.canRepeat).toBe(false);
    tap(game.state.dishAt[want] ?? { x: 0, y: 0 });
    tap(game.state.seatAt[0] ?? { x: 0, y: 0 });
    expect(c.wants).toEqual([]);
    expect(game.score).toBe(1);
  });
});
