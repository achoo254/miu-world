import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMarbles, MARBLE_R, SHOTS, shotOf } from './logic';

describeMinigame('marbles');

describe('marbles rules', () => {
  const setup = () => createMarbles({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(2) });

  it('shoots the opposite way of the pull, harder for a longer pull', () => {
    const short = shotOf(0, 60);
    const long = shotOf(0, 200);
    expect(short?.vy).toBeLessThan(0);
    expect(Math.abs(long?.vy ?? 0)).toBeGreaterThan(Math.abs(short?.vy ?? 0));
    expect(shotOf(5, 5)).toBeNull();
  });

  it('knocks a marble hit straight on out of the ring, and uses a shot', () => {
    const game = setup();
    const { state } = game;
    const target = { x: state.centre.x, y: state.centre.y + state.ring - MARBLE_R - 4 };
    state.marbles = [{ ...target, vx: 0, vy: 0, r: MARBLE_R, colour: 0, out: false, outAgo: 0 }];
    state.shooter.x = state.centre.x;
    state.shooter.y = state.centre.y - 40;
    game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'up', from: { x: 400, y: 300 }, dx: 0, dy: -250, speed: 2000 }] });
    expect(state.shotsLeft).toBe(SHOTS - 1);
    for (let i = 0; i < 300 && state.rolling; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('ends once the last shot has rolled to a stop', () => {
    const game = setup();
    game.state.shotsLeft = 0;
    expect(game.done).toBe(true);
  });
});
