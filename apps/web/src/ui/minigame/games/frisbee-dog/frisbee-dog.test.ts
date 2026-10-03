import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFrisbeeDog, curveOf, DISCS, dogAfter, THROW_GAIN } from './logic';

describeMinigame('frisbee-dog');

describe('frisbee dog rules', () => {
  const setup = () => createFrisbeeDog({ arena: { width: 863, height: 600 }, goal: 8, duration: 70, params: {}, rng: createRng(3) });
  const flick = (dx: number, dy: number) => ({ ...NO_INPUT, swipes: [{ direction: 'up' as const, from: { x: 431, y: 550 }, dx, dy, speed: 1000 }] });

  it('predicts the puppy turning at the edges', () => {
    const s = { dog: { x: 100, y: 300 }, dogDir: -1, dogSpeed: 100, bounds: { left: 60, right: 800 } };
    expect(dogAfter(s, 0.2).x).toBeCloseTo(80);
    expect(dogAfter(s, 0.6).x).toBeCloseTo(80);
  });

  it('measures a curved swipe', () => {
    expect(curveOf([{ x: 0, y: 0 }, { x: 0, y: -100 }])).toBe(0);
    expect(Math.abs(curveOf([{ x: 0, y: 0 }, { x: 30, y: -50 }, { x: 0, y: -100 }]))).toBeCloseTo(0.3);
  });

  it('scores a disc landing on the puppy, not one landing far away, and stops after twelve', () => {
    const game = setup();
    const s = game.state;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    // Freeze the puppy under where the disc will land.
    s.dogSpeed = 0;
    const len = 200;
    game.step(1 / 60, flick(0, -len / THROW_GAIN));
    const disc = s.disc;
    if (!disc) throw new Error('no throw');
    s.dog = { ...disc.to };
    while (s.disc?.result === 'flying') game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(2);
    while (s.thrown < DISCS) {
      for (let i = 0; i < 50 && s.disc; i += 1) game.step(1 / 60, NO_INPUT);
      s.dog = { x: 60, y: s.dog.y };
      s.dogSpeed = 0;
      game.step(1 / 60, flick(120, -60));
    }
    for (let i = 0; i < 200 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.score).toBe(2);
  });
});
