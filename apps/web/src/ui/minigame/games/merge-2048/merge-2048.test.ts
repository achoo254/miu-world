import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type SwipeDirection } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { canMove, createMerge2048, grid, slide } from './logic';

describeMinigame('merge-2048');

describe('merge 2048 rules', () => {
  it('slides a line and merges each pair once, from the side it moves to', () => {
    const board = [
      [2, 2, 2, 2],
      [4, 0, 4, 8],
      [2, 2, 4, 0],
      [0, 0, 0, 0],
    ];
    expect(slide(board, 'left').values).toEqual([
      [4, 4, 0, 0],
      [8, 8, 0, 0],
      [4, 4, 0, 0],
      [0, 0, 0, 0],
    ]);
    expect(slide(board, 'right').values[0]).toEqual([0, 0, 4, 4]);
    expect(slide(board, 'down').values.map((r) => r[0])).toEqual([0, 2, 4, 2]);
    expect(slide([[2, 4], [8, 16]], 'up').moved).toBe(false);
    expect(canMove([[2, 4], [8, 16]])).toBe(false);
  });

  it('adds a tile after a move and keeps the biggest tile as the score', () => {
    const game = createMerge2048({ arena: { width: 863, height: 600 }, goal: 64, duration: 90, params: { size: 4 }, rng: createRng(1) });
    const count = () => game.state.tiles.length;
    expect(count()).toBe(2);
    const swipe = (direction: SwipeDirection) => game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction, from: { x: 400, y: 300 }, dx: 0, dy: 0, speed: 900 }] });
    for (const dir of ['left', 'down', 'right', 'up'] as const) {
      const before = JSON.stringify(grid(game.state));
      swipe(dir);
      for (let i = 0; i < 10; i += 1) game.step(1 / 60, NO_INPUT);
      if (JSON.stringify(grid(game.state)) !== before) break;
    }
    expect(count()).toBeGreaterThanOrEqual(2);
    expect(game.score).toBe(Math.max(...game.state.tiles.map((t) => t.value)));
  });
});
