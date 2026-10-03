import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDongHoPrint, JAM_SECONDS } from './logic';

// Drumming on the screen all the time must print nothing: every stray press jams the block.
describeMinigame('dong-ho-print', { loser: ({ arena }) => ({ tap: { x: arena.width / 2, y: arena.height / 2 } }) });

describe('Đông Hồ print rules', () => {
  const setup = () => createDongHoPrint({ arena: { width: 863, height: 600 }, goal: 30, duration: 90, params: { speed: 1 }, rng: createRng(2) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('prints a layer right on the mark for two points, and a clean picture earns one more', () => {
    const game = setup();
    for (let layer = 0; layer < 3; layer += 1) {
      const x = game.state.stamps[layer] ?? 0;
      while (game.state.sheet.x > x + 1) game.step(1 / 60, NO_INPUT);
      game.step(1 / 60, tap);
      expect(game.state.sheet.layers[layer]?.quality).toBe('perfect');
    }
    expect(game.score).toBe(7);
  });

  it('jams the block for a press with no sheet under it', () => {
    const game = setup();
    game.step(1 / 60, tap);
    expect(game.state.jam).toBeCloseTo(JAM_SECONDS, 5);
    expect(game.score).toBe(0);
    // Pressing a jammed block keeps it jammed.
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.state.jam).toBeCloseTo(JAM_SECONDS, 5);
  });
});
