import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createBatEcho, makeCave, route } from './logic';

describeMinigame('bat-echo');

describe('bat echo rules', () => {
  it('makes caves with exactly one way from every cell to the way out', () => {
    const rng = createRng(2);
    for (let i = 0; i < 30; i += 1) {
      const cave = makeCave(rng, 863, 600, i % 5);
      // A perfect maze: one passage fewer than cells.
      expect(cave.open.size).toBe(cave.cols * cave.rows - 1);
      expect(route(cave, 0).at(-1)).toBe(cave.exit);
    }
  });

  it('stuns the bat when it flies into a wall, and a tap squeaks', () => {
    const game = createBatEcho({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });
    const start = cellCentre(game.state.cave, 0);
    // Straight up from the first cell is the cave's outer wall.
    for (let i = 0; i < 60 && game.state.stunned === 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: start.x, y: start.y - 300 } });
    expect(game.state.stunned).toBeGreaterThan(0);
    game.step(1 / 60, { ...NO_INPUT, taps: [start] });
    expect(game.state.echoAgo).toBeLessThan(0.05);
  });
});
