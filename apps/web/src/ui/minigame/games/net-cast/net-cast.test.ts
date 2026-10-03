import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createNetCast, FLY_SECONDS, THROW_GAIN } from './logic';

describeMinigame('net-cast');

describe('net cast rules', () => {
  const setup = () => createNetCast({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: {}, rng: createRng(8) });

  it('throws as far as the swipe times the gain and catches the fish under the net', () => {
    const game = setup();
    for (const f of game.state.fish) {
      f.vx = 0;
      f.vy = 0;
    }
    const fish = game.state.fish[0];
    if (!fish) throw new Error('no fish');
    const { boat } = game.state;
    const swipe: Swipe = { direction: 'up', from: boat, dx: (fish.x - boat.x) / THROW_GAIN, dy: (fish.y - boat.y + 60) / THROW_GAIN, speed: 900 };
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    expect(game.state.target.x).toBeCloseTo(fish.x);
    for (let i = 0; i < FLY_SECONDS * 60 + 2; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBeGreaterThanOrEqual(1);
  });
});
