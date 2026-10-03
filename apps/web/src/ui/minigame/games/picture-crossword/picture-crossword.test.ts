import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { buildPuzzle, cellCentre, createPictureCrossword } from './logic';
import { PUZZLES } from './puzzles';

describeMinigame('picture-crossword');

describe('picture crossword rules', () => {
  it('builds every puzzle: crossings share the same letter and every picture has a free spot', () => {
    for (const words of PUZZLES) {
      const built = buildPuzzle(words);
      expect(built, words.map((w) => w.word).join(' ')).not.toBeNull();
      expect(built?.badges).toHaveLength(words.length);
    }
  });

  it('keeps the right letter and bounces a wrong one', () => {
    const game = createPictureCrossword({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });
    const step = (input: Partial<GameInput>) => game.step(1 / 60, { ...NO_INPUT, ...input });
    const cell = game.state.cells.find((c) => !c.filled);
    if (!cell) throw new Error('no empty cell');
    const right = game.state.tiles.findIndex((t) => t.letter === cell.letter);
    const wrong = game.state.tiles.findIndex((t) => t.letter !== cell.letter);
    const at = cellCentre(game.state, cell.row, cell.col);
    const tapAt = (p: { x: number; y: number }) => step({ pressed: true, released: true, taps: [p] });
    tapAt(game.state.tiles[wrong]?.home ?? at);
    tapAt(at);
    expect(cell.filled).toBe(false);
    expect(game.state.sulk).toBeGreaterThan(0);
    for (let i = 0; i < 70; i += 1) step({});
    tapAt(game.state.tiles[right]?.home ?? at);
    tapAt(at);
    expect(cell.filled).toBe(true);
  });
});
