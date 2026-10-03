import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSlidingTiles, isSolved, solve } from './logic';

describeMinigame('sliding-tiles');

describe('sliding tiles rules', () => {
  const setup = () => createSlidingTiles({ arena: { width: 863, height: 600 }, goal: 1, duration: 90, params: {}, rng: createRng(9) });
  const at = (game: ReturnType<typeof setup>, i: number) => {
    const tile = game.state.board / 3;
    return { x: game.state.boardX + ((i % 3) + 0.5) * tile, y: game.state.boardY + (Math.floor(i / 3) + 0.5) * tile };
  };

  it('starts shuffled and slides a whole row toward the gap, but not a tile off its line', () => {
    const game = setup();
    expect(isSolved(game.state.tiles)).toBe(false);
    game.state.tiles = [0, 1, 2, 3, 4, 5, 8, 6, 7];
    game.step(1 / 60, { ...NO_INPUT, taps: [at(game, 2)] });
    expect(game.state.tiles).toEqual([0, 1, 2, 3, 4, 5, 8, 6, 7]);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(game, 8)] });
    expect(game.state.tiles).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(game.score).toBe(1);
  });

  it('finds a shortest solution', () => {
    const board = [1, 2, 5, 0, 4, 8, 3, 6, 7];
    const moves = solve(board);
    const tiles = [...board];
    for (const square of moves) {
      const gap = tiles.indexOf(8);
      tiles[gap] = tiles[square] ?? 8;
      tiles[square] = 8;
    }
    expect(isSolved(tiles)).toBe(true);
    expect(moves.length).toBeLessThanOrEqual(10);
  });
});
