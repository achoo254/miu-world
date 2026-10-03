import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMakeTen, HUNDRED_AFTER, tileCentre } from './logic';

describeMinigame('make-ten');

describe('make ten rules', () => {
  const setup = () => createMakeTen({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: { speed: 1 }, rng: createRng(4) });
  const cells = (game: ReturnType<typeof setup>) => game.state.columns.flatMap((column, col) => column.map((tile, row) => ({ tile, col, row })));
  const tapCell = (game: ReturnType<typeof setup>, c: ReturnType<typeof cells>[number]) => game.step(1 / 60, { ...NO_INPUT, taps: [tileCentre(game.state, c.col, c.row, c.tile)] });

  it('pops two tiles that make ten and leaves two that do not', () => {
    const game = setup();
    const all = cells(game);
    const a = all.find((c) => all.some((d) => d !== c && d.tile.value + c.tile.value === 10));
    const b = a && all.find((d) => d !== a && d.tile.value + a.tile.value === 10);
    if (!a || !b) throw new Error('no pair dealt');
    const wrong = all.find((d) => d !== a && d.tile.value + a.tile.value !== 10);
    if (!wrong) throw new Error('no wrong tile');
    const before = all.length;
    tapCell(game, a);
    tapCell(game, wrong);
    expect(game.score).toBe(0);
    expect(cells(game)).toHaveLength(before);
    tapCell(game, a);
    tapCell(game, b);
    expect(game.score).toBe(1);
    expect(cells(game)).toHaveLength(before - 2);
  });

  it('turns every tile into its tens after the switch, so pairs make a hundred', () => {
    const game = setup();
    game.state.score = HUNDRED_AFTER - 1;
    const all = cells(game);
    const a = all.find((c) => all.some((d) => d !== c && d.tile.value + c.tile.value === 10));
    const b = a && all.find((d) => d !== a && d.tile.value + a.tile.value === 10);
    if (!a || !b) throw new Error('no pair dealt');
    tapCell(game, a);
    tapCell(game, b);
    expect(game.state.target).toBe(100);
    expect(cells(game).every((c) => c.tile.value % 10 === 0)).toBe(true);
  });

  it('stops the round when a column reaches the top', () => {
    const game = setup();
    for (let i = 0; i < 60 * 40 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.score).toBe(0);
  });
});
