import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { count, createCoGanh, links, playMove, startBoard, TOTAL, type Board } from './logic';

describeMinigame('co-ganh');

const empty = (): Board => Array.from({ length: 25 }, () => 0 as const);

describe('cờ gánh rules', () => {
  it('starts with eight pieces each and joins diagonals only on every other point', () => {
    const b = startBoard();
    expect(count(b, 1)).toBe(8);
    expect(count(b, 2)).toBe(8);
    expect(links(0).sort((a, c) => a - c)).toEqual([1, 5, 6]);
    expect(links(1).sort((a, c) => a - c)).toEqual([0, 2, 6]);
  });

  it('carries the two enemy pieces on either side of the landing point (gánh)', () => {
    const b = empty();
    b[11] = 2;
    b[13] = 2;
    b[17] = 1;
    b[0] = 2;
    const { board, turned } = playMove(b, 17, 12);
    expect(turned.sort()).toEqual([11, 13]);
    expect(board[11]).toBe(1);
    expect(board[0]).toBe(2);
  });

  it('turns an enemy piece with nowhere to go (vây)', () => {
    const b = empty();
    b[0] = 2;
    b[1] = 1;
    b[6] = 1;
    b[10] = 1;
    const { board } = playMove(b, 10, 5);
    expect(board[0]).toBe(1);
  });

  it('only ever changes colours, never the number of pieces', () => {
    const game = createCoGanh({ arena: { width: 863, height: 600 }, goal: 9, duration: 90, params: {}, rng: createRng(1) });
    const { left, top, gap } = game.state;
    const at = (i: number) => ({ x: left + (i % 5) * gap, y: top + Math.floor(i / 5) * gap });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(20)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(15)] });
    expect(game.state.turn).toBe(1);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(15)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(16)] });
    expect(game.state.turn).toBe(2);
    expect(count(game.state.board, 1) + count(game.state.board, 2)).toBe(TOTAL);
  });
});
