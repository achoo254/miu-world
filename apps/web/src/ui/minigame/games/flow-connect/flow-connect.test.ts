import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createFlowConnect, randomFullPath } from './logic';

describeMinigame('flow-connect');

describe('flow connect rules', () => {
  const setup = () => createFlowConnect({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(6) });
  const drag = (game: ReturnType<typeof setup>, cells: number[]) => {
    cells.forEach((cell, i) => {
      const input: GameInput = { ...NO_INPUT, pointer: cellCentre(game.state, cell), pressed: i === 0 };
      game.step(1 / 60, input);
    });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('makes boards from a path through every square', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const path = randomFullPath(5, createRng(seed));
      expect(new Set(path).size).toBe(25);
      for (let i = 1; i < path.length; i += 1) {
        const a = path[i - 1] ?? 0;
        const b = path[i] ?? 0;
        expect(Math.abs((a % 5) - (b % 5)) + Math.abs(Math.floor(a / 5) - Math.floor(b / 5))).toBe(1);
      }
    }
  });

  it('scores a board once every pair is joined and every square filled', () => {
    const game = setup();
    const pieces = game.state.solution;
    pieces.slice(0, -1).forEach((piece) => drag(game, piece));
    expect(game.score).toBe(0);
    drag(game, pieces[pieces.length - 1] ?? []);
    expect(game.score).toBe(1);
  });

  it('cuts back a pipe that another pipe is drawn over, and never passes another dot', () => {
    const game = setup();
    const [first, second] = game.state.solution;
    if (!first || !second) throw new Error('no pieces');
    drag(game, first);
    expect(game.state.paths[0]).toEqual(first);
    // Draw the second pipe from its start straight onto the first pipe's middle square, if they touch.
    const meeting = first.find((cell) => second.some((s) => Math.abs((s % 5) - (cell % 5)) + Math.abs(Math.floor(s / 5) - Math.floor(cell / 5)) === 1) && cell !== first[0] && cell !== first[first.length - 1]);
    if (meeting === undefined) return;
    const from = second.find((s) => Math.abs((s % 5) - (meeting % 5)) + Math.abs(Math.floor(s / 5) - Math.floor(meeting / 5)) === 1) ?? 0;
    drag(game, [...second.slice(0, second.indexOf(from) + 1), meeting]);
    expect(game.state.paths[0]).toEqual(first.slice(0, first.indexOf(meeting)));
  });
});
