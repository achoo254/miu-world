import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLowToHigh, levelFor } from './logic';

describeMinigame('low-to-high');

describe('low to high rules', () => {
  const setup = () => createLowToHigh({ arena: { width: 600, height: 1298 }, goal: 6, duration: 90, params: {}, rng: createRng(5) });
  const tapValue = (game: ReturnType<typeof setup>, value: number) => {
    const t = game.state.tiles.find((x) => x.value === value);
    if (!t) throw new Error('no tile');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: t.x, y: t.y }] });
  };

  it('deals distinct numbers in the class 2 range, big enough to tap', () => {
    const game = setup();
    for (let round = 0; round < 8; round += 1) {
      const { count, max } = levelFor(round);
      expect(count).toBeLessThanOrEqual(6);
      expect(max).toBeLessThanOrEqual(100);
    }
    const values = game.state.tiles.map((t) => t.value);
    expect(new Set(values).size).toBe(values.length);
    for (const t of game.state.tiles) expect(t.size).toBeGreaterThanOrEqual(90);
  });

  it('scores a round tapped in order, not a round with a slip', () => {
    const game = setup();
    for (const v of [...game.state.order]) tapValue(game, v);
    expect(game.score).toBe(1);
    while (game.state.phase !== 'show') game.step(1 / 60, NO_INPUT);
    const [first, second] = game.state.order;
    if (first === undefined || second === undefined) throw new Error('short round');
    tapValue(game, second);
    expect(game.state.slips).toBe(1);
    // The right tile turned up by itself; the rest still count.
    expect(game.state.tiles.find((t) => t.value === first)?.done).toBe(true);
    for (const v of game.state.order.slice(1)) tapValue(game, v);
    expect(game.score).toBe(1);
  });
});
