import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPipeConnect, E, fits, flow, N, reachesField, S, turn, W } from './logic';

describeMinigame('pipe-connect');

describe('pipe connect rules', () => {
  it('turns a tile a quarter clockwise', () => {
    expect(turn(N)).toBe(E);
    expect(turn(W)).toBe(N);
    expect(turn(N | S)).toBe(E | W);
  });

  it('starts every board unsolved but solvable, and scores once the way fits', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = createPipeConnect({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(seed) });
      const { state } = game;
      expect(reachesField(state)).toBe(false);
      expect(state.tiles.filter((t) => t.need !== 0).length).toBeGreaterThanOrEqual(state.size);
      for (const tile of state.tiles) if (tile.need) tile.open = tile.need;
      state.wet = flow(state);
      expect(reachesField(state)).toBe(true);
      expect(state.tiles.every(fits)).toBe(true);
    }
  });

  it('counts a board when a tap completes the way', () => {
    const game = createPipeConnect({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(3) });
    const { state } = game;
    const wrong = state.tiles.findIndex((t) => !fits(t));
    state.tiles.forEach((t, i) => {
      if (t.need && i !== wrong) t.open = t.need;
    });
    const tile = state.tiles[wrong];
    if (!tile) throw new Error('solved already');
    while (turn(tile.open) !== tile.need) tile.open = turn(tile.open);
    const at = { x: state.left + ((wrong % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(wrong / state.size) + 0.5) * state.cell };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [at] });
    expect(game.score).toBe(1);
  });
});
