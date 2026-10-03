import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createShikaku, makePuzzle } from './logic';

describeMinigame('shikaku-fields');

describe('shikaku rules', () => {
  const setup = () => createShikaku({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(3) });

  it('splits the grid into fields that cover it exactly, one number each', () => {
    const rng = createRng(5);
    for (let i = 0; i < 30; i += 1) {
      const { solution, clues } = makePuzzle(5, rng);
      expect(solution.reduce((s, r) => s + (r.c1 - r.c0 + 1) * (r.r1 - r.r0 + 1), 0)).toBe(25);
      expect(clues).toHaveLength(solution.length);
    }
  });

  it('marks a right field from a drag and turns away a wrong one', () => {
    const game = setup();
    const { grid } = game.state;
    const at = (c: number, r: number) => ({ x: grid.x + (c + 0.5) * grid.cell, y: grid.y + (r + 0.5) * grid.cell });
    const drag = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: a } as GameInput);
      game.step(1 / 60, { ...NO_INPUT, pointer: b });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    };
    // The whole grid holds every number: never a field.
    drag(at(0, 0), at(3, 3));
    expect(game.state.placed).toHaveLength(0);
    const right = game.state.solution[0];
    if (!right) throw new Error('no field');
    drag(at(right.c0, right.r0), at(right.c1, right.r1));
    expect(game.state.placed).toHaveLength(1);
  });
});
