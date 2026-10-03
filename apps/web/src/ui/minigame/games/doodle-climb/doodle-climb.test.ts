import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDoodleClimb, UNITS_PER_METRE } from './logic';

describeMinigame('doodle-climb');

describe('doodle climb rules', () => {
  const setup = () => createDoodleClimb({ arena: { width: 600, height: 863 }, goal: 80, duration: 60, params: { gap: 1 }, rng: createRng(2) });

  it('keeps bouncing on its start pad when nobody steers', () => {
    const game = setup();
    for (let i = 0; i < 60 * 10; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    expect(game.state.frogY).toBeLessThanOrEqual(game.state.baseY);
  });

  it('scores the height of a higher pad it lands on, in metres', () => {
    const game = setup();
    game.step(1 / 60, NO_INPUT);
    game.drainEvents();
    const pad = game.state.pads[1];
    if (!pad) throw new Error('no pad');
    // Put the frog just above the pad, falling.
    game.state.frogX = pad.x;
    game.state.frogY = pad.y - 5;
    game.state.vy = 400;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(Math.floor((game.state.baseY - pad.y) / UNITS_PER_METRE));
    expect(game.drainEvents().some((e) => e.type === 'score')).toBe(true);
  });

  it('sets a fallen frog back on a pad in view without losing its height', () => {
    const game = setup();
    game.state.bestY = -500;
    game.state.frogY = game.state.cameraY + 2000;
    game.state.vy = 300;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.respawned).toBe(0);
    expect(game.score).toBe(Math.floor(500 / UNITS_PER_METRE));
    expect(game.state.frogY - game.state.cameraY).toBeLessThan(863);
  });
});
