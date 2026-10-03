import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBarrelClimb } from './logic';

describeMinigame('barrel-climb');

describe('barrel climb rules', () => {
  const setup = () => createBarrelClimb({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(1) });
  const up = { direction: 'up' as const, from: { x: 400, y: 400 }, dx: 0, dy: -120, speed: 900 };

  it('waits at the ladder and climbs it on a flick up', () => {
    const game = setup();
    game.state.sacks = [];
    for (let i = 0; i < 60 * 8; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.child.floor).toBe(0);
    game.state.sacks = [];
    game.step(1 / 60, { ...NO_INPUT, swipes: [up] });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.child.floor).toBe(1);
    expect(game.score).toBe(1);
  });

  it('sits the child down when a sack hits her, and a jump clears it', () => {
    const game = setup();
    const c = game.state.child;
    game.state.sacks = [{ id: 99, floor: 0, x: c.x + 60, dir: -1, dropping: 0, passed: false }];
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(c.stunned).toBeGreaterThan(0);
    const other = setup();
    const k = other.state.child;
    other.state.sacks = [{ id: 98, floor: 0, x: k.x + 80, dir: -1, dropping: 0, passed: false }];
    other.step(1 / 60, { ...NO_INPUT, taps: [{ x: 0, y: 0 }] });
    for (let i = 0; i < 6; i += 1) other.step(1 / 60, NO_INPUT);
    for (let i = 0; i < 30; i += 1) other.step(1 / 60, NO_INPUT);
    expect(k.stunned).toBe(0);
  });
});
