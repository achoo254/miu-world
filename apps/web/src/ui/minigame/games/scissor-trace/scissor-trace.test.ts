import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createScissorTrace, NEAR, samplePath, SHAPES } from './logic';

describeMinigame('scissor-trace');

describe('scissor trace rules', () => {
  const setup = () => createScissorTrace({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(2) });
  const touch = (at: Point, pressed = false) => ({ ...NO_INPUT, pointer: at, pressed });

  it('closes every shape where it starts', () => {
    for (const kind of SHAPES) {
      const path = samplePath(kind, { x: 400, y: 300 }, 150);
      expect(path.length).toBeGreaterThan(50);
      expect(path.at(-1)).toEqual(path[0]);
    }
  });

  it('cuts along the line and frees the shape at the end', () => {
    const game = setup();
    const { path } = game.state;
    game.step(1 / 60, touch(path[0] ?? { x: 0, y: 0 }, true));
    for (let i = 4; i < path.length + 4; i += 4) game.step(1 / 60, touch(path[Math.min(i, path.length - 1)] ?? { x: 0, y: 0 }));
    expect(game.score).toBe(1);
    expect(game.state.neat).toBe(true);
  });

  it('does not cut across the shape, and stops when the finger wanders off', () => {
    const game = setup();
    const { path, centre } = game.state;
    const start = path[0] ?? { x: 0, y: 0 };
    game.step(1 / 60, touch(start, true));
    // Straight through the middle to the far side: nothing ahead on the line is near the finger.
    game.step(1 / 60, touch({ x: centre.x + (centre.x - start.x) * 0.2, y: centre.y + (centre.y - start.y) * 0.2 }));
    expect(game.state.progress).toBe(0);
    game.step(1 / 60, touch({ x: start.x + NEAR * 4, y: start.y + NEAR * 4 }));
    expect(game.state.cutting).toBe(false);
    expect(game.state.lost).toBe(true);
  });
});
