import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type SwipeDirection } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createIceSlide, slideEnd, solve } from './logic';

describeMinigame('ice-slide');

describe('ice slide rules', () => {
  const setup = (seed = 3) => createIceSlide({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: { rocks: 0.18 }, rng: createRng(seed) });
  const swipe = (direction: SwipeDirection) => ({ ...NO_INPUT, swipes: [{ direction, from: { x: 400, y: 300 }, dx: 0, dy: 0, speed: 1000 }] });

  it('slides until a rock or the edge, and stops on the house when it passes it', () => {
    const board = { cols: 5, rows: 1, rocks: [false, false, false, true, false], hut: { col: 4, row: 0 } };
    expect(slideEnd(board, { col: 0, row: 0 }, 'right')).toEqual({ col: 2, row: 0 });
    const open = { ...board, rocks: [false, false, false, false, false], hut: { col: 2, row: 0 } };
    expect(slideEnd(open, { col: 0, row: 0 }, 'right')).toEqual({ col: 2, row: 0 });
  });

  it('makes boards that need three to six slides', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = setup(seed);
      const path = solve(game.state, game.state.start);
      expect(path?.length).toBeGreaterThanOrEqual(3);
      expect(path?.length).toBeLessThanOrEqual(6);
    }
  });

  it('scores the penguin brought home, and the reset puts it back at the start', () => {
    const game = setup();
    const path = solve(game.state, game.state.start) ?? [];
    const first = path[0];
    if (!first) throw new Error('no path');
    game.step(1 / 60, swipe(first));
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.moves).toBe(1);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.reset.x, y: game.state.reset.y }] });
    expect([game.state.px, game.state.py, game.state.moves]).toEqual([game.state.start.col, game.state.start.row, 0]);
    for (const dir of path) {
      game.step(1 / 60, swipe(dir));
      for (let i = 0; i < 60 && game.state.slide; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(1);
  });
});
