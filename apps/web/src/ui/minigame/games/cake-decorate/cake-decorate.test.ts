import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { countOf, createCakeDecorate, makeOrder, SPOTS } from './logic';

describeMinigame('cake-decorate');

describe('cake decorate rules', () => {
  const setup = () => createCakeDecorate({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(3) });
  const tap = (game: ReturnType<typeof setup>, p: { x: number; y: number }) => game.step(1 / 60, { ...NO_INPUT, taps: [p] });

  it('orders one to five of two or three different kinds, never more than the cake holds', () => {
    const rng = createRng(1);
    for (let n = 0; n < 200; n += 1) {
      const order = makeOrder(rng, n);
      expect(new Set(order.map((o) => o.topping)).size).toBe(order.length);
      expect(order.every((o) => o.count >= 1 && o.count <= 5)).toBe(true);
      expect(order.reduce((s, o) => s + o.count, 0)).toBeLessThanOrEqual(Math.min(10, SPOTS));
    }
  });

  it('serves the cake only when every count is exact, after taking off an extra one', () => {
    const game = setup();
    const s = game.state;
    const [first, ...rest] = s.order;
    if (!first) throw new Error('empty order');
    const binOf = (topping: number) => s.binPoints[s.bins.indexOf(topping)] ?? { x: 0, y: 0 };
    for (let i = 0; i <= first.count; i += 1) tap(game, binOf(first.topping));
    expect(countOf(s, first.topping)).toBe(first.count + 1);
    expect(s.time - s.frownAt).toBeLessThan(0.1);
    const extra = s.toppings[s.toppings.length - 1];
    const p = extra ? s.spots[extra.spot] : undefined;
    if (!p) throw new Error('no topping');
    tap(game, p);
    expect(countOf(s, first.topping)).toBe(first.count);
    for (const line of rest) for (let i = 0; i < line.count; i += 1) tap(game, binOf(line.topping));
    expect(game.score).toBe(1);
    expect(s.phase).toBe('served');
  });
});
