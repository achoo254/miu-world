import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMatch3, findMatches } from './logic';

describeMinigame('match-3');

describe('match three rules', () => {
  const setup = () => createMatch3({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: {}, rng: createRng(4) });
  const settle = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 300 && game.state.phase !== 'idle'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('finds runs of three or more in rows and columns', () => {
    // 3 × 3: a row of 0s on top, a column of 1s on the right.
    expect(findMatches([0, 0, 0, 2, 3, 1, 4, 2, 1], 3, 3).sort()).toEqual([0, 1, 2]);
    expect(findMatches([0, 2, 1, 3, 4, 1, 2, 3, 1], 3, 3).sort()).toEqual([2, 5, 8]);
    expect(findMatches([0, 1, 0, 1, 0, 1, 0, 1, 0], 3, 3)).toEqual([]);
  });

  it('pops a swap that lines up three and swaps back one that does not', () => {
    const game = setup();
    const s = game.state;
    // A checked grid with nothing to pop; row 0 starts 0 1 0 0 and a 0 waits under the 1.
    s.grid = s.grid.map((_, i) => (i % 2 === 0 ? (Math.floor(i / s.cols) % 2 === 0 ? 2 : 3) : Math.floor(i / s.cols) % 2 === 0 ? 4 : 1));
    s.grid[0] = 0;
    s.grid[1] = 1;
    s.grid[2] = 0;
    s.grid[3] = 0;
    s.grid[s.cols + 1] = 0;
    const at = (i: number) => ({ x: s.left + ((i % s.cols) + 0.5) * s.cell, y: s.top + (Math.floor(i / s.cols) + 0.5) * s.cell });
    // Two fruit in row 0 that line up nothing: they swap back.
    game.step(1 / 60, { ...NO_INPUT, taps: [at(4)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(5)] });
    settle(game);
    expect(game.score).toBe(0);
    // The 0 under the 1 swiped up: 0 0 0 0 in row 0.
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'up', from: at(s.cols + 1), dx: 0, dy: -s.cell, speed: 900 }] });
    settle(game);
    expect(game.score).toBeGreaterThanOrEqual(4);
  });
});
