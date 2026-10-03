import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBalloonGuard, LIFT } from './logic';

describeMinigame('balloon-guard');

describe('balloon guard rules', () => {
  const setup = () => createBalloonGuard({ arena: { width: 863, height: 600 }, goal: 100, duration: 60, params: {}, rng: createRng(1) });

  it('knocks away what the umbrella touches, and loses a heart and slows for what reaches the balloon', () => {
    const game = setup();
    const s = game.state;
    s.fallers = [{ kind: 1, x: s.umbrella.x, y: s.umbrella.y - 60, vx: 0, vy: 300, knocked: false }];
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: s.umbrella.x, y: s.umbrella.y + LIFT } });
    expect(s.fallers[0]?.knocked).toBe(true);
    s.fallers = [{ kind: 2, x: s.balloon.x, y: s.balloon.y - 50, vx: 0, vy: 300, knocked: false }];
    s.umbrella = { x: 50, y: 150 };
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
    expect(s.slowUntil).toBeGreaterThan(s.time);
  });

  it('climbs a metre a point', () => {
    const game = setup();
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(3);
  });
});
