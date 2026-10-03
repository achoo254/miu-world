import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createAirHockey, toScreen, toTable } from './logic';

describeMinigame('air-hockey');

describe('air hockey rules', () => {
  const setup = (width = 863, height = 600) => createAirHockey({ arena: { width, height }, goal: 5, duration: 90, params: {}, rng: createRng(1) });

  it('maps table points to the screen and back on wide and tall screens', () => {
    for (const [w, h] of [
      [863, 600],
      [600, 1298],
    ] as const) {
      const s = setup(w, h).state;
      const p = toScreen(s, 100, 300);
      expect(toTable(s, p).u).toBeCloseTo(100);
      expect(toTable(s, p).v).toBeCloseTo(300);
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(w);
    }
  });

  it('keeps the child paddle in her half and scores a puck through the far goal mouth', () => {
    const game = setup();
    const s = game.state;
    game.step(1 / 60, { ...NO_INPUT, pointer: toScreen(s, s.width / 2, 0) });
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: toScreen(s, s.width / 2, 0) });
    expect(s.mine.v).toBeGreaterThanOrEqual(s.length / 2);
    s.puck = { u: s.width / 2 + s.goalHalf * 0.8, v: 60, vu: 0, vv: -900 };
    s.ai.u = s.width / 2 - s.goalHalf;
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(s.pause).toBeGreaterThan(0);
  });

  it('slows the penguin each time it scores', () => {
    const game = setup();
    const s = game.state;
    const before = s.aiSpeed;
    s.puck = { u: s.width / 2, v: s.length - 40, vu: 0, vv: 900 };
    s.mine.u = 40;
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.aiGoals).toBe(1);
    expect(s.aiSpeed).toBeLessThan(before);
    expect(game.score).toBe(0);
  });
});
