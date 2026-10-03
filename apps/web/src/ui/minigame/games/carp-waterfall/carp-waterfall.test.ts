import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCarpWaterfall, LEAP_SECONDS } from './logic';

/** Leaps ten times a second, never looking at the water. */
const leaper = ({ arena }: BotContext): BotMove => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('carp-waterfall');
describeMinigame('carp-waterfall', { loser: leaper });

describe('carp waterfall rules', () => {
  const setup = () => createCarpWaterfall({ arena: { width: 600, height: 863 }, goal: 12, duration: 60, params: { speed: 1 }, rng: createRng(2) });
  const tap = { ...NO_INPUT, taps: [{ x: 1, y: 1 }] };

  it('climbs a rock on a calm leap', () => {
    const game = setup();
    game.step(1 / 60, tap);
    for (let i = 0; i < Math.ceil(LEAP_SECONDS * 60) + 1; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.ledge).toBe(1);
    expect(game.score).toBe(1);
  });

  it('washes the carp down a rock when it leaps into a surge, and keeps the best height', () => {
    const game = setup();
    game.state.ledge = 4;
    game.state.best = 4;
    game.state.flow = 'strong';
    game.state.flowTime = 0;
    game.state.flowLength = 2;
    game.step(1 / 60, tap);
    expect(game.state.ledge).toBe(3);
    expect(game.state.best).toBe(4);
    expect(game.state.dizzy).toBeGreaterThan(0);
  });
});
