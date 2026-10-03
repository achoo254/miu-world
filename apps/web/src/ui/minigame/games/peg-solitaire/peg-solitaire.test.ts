import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPegSolitaire, gems, hops, indexOf, STARTS } from './logic';

describeMinigame('peg-solitaire');

describe('peg solitaire rules', () => {
  it('offers only starts that can be cleared to one gem, the top corner among them', () => {
    expect(STARTS).toContain(indexOf(0, 0));
    expect(STARTS.length).toBeGreaterThan(0);
  });

  it('hops a gem over its neighbour into the empty hole and takes the one jumped', () => {
    const full = (1 << 15) - 1;
    const board = full & ~(1 << indexOf(0, 0));
    const legal = hops(board);
    expect(legal.map(([from, over, to]) => [from, over, to]).sort()).toEqual(
      [
        [indexOf(2, 0), indexOf(1, 0), indexOf(0, 0)],
        [indexOf(2, 2), indexOf(1, 1), indexOf(0, 0)],
      ].sort(),
    );
    const game = createPegSolitaire({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(1) });
    game.state.board = board;
    const tap = (i: number) => game.step(1 / 60, { ...NO_INPUT, taps: [game.state.holes[i] ?? { x: 0, y: 0 }] });
    tap(indexOf(2, 0));
    tap(indexOf(0, 0));
    expect(gems(game.state.board)).toBe(13);
    expect(game.score).toBe(1);
    // "Lùi" takes it back.
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.undo] });
    expect(gems(game.state.board)).toBe(14);
    expect(game.score).toBe(0);
  });
});
