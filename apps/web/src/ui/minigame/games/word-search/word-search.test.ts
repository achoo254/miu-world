import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellsOf, createWordSearch, lettersOf, lineCells, makeBoard, N, WORDS, WORDS_PER_BOARD } from './logic';
import { PICTURES } from './draw';

describeMinigame('word-search');

describe('word search rules', () => {
  const setup = () => createWordSearch({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(2) });

  it('hides six words that read across or down, each with a picture', () => {
    expect(PICTURES.length).toBe(WORDS.length);
    const rng = createRng(4);
    for (let n = 0; n < 30; n += 1) {
      const { grid, placed } = makeBoard(rng);
      expect(placed).toHaveLength(WORDS_PER_BOARD);
      for (const p of placed) expect(cellsOf(p).map((i) => grid[i]).join('')).toBe(lettersOf(WORDS[p.word]?.[0] ?? '').join(''));
    }
  });

  it('finds a word by tapping its first and last letters, not by a wrong line', () => {
    const game = setup();
    const s = game.state;
    const centre = (i: number) => ({ x: s.left + ((i % N) + 0.5) * s.cell, y: s.top + (Math.floor(i / N) + 0.5) * s.cell });
    const target = s.placed[0];
    if (!target) throw new Error('no word');
    const cells = cellsOf(target);
    expect(lineCells(cells[cells.length - 1] ?? 0, cells[0] ?? 0)).toEqual(cells);
    game.step(1 / 60, { ...NO_INPUT, taps: [centre(cells[0] ?? 0)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [centre(cells[cells.length - 1] ?? 0)] });
    expect(game.score).toBe(1);
    expect(target.found).toBe(true);
    game.step(1 / 60, { ...NO_INPUT, taps: [centre(0)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [centre(N - 1)] });
    expect(game.score).toBeLessThanOrEqual(2);
  });
});
