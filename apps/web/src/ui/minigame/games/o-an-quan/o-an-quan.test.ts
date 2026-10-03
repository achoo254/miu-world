import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createOAnQuan, freshBoard, LEFT_QUAN, movePoints, sowMove, type Board } from './logic';

describeMinigame('o-an-quan');

describe('o an quan rules', () => {
  const play = (board: Board, from: number, way: 1 | -1) => [...sowMove(board, from, way)];

  it('drops one pebble per square and ends before a quan square', () => {
    const board = freshBoard();
    // Square 7 (bottom right) sown clockwise: 8, 9, 10, 11, then the left quan; the next is square 1 (full): pick it up.
    board.pebbles = [0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0];
    play(board, 7, 1);
    // Dropped on 8, 9, 10; next is 11 (empty), beyond it the left quan with its big stone: won.
    expect(board.pebbles.slice(7, 12)).toEqual([0, 1, 1, 1, 0]);
    expect(board.quan[LEFT_QUAN]).toBe(0);
  });

  it('wins what lies past an empty square, and goes on along a run of empty-then-full', () => {
    // 8 sown clockwise: one pebble on 9; 10 is empty, so 11 (five) is won; 0 is empty, so 1 (two) is won too.
    const run: Board = { pebbles: [0, 2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 5], quan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    expect(movePoints(run, 8, 1)).toBe(7);
    // The other way: one pebble on 7, then the right quan square is next: the turn just ends.
    expect(movePoints(run, 8, -1)).toBe(0);
  });

  it('picks up the next square and sows on when it has pebbles', () => {
    const board: Board = { pebbles: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2, 0], quan: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
    play(board, 8, 1);
    // One on 9; the next square (10) has two: picked up, one each on 11 and the left quan square.
    expect(board.pebbles).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1]);
  });

  it('waits for the child, and the computer answers her move', () => {
    const game = createOAnQuan({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(1) });
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.turn).toBe('child');
    const cell = game.state.cells[9];
    if (!cell) throw new Error('no cell');
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'left', from: { x: cell.x, y: cell.y }, dx: -90, dy: 0, speed: 900 }] });
    expect(game.state.sowing?.side).toBe('child');
    for (let i = 0; i < 60 * 20 && game.state.turn === 'child'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.turn).toBe('computer');
  });
});
