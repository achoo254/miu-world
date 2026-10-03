import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPortalMaze, pathTo } from './logic';

describeMinigame('portal-maze');

describe('portal maze rules', () => {
  const make = (seed: number, width = 863, height = 600) => createPortalMaze({ arena: { width, height }, goal: 4, duration: 90, params: {}, rng: createRng(seed) });

  it('can only reach the chest through the doors', () => {
    for (let seed = 1; seed < 15; seed += 1) {
      for (const [w, h] of [
        [863, 600],
        [600, 1298],
      ] as const) {
        const game = make(seed, w, h);
        expect(pathTo(game.state, game.state.child, game.state.chest, false)).toEqual([]);
        expect(pathTo(game.state, game.state.child, game.state.chest, true).length).toBeGreaterThan(0);
      }
    }
  });
});
