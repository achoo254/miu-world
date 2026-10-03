import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { bestSquare, CHILD, createCoCaro, CUN, N, winningLine } from './logic';

describeMinigame('co-caro');

describe('co caro rules', () => {
  const setup = () => createCoCaro({ arena: { width: 863, height: 600 }, goal: 1, duration: 90, params: {}, rng: createRng(2) });

  it('wins with four in a row on a diagonal, not with three', () => {
    const board = Array.from({ length: N * N }, () => 0);
    for (const i of [0, 7, 14]) board[i] = CHILD;
    expect(winningLine(board, CHILD)).toBeNull();
    board[21] = CHILD;
    expect(winningLine(board, CHILD)).toEqual([0, 7, 14, 21]);
  });

  it('blocks three in a row that could become four', () => {
    const board = Array.from({ length: N * N }, () => 0);
    for (const i of [6, 7, 8]) board[i] = CUN;
    // Row 1 starts with three of Cún's pieces: only square 9 can stop four.
    expect(bestSquare(board, CHILD)).toBe(9);
  });

  it('scores a game the child wins, and plays easier after a game Cún wins', () => {
    const game = setup();
    const s = game.state;
    const at = (i: number) => ({ x: s.left + ((i % N) + 0.5) * s.cell, y: s.top + (Math.floor(i / N) + 0.5) * s.cell });
    for (const i of [0, 1, 2]) s.board[i] = CHILD;
    game.step(1 / 60, { ...NO_INPUT, taps: [at(3)] });
    expect(game.score).toBe(1);
    expect(s.turn).toBe('over');
    for (let i = 0; i < 130; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.turn).toBe('child');
    expect(s.board.every((v) => v === 0)).toBe(true);
    const skill = s.skill;
    for (const i of [30, 31, 32]) s.board[i] = CUN;
    s.board[33] = 0;
    s.turn = 'cun';
    s.skill = 1;
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.winner).toBe(CUN);
    expect(s.skill).toBeLessThan(1);
    expect(skill).toBeGreaterThan(0);
  });
});
