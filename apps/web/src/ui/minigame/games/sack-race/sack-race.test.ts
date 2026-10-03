import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSackRace, HOP_SECONDS } from './logic';

// Tapping all the time trips over on every hop.
describeMinigame('sack-race', { loser: ({ arena }) => ({ tap: { x: arena.width / 2, y: arena.height / 2 } }) });

describe('sack race rules', () => {
  const setup = () => createSackRace({ arena: { width: 863, height: 600 }, goal: 3, duration: 45, params: { length: 100 }, rng: createRng(1) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 300 }] };

  it('trips over for a tap high in the air', () => {
    const game = setup();
    game.step(1 / 60, tap);
    for (let i = 0; i < 6; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    expect(game.state.child.down).toBeGreaterThan(0);
    expect(game.state.combo).toBe(0);
  });

  it('builds a rhythm with taps on landing, and goes further per hop', () => {
    const game = setup();
    game.step(1 / 60, tap);
    const first = game.state.child.hopTo;
    for (let hop = 0; hop < 3; hop += 1) {
      while (HOP_SECONDS - game.state.child.hop > 0.08) game.step(1 / 60, NO_INPUT);
      game.step(1 / 60, tap);
      for (let i = 0; i < 8; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.state.combo).toBe(3);
    const c = game.state.child;
    expect(c.hopTo - c.hopFrom).toBeGreaterThan(first);
  });
});
