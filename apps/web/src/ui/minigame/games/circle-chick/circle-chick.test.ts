import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { COLS, createCircleChick, exitDistances, neighbours, ROWS, tileCentre } from './logic';

describeMinigame('circle-chick');

describe('circle the chick rules', () => {
  const setup = () => createCircleChick({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });

  it('measures the way out of the field', () => {
    const open = Array.from({ length: COLS * ROWS }, () => false);
    const dist = exitDistances(open);
    expect(dist[0]).toBe(1);
    expect(dist[3 * COLS + 3]).toBe(4);
    expect(neighbours(0).filter((n) => n < 0).length).toBeGreaterThan(0);
  });

  it('catches a chick with no way out after the fence goes up', () => {
    const game = setup();
    const chick = game.state.chick;
    game.state.fences = game.state.fences.map(() => false);
    const ring = neighbours(chick).filter((n) => n >= 0);
    const last = ring.pop();
    if (last === undefined) throw new Error('no ring');
    for (const n of ring) game.state.fences[n] = true;
    game.step(1 / 60, { ...NO_INPUT, taps: [tileCentre(game.state, last)] });
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('caught');
  });

  it('keeps the tiles big enough to tap', () => {
    for (const arena of [{ width: 863, height: 600 }, { width: 600, height: 863 }, { width: 600, height: 1298 }]) {
      const game = createCircleChick({ arena, goal: 4, duration: 90, params: {}, rng: createRng(1) });
      expect(game.state.r).toBeGreaterThanOrEqual(36);
    }
  });
});
