import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { countSolutions, createSudokuMini, makePuzzle, makeSolution, peers } from './logic';

describeMinigame('sudoku-mini');

describe('fruit sudoku rules', () => {
  it('makes full beds that keep every rule, and puzzles with one answer', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      const rng = createRng(seed);
      const solution = makeSolution(rng);
      solution.forEach((f, i) => expect(peers(i).every((j) => solution[j] !== f)).toBe(true));
      const puzzle = makePuzzle(rng, solution, 8);
      expect(puzzle.filter((f) => f < 0).length).toBeGreaterThanOrEqual(6);
      expect(countSolutions([...puzzle])).toBe(1);
    }
  });

  it('plants the right fruit by drag or by two taps, and sends a wrong one back', () => {
    const game = createSudokuMini({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(2) });
    const s = game.state;
    const centre = (i: number) => ({ x: s.left + ((i % 4) + 0.5) * s.cell, y: s.top + (Math.floor(i / 4) + 0.5) * s.cell });
    const empties = s.grid.map((f, i) => (f < 0 ? i : -1)).filter((i) => i >= 0);
    const [a, b] = empties;
    if (a === undefined || b === undefined) throw new Error('no empty squares');
    const right = s.solution[a] ?? 0;
    const wrongFruit = (right + 1) % 4;
    const tray = (f: number) => s.tray[f] ?? { x: 0, y: 0 };
    // Wrong fruit by drag.
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: tray(wrongFruit) });
    game.step(1 / 60, { ...NO_INPUT, pointer: centre(a) });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(s.grid[a]).toBe(-1);
    expect(s.wrong?.cell).toBe(a);
    // Right fruit by drag.
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: tray(right) });
    game.step(1 / 60, { ...NO_INPUT, pointer: centre(a) });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(s.grid[a]).toBe(right);
    // Two taps.
    const rightB = s.solution[b] ?? 0;
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [tray(rightB)] });
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [centre(b)] });
    expect(s.grid[b]).toBe(rightB);
  });
});
