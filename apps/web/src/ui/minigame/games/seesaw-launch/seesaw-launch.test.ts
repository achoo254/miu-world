import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CATCH, createSeesawLaunch } from './logic';

/** Drops every bag from the top of the pole. */
describeMinigame('seesaw-launch', { loser: () => ({ tap: { x: 150, y: 175 } }) });

describe('seesaw launch rules', () => {
  const setup = () => createSeesawLaunch({ arena: { width: 863, height: 600 }, goal: 6, duration: 75, params: {}, rng: createRng(4) });
  const play = (game: ReturnType<typeof setup>, drop: number) => {
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 100, y: game.state.pivot.y - drop }] });
    for (let i = 0; i < 300 && game.state.phase !== 'result'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('throws farther from a higher drop and scores in the basket', () => {
    const game = setup();
    const right = (game.state.basketX - game.state.pivot.x - game.state.half) / game.state.gain;
    play(game, right);
    expect(Math.abs(game.state.ball.x - game.state.basketX)).toBeLessThan(CATCH);
    expect(game.score).toBe(1);
    const low = setup();
    play(low, right * 0.6);
    expect(low.score).toBe(0);
    expect(low.state.ball.x).toBeLessThan(low.state.basketX);
  });
});
