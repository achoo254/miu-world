import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKnightHop, hopDistances, knightMoves, SIZE } from './logic';

describeMinigame('knight-hop');

describe('knight hop rules', () => {
  it('hops in L-shapes and can reach every square of the floor', () => {
    expect(knightMoves(0, 0).sort((a, b) => a.col - b.col)).toEqual([
      { col: 1, row: 2 },
      { col: 2, row: 1 },
    ]);
    expect(knightMoves(2, 2).length).toBe(8);
    expect(hopDistances(0, 0).every((d) => Number.isFinite(d))).toBe(true);
  });

  it('only moves to a square it can reach, and picks up the star there', () => {
    const game = createKnightHop({ arena: { width: 863, height: 600 }, goal: 17, duration: 90, params: {}, rng: createRng(3) });
    const { at, left, top, cell } = game.state;
    const tapAt = (col: number, row: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: left + (col + 0.5) * cell, y: top + (row + 0.5) * cell }] });
    const blocked = [...Array(SIZE * SIZE).keys()].find((i) => !knightMoves(at.col, at.row).some((m) => m.row * SIZE + m.col === i) && i !== at.row * SIZE + at.col) ?? 0;
    tapAt(blocked % SIZE, Math.floor(blocked / SIZE));
    expect(game.state.at).toEqual(at);
    const move = knightMoves(at.col, at.row)[0];
    if (!move) throw new Error('no move');
    game.state.stars.add(move.row * SIZE + move.col);
    tapAt(move.col, move.row);
    expect(game.state.at).toEqual(move);
    expect(game.score).toBe(1);
  });
});
