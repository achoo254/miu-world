import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStonePath } from './logic';

describeMinigame('stone-path-memory');

describe('stone path rules', () => {
  const setup = (seed = 1) => createStonePath({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(seed) });
  const until = (game: ReturnType<typeof setup>, phase: string) => {
    for (let i = 0; i < 600 && game.state.phase !== phase; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('makes a path of linked stones from the near bank to the far one, longer after each stream', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = setup(seed);
      const cells = game.state.path.map((i) => game.state.stones[i]);
      expect(cells.length).toBe(4);
      expect(cells[0]?.row).toBe(0);
      expect(cells.at(-1)?.row).toBe(3);
      for (let k = 1; k < cells.length; k += 1) {
        const a = cells[k - 1];
        const b = cells[k];
        expect(a && b && Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
      }
      expect(new Set(game.state.path).size).toBe(game.state.path.length);
    }
  });

  it('scores a crossing for the right stones and shows the path again after a wrong one', () => {
    const game = setup();
    until(game, 'play');
    const wrong = game.state.stones.findIndex((_, i) => i !== game.state.path[0]);
    const w = game.state.stones[wrong];
    if (w) game.step(1 / 60, { ...NO_INPUT, taps: [w] });
    expect(game.state.phase).toBe('oops');
    until(game, 'play');
    for (const i of game.state.path) {
      const s = game.state.stones[i];
      if (s) game.step(1 / 60, { ...NO_INPUT, taps: [s] });
    }
    until(game, 'show');
    expect(game.score).toBe(1);
    expect(game.state.path.length).toBe(5);
  });
});
