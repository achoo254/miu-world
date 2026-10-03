import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createShoppingMemory, itemPoint, MAX_SLIPS } from './logic';

/** Grabs whatever is on the counters, without remembering the list. */
const grabber = ({ arena, time }: BotContext): BotMove => {
  const h = Math.abs(Math.sin(time * 12.9898) * 43758.5453) % 1;
  const k = Math.abs(Math.sin(time * 78.233) * 12345.678) % 1;
  return { tap: { x: 60 + h * (arena.width - 120), y: 130 + k * (arena.height * 0.5) } };
};

describeMinigame('shopping-memory');
describeMinigame('shopping-memory', { loser: grabber });

describe('shopping memory rules', () => {
  const setup = () => createShoppingMemory({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(5) });
  const toShop = (game: ReturnType<typeof setup>) => {
    while (game.state.phase !== 'shop') game.step(1 / 60, NO_INPUT);
  };

  it('puts a thing on the list in the basket, and a third wrong pick ends the trip', () => {
    const game = setup();
    toShop(game);
    const want = game.state.list[0] ?? 0;
    const stall = game.state.stalls[0];
    if (!stall) throw new Error('no stall');
    stall.goods[0] = want;
    game.step(1 / 60, { ...NO_INPUT, taps: [itemPoint(game.state, stall, 0)] });
    expect(game.state.found).toEqual([want]);
    const other = Array.from({ length: 18 }, (_, i) => i).find((g) => !game.state.list.includes(g)) ?? 0;
    for (let i = 0; i < MAX_SLIPS; i += 1) {
      stall.goods[1] = other;
      game.step(1 / 60, { ...NO_INPUT, taps: [itemPoint(game.state, stall, 1)] });
    }
    expect(game.state.phase).toBe('failed');
    expect(game.score).toBe(0);
  });
});
