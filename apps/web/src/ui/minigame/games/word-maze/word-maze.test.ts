import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createWordMaze, randomPath, syllables, VERSES } from './logic';

// Tapping every cell in turn must not get through: each wrong cell makes the grid rest.
let n = 0;
describeMinigame('word-maze', {
  loser: ({ arena }) => {
    n += 1;
    return { tap: { x: 40 + ((n * 173) % Math.floor(arena.width - 80)), y: 240 + ((n * 97) % Math.floor(arena.height - 280)) } };
  },
});

describe('word maze rules', () => {
  it('makes paths of neighbouring cells that never cross', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i += 1) {
      const path = randomPath(rng, 4, 5, 8);
      expect(new Set(path).size).toBe(8);
      for (let k = 1; k < path.length; k += 1) {
        const a = path[k - 1] ?? 0;
        const b = path[k] ?? 0;
        expect(Math.abs(Math.floor(a / 4) - Math.floor(b / 4)) + Math.abs((a % 4) - (b % 4))).toBe(1);
      }
    }
  });

  it('hides the verse in the grid and no decoy repeats one of its syllables', () => {
    const game = createWordMaze({ arena: { width: 600, height: 863 }, goal: 4, duration: 90, params: {}, rng: createRng(5) });
    const verse = VERSES[game.state.verse];
    if (!verse) throw new Error('no verse');
    const words = syllables(verse).map((w) => w.toLowerCase());
    for (const cell of game.state.cells) {
      if (cell.path >= 0) expect(cell.text.toLowerCase()).toBe(words[cell.path]);
      else expect(words).not.toContain(cell.text.toLowerCase());
    }
  });

  it('walks on along the verse and rests after a wrong cell', () => {
    const game = createWordMaze({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(5) });
    const next = game.state.cells.findIndex((c) => c.path === 1);
    const wrong = game.state.cells.findIndex((c) => c.path < 0);
    game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, wrong) });
    expect(game.state.sulk).toBeGreaterThan(0);
    game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, next) });
    expect(game.state.walked).toHaveLength(1);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pointer: cellCentre(game.state, next) });
    expect(game.state.walked).toHaveLength(2);
  });
});
