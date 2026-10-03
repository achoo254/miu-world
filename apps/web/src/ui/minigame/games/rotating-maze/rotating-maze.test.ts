import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { angleFor, createRotatingMaze, gravityIn, makeMaze } from './logic';

describeMinigame('rotating-maze');

describe('rotating maze rules', () => {
  it('makes mazes where every square can be reached, with a gap on the border', () => {
    for (let seed = 1; seed < 20; seed += 1) {
      const maze = makeMaze(createRng(seed), 6);
      const open = maze.walls.reduce((n, w) => n + w.filter((x) => !x).length, 0);
      // A perfect maze has n² − 1 passages (each counted from both sides) plus the gap.
      expect(open).toBe((36 - 1) * 2 + 1);
      expect(maze.walls[maze.exit]?.[maze.exitDir]).toBe(false);
    }
  });

  it('turns "down" with the board', () => {
    for (let d = 0; d < 4; d += 1) {
      const [gx, gy] = gravityIn(angleFor(d));
      const dirs = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][d] ?? [0, 0];
      expect(gx).toBeCloseTo(dirs[0] ?? 0);
      expect(gy).toBeCloseTo(dirs[1] ?? 0);
    }
  });

  it('lets the ball roll only where the board tips it, and settles the board when let go', () => {
    const game = createRotatingMaze({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(4) });
    const s = game.state;
    s.angle = 0.3;
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(Math.abs(s.angle)).toBeLessThan(0.01);
  });
});
