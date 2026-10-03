import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createJumpRope, JUMP_SECONDS, untilPass } from './logic';

/** Taps ten times a second: jumps again the moment she lands. */
const hopper = ({ arena }: { arena: { width: number; height: number } }) => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('jump-rope');
describeMinigame('jump-rope', { loser: hopper });

describe('jump rope rules', () => {
  const setup = () => createJumpRope({ arena: { width: 863, height: 600 }, goal: 25, duration: 60, params: { speed: 1 }, rng: createRng(1) });

  it('scores a jump timed over the rope and speeds the rope up', () => {
    const game = setup();
    const period = game.state.period;
    while (untilPass(game.state) > JUMP_SECONDS / 2) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.period).toBeLessThan(period);
  });

  it('stops the rope and resets the run when she is caught', () => {
    const game = setup();
    while (game.state.last === null) game.step(1 / 60, NO_INPUT);
    expect(game.state.last).toBe('caught');
    expect(game.state.stopped).toBeGreaterThan(0);
    expect(game.state.streak).toBe(0);
  });
});
