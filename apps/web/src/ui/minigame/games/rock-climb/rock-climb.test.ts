import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRockClimb, CRUMBLE_SECONDS, reachable, screenY } from './logic';

describeMinigame('rock-climb');

describe('rock climb rules', () => {
  const setup = () => createRockClimb({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: {}, rng: createRng(3) });

  it('always has a hold within reach above the start', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const game = createRockClimb({ arena: { width: 600, height: 1298 }, goal: 30, duration: 60, params: {}, rng: createRng(seed) });
      const start = game.state.holds[0];
      if (!start) throw new Error('no holds');
      expect(game.state.holds.some((h) => h.row === 1 && reachable(start, h))).toBe(true);
    }
  });

  it('climbs to a tapped hold in reach and scores its row; a cracked hold drops her back', () => {
    const game = setup();
    const { state } = game;
    const start = state.holds.find((h) => h.id === state.on);
    const next = state.holds.find((h) => h.row === 1 && start && reachable(start, h));
    if (!start || !next) throw new Error('no way up');
    next.cracked = true;
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: next.x, y: screenY(state, next) }] });
    expect(state.on).toBe(next.id);
    expect(game.score).toBe(1);
    for (let i = 0; i < (CRUMBLE_SECONDS + 0.2) * 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(state.on).not.toBe(next.id);
    expect(game.score).toBe(1);
  });
});
