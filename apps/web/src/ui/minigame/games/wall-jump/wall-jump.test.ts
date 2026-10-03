import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWallJump, KNOCK } from './logic';

/** Leaps all the time, without looking. */
describeMinigame('wall-jump', { loser: (context) => ({ tap: { x: context.arena.width / 2, y: context.arena.height / 2 } }) });

describe('wall jump rules', () => {
  const setup = () => createWallJump({ arena: { width: 863, height: 600 }, goal: 60, duration: 60, params: {}, rng: createRng(6) });

  it('knocks her down when she climbs into a spike, not while she leaps past it', () => {
    const game = setup();
    game.state.spikes = [{ side: game.state.side, at: 10.5 }];
    game.state.stars = [];
    game.state.height = 10;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.height).toBeCloseTo(10.5 - KNOCK);
    const leaping = setup();
    leaping.state.spikes = [{ side: leaping.state.side === 1 ? -1 : 1, at: 30 }, { side: leaping.state.side, at: 10.5 }];
    leaping.state.stars = [];
    leaping.state.height = 10;
    leaping.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 300 }] });
    expect(leaping.state.height).toBeGreaterThan(10);
  });
});
