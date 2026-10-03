import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBirdFlock, flockSize, followerPoint } from './logic';

describeMinigame('bird-flock');

describe('bird flock rules', () => {
  const setup = () => createBirdFlock({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { speed: 1 }, rng: createRng(4) });

  it('makes followers fly where the leader was a moment ago', () => {
    const game = setup();
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 300, y: 200 } });
    const y = game.state.leadY;
    for (let i = 0; i < 6; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 300, y: 500 } });
    expect(Math.abs(followerPoint(game.state, 5).y - y)).toBeLessThan(80);
    expect(game.state.leadY).toBeGreaterThan(y);
  });

  it('loses a bird that touches a storm and scores a ring only with five birds', () => {
    const game = setup();
    const p = followerPoint(game.state, 0);
    game.state.storms.push({ x: p.x, y: p.y });
    game.step(1 / 60, NO_INPUT);
    expect(game.state.lost[0]).toBeGreaterThan(0);
    expect(flockSize(game.state)).toBeLessThan(7);
    game.state.lost = [3, 3, 3, 0, 0, 0];
    game.state.rings = [{ x: game.state.leadX + 1, y: game.state.leadY, passed: null }];
    game.state.storms = [];
    game.step(1 / 60, NO_INPUT);
    expect(game.state.rings[0]?.passed).toBe(false);
  });
});
