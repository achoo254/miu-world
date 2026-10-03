import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFireflySync } from './logic';

// Tapping all the time is always off the beat somewhere: it startles the swarm and wins nobody.
describeMinigame('firefly-sync', { loser: ({ arena }) => ({ tap: { x: arena.width / 2, y: arena.height - 120 } }) });

describe('firefly sync rules', () => {
  const setup = () => createFireflySync({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { window: 0.16 }, rng: createRng(1) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 500 }] };

  it('wins a firefly for a flash with the swarm, once per flash', () => {
    const game = setup();
    while (game.state.nextFlash - game.state.time > 0.05) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.score).toBe(1);
    game.step(1 / 60, tap);
    expect(game.score).toBe(1);
  });

  it('startles the swarm with a flash off the beat: its next flash brings nobody, the one after does', () => {
    const game = setup();
    while (game.state.flashes < 1) game.step(1 / 60, NO_INPUT);
    for (let i = 0; i < 25; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.state.calmAt).toBeGreaterThan(game.state.time);
    while (game.state.nextFlash - game.state.time > 0.05) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.score).toBe(0);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    while (game.state.nextFlash - game.state.time > 0.05) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.score).toBe(1);
  });
});
