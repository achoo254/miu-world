import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPacMaze, distances, isOpen, makeMaze } from './logic';

describeMinigame('pac-maze');

describe('pac maze rules', () => {
  const setup = () => createPacMaze({ arena: { width: 863, height: 600 }, goal: 60, duration: 90, params: { ghostSpeed: 1 }, rng: createRng(5) });

  it('makes mazes where every cell can be reached and none is a dead end', () => {
    const rng = createRng(3);
    const open = makeMaze(9, 11, rng);
    const dist = distances({ cols: 9, rows: 11, open }, 0, 0);
    expect(dist.every((d) => Number.isFinite(d))).toBe(true);
    const sides = (v: number): number => [1, 2, 4, 8].filter((b) => (v & b) !== 0).length;
    expect(open.every((v) => sides(v) >= 2)).toBe(true);
  });

  it('walks the way she swipes and eats the seed in each cell', () => {
    const game = setup();
    const ways = (['up', 'left', 'right'] as const).filter((d) => isOpen(game.state, game.state.startX, game.state.startY, { up: 1, right: 2, down: 4, left: 8 }[d]));
    const swipe: Swipe = { direction: ways[0] ?? 'up', from: { x: 0, y: 0 }, dx: 0, dy: -80, speed: 900 };
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBeGreaterThan(0);
  });

  it('a ghost that touches her costs a heart and sends everyone home', () => {
    const game = setup();
    const ghost = game.state.ghosts[0];
    if (!ghost) throw new Error('no ghost');
    Object.assign(ghost, { x: game.state.startX, y: game.state.startY, tx: game.state.startX, ty: game.state.startY, t: 0, dir: 0, wait: 0 });
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
    expect(ghost.x).toBe(ghost.homeX);
  });
});
