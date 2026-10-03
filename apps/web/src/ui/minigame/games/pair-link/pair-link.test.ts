import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPairLink, findLink, HINT_SECONDS } from './logic';

describeMinigame('pair-link');

describe('pair link rules', () => {
  // A 4 × 3 board by hand: -1 empty.
  const board = (tiles: number[]) => ({ cols: 4, rows: 3, tiles });

  it('joins with up to two bends, around the edge too, never through a tile', () => {
    // 0 1 2 0
    // 3 1 2 3
    // 4 5 6 4
    const b = board([0, 1, 2, 0, 3, 1, 2, 3, 4, 5, 6, 4]);
    expect(findLink(b, 0, 3)).not.toBeNull(); // over the top edge: two bends
    expect(findLink(b, 1, 5)).not.toBeNull(); // neighbours
    expect(findLink(b, 8, 11)).not.toBeNull(); // under the bottom edge
    expect(findLink(b, 4, 7)).toBeNull(); // would need four bends around the board
    expect(findLink(board([0, 1, 2, 3, 4, 0, 5, 6, 7, 8, 9, 10]), 0, 5)).toBeNull(); // boxed in by tiles
    // Three bends needed: corner to the middle of the far side, through a gap that is not straight.
    expect(findLink(board([0, 1, 2, 3, 4, -1, 5, 6, 7, 8, 0, 9]), 0, 10)).toBeNull();
  });

  it('scores a joined pair, keeps a wrong pick as the new pick, and hints when stuck', () => {
    const game = createPairLink({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(5) });
    const s = game.state;
    s.tiles = s.tiles.map(() => 7);
    s.tiles[0] = 0;
    s.tiles[1] = 0;
    s.tiles[2] = 1;
    const at = (i: number) => ({ x: s.left + ((i % s.cols) + 0.5) * s.cell, y: s.top + (Math.floor(i / s.cols) + 0.5) * s.cell });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(0), at(2)] });
    expect(game.score).toBe(0);
    expect(s.selected).toBe(2);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(0), at(1)] });
    expect(game.score).toBe(1);
    expect(s.tiles[0]).toBe(-1);
    for (let i = 0; i < HINT_SECONDS * 60 + 5; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.hint).not.toBeNull();
  });
});
