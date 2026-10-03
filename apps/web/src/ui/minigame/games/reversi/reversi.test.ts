import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CHILD, countOf, createReversi, flipsFor, legalMoves, N, OWL, startBoard } from './logic';

describeMinigame('reversi');

describe('reversi rules', () => {
  const setup = () => createReversi({ arena: { width: 863, height: 600 }, goal: 1, duration: 90, params: {}, rng: createRng(1) });

  it('opens with four moves, each flipping one stone', () => {
    const board = startBoard();
    const moves = legalMoves(board, CHILD);
    expect(moves).toHaveLength(4);
    for (const m of moves) expect(flipsFor(board, CHILD, m)).toHaveLength(1);
  });

  it('flips the trapped stones and hands the turn to the owl, ignoring a square that traps nothing', () => {
    const game = setup();
    const s = game.state;
    const tapAt = (i: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.left + ((i % N) + 0.5) * s.cell, y: s.top + (Math.floor(i / N) + 0.5) * s.cell }] });
    tapAt(0);
    expect(s.turn).toBe('child');
    const move = legalMoves(s.board, CHILD)[0] ?? 0;
    tapAt(move);
    expect(countOf(s.board, CHILD)).toBe(4);
    expect(countOf(s.board, OWL)).toBe(1);
    expect(s.turn).toBe('owl');
    for (let i = 0; i < 50; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.turn).toBe('child');
    expect(countOf(s.board, CHILD) + countOf(s.board, OWL)).toBe(6);
  });
});
