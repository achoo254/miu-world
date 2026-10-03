import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { candidates, clueFor, createTreasureDig } from './logic';

describeMinigame('treasure-dig');

describe('treasure dig rules', () => {
  const setup = () => createTreasureDig({ arena: { width: 600, height: 863 }, goal: 3, duration: 90, params: { digs: 8 }, rng: createRng(6) });
  type Game = ReturnType<typeof setup>;
  const dig = (game: Game, col: number, row: number) =>
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.left + (col + 0.5) * game.state.cell, y: game.state.top + (row + 0.5) * game.state.cell }] });

  it('gives ring clues by diagonal steps', () => {
    const t = { col: 3, row: 3 };
    expect(clueFor(3, 3, t)).toBe(0);
    expect(clueFor(4, 4, t)).toBe(1);
    expect(clueFor(1, 3, t)).toBe(2);
    expect(clueFor(0, 9, t)).toBe(4);
  });

  it('scores the treasure dug up, and narrows where it can be', () => {
    const game = setup();
    const { col, row } = game.state.treasure;
    const far = { col: col > 2 ? 0 : 5, row: row > 3 ? 0 : 7 };
    dig(game, far.col, far.row);
    expect(game.state.digsLeft).toBe(7);
    expect(candidates(game.state).length).toBeLessThan(game.state.cols * game.state.rows);
    expect(candidates(game.state)).toContainEqual({ col, row });
    dig(game, col, row);
    expect(game.score).toBe(1);
    expect(game.state.ended?.how).toBe('found');
  });

  it('shows the treasure after eight misses and buries a new one', () => {
    const game = setup();
    const { col, row } = game.state.treasure;
    let dug = 0;
    for (let r = 0; r < game.state.rows && dug < 8; r += 1) {
      for (let c = 0; c < game.state.cols && dug < 8; c += 1) {
        if (c === col && r === row) continue;
        dig(game, c, r);
        dug += 1;
      }
    }
    expect(game.state.ended?.how).toBe('lost');
    expect(game.score).toBe(0);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.dug).toHaveLength(0);
    expect(game.state.round).toBe(2);
  });
});
