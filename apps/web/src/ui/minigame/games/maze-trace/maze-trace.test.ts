import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMazeTrace, distances, RIGHT, UP } from './logic';

describeMinigame('maze-trace');

describe('maze trace rules', () => {
  const setup = (seed = 2) => createMazeTrace({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: { speed: 1 }, rng: createRng(seed) });
  type Game = ReturnType<typeof setup>;
  const centre = (game: Game, col: number, row: number) => ({ x: game.state.left + (col + 0.5) * game.state.cell, y: game.state.top + (row + 0.5) * game.state.cell });

  it('builds a perfect maze: every cell reachable, stars and home inside', () => {
    for (const seed of [1, 2, 3]) {
      const game = setup(seed);
      const { dist } = distances(game.state, (game.state.rows - 1) * game.state.cols);
      expect(dist.every((d) => d >= 0)).toBe(true);
      expect(game.state.stars).toHaveLength(3);
      expect(game.state.cell).toBeGreaterThanOrEqual(85);
    }
  });

  it('never walks through a hedge', () => {
    const game = setup();
    const { cols, rows } = game.state;
    // Force the start cell closed upward and to the right: a finger up-right goes nowhere.
    const start = (rows - 1) * cols;
    game.state.open[start] = (game.state.open[start] ?? 0) & ~(UP | RIGHT);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: centre(game, 3, 0) });
    expect([game.state.px, game.state.py]).toEqual([0, rows - 1]);
  });

  it('walks toward the finger along an open way and picks up a star there', () => {
    const game = setup();
    const { cols, rows } = game.state;
    const start = (rows - 1) * cols;
    const star = game.state.stars[0];
    if (!star) throw new Error('no star');
    // Open a straight way along the bottom row and put a star at its end.
    for (let c = 0; c < 3; c += 1) {
      const i = start + c;
      game.state.open[i] = (game.state.open[i] ?? 0) | RIGHT;
    }
    star.col = 3;
    star.row = rows - 1;
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: centre(game, 3, rows - 1) });
    expect(game.state.px).toBe(3);
    expect(game.score).toBe(1);
  });
});
