import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSnowballFight, DUCK_HOLD, MY_FLIGHT } from './logic';

describeMinigame('snowball-fight');

describe('snowball fight rules', () => {
  const setup = () => createSnowballFight({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { speed: 1 }, rng: createRng(8) });

  it('hits a friend that is still up when her snowball arrives', () => {
    const game = setup();
    const f = game.state.friends[0];
    if (!f) throw new Error('no friend');
    f.up = 0;
    f.stay = 5;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: f.x, y: f.y - 30 }] });
    for (let i = 0; i < Math.ceil(MY_FLIGHT * 60) + 1; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(f.hit).toBeGreaterThanOrEqual(0);
  });

  it('a snowball costs a heart when she is up and splats on the fort when she ducks', () => {
    const game = setup();
    game.state.balls.push({ fromX: 100, fromY: 200, toX: 430, toY: 380, t: 0.99, flight: 1, target: -1, splat: -1 });
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(4);
    game.state.balls.push({ fromX: 100, fromY: 200, toX: 430, toY: 380, t: 0.99, flight: 1, target: -1, splat: -1 });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: 500 }, holdTime: DUCK_HOLD + 0.1 });
    expect(game.state.ducking).toBe(true);
    expect(game.lives).toBe(4);
  });

  it('a quick tap never ducks, and no throwing while ducking', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: 500 }, holdTime: 0.05 });
    expect(game.state.ducking).toBe(false);
    const f = game.state.friends[1];
    if (!f) throw new Error('no friend');
    f.up = 0;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: 500 }, holdTime: 0.5, taps: [{ x: f.x, y: f.y - 30 }] });
    expect(game.state.balls.filter((b) => b.target >= 0)).toHaveLength(0);
  });
});
