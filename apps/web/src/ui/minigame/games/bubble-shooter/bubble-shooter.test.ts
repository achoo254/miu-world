import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createBubbleShooter, rowCols } from './logic';

describeMinigame('bubble-shooter');

describe('bubble shooter rules', () => {
  const setup = () => {
    const game = createBubbleShooter({ arena: { width: 863, height: 600 }, goal: 30, duration: 90, params: {}, rng: createRng(2) });
    // An empty board but for a pair of one colour at the top left.
    game.state.grid = game.state.grid.map((_, row) => Array.from({ length: rowCols(game.state, row) }, () => -1));
    return game;
  };
  const shootAt = (game: ReturnType<typeof setup>, x: number, y: number) => {
    game.step(1 / 60, { ...NO_INPUT, pointer: { x, y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 120 && game.state.shot; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('pops three of a colour, and drops a bubble left hanging under them', () => {
    const game = setup();
    const line0 = game.state.grid[0];
    const line1 = game.state.grid[1];
    if (!line0 || !line1) throw new Error('no rows');
    line0[0] = 3;
    line0[4] = 1;
    line0[5] = 1;
    line1[4] = 2;
    game.state.current = 1;
    const target = cellCentre(game.state, { row: 0, col: 6 });
    shootAt(game, target.x, target.y);
    expect(game.score).toBe(4);
    expect(game.state.grid.flat().filter((c) => c >= 0)).toEqual([3]);
  });

  it('only sticks a pair, without points', () => {
    const game = setup();
    const line0 = game.state.grid[0];
    if (!line0) throw new Error('no row');
    line0[4] = 1;
    game.state.current = 1;
    const target = cellCentre(game.state, { row: 0, col: 5 });
    shootAt(game, target.x, target.y);
    expect(game.score).toBe(0);
    expect(game.state.grid.flat().filter((c) => c >= 0)).toHaveLength(2);
  });
});
