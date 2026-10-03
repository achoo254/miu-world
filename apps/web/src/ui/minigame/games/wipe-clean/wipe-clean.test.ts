import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWipeClean, TOOLS } from './logic';

describeMinigame('wipe-clean');

describe('wipe clean rules', () => {
  const setup = () => createWipeClean({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(2) });
  /** Rubs over the whole thing, row by row. */
  const scrub = (game: ReturnType<typeof setup>) => {
    const { cx, cy, size } = game.state;
    for (let y = cy - size / 2; y <= cy + size / 2; y += 40) {
      for (const x of [cx - size / 2, cx + size / 2]) {
        const p: Point = { x, y };
        game.step(1 / 60, { ...NO_INPUT, pointer: p });
      }
    }
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('goes soap, water, towel, and scores the clean thing', () => {
    const game = setup();
    for (let step = 0; step < TOOLS.length; step += 1) {
      expect(game.state.stage).toBe(step);
      scrub(game);
    }
    expect(game.score).toBe(1);
  });

  it('does nothing for a finger that rests without rubbing', () => {
    const game = setup();
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.cx, y: game.state.cy } });
    expect(game.state.cells.filter((c) => c > 0)).toHaveLength(0);
  });
});
