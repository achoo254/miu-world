import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BEAT, createWaterPuppet, guideAt } from './logic';

describeMinigame('water-puppet');

describe('water puppet rules', () => {
  const setup = () => createWaterPuppet({ arena: { width: 863, height: 600 }, goal: 62, duration: 48, params: {}, rng: createRng(4) });

  it('keeps the dance inside the pond', () => {
    const s = setup().state;
    for (let t = 0; t < 80; t += 0.1) {
      const p = guideAt(s, t);
      expect(p.x).toBeGreaterThanOrEqual(s.pond.left - 1);
      expect(p.x).toBeLessThanOrEqual(s.pond.right + 1);
      expect(p.y).toBeGreaterThanOrEqual(s.pond.top - 1);
      expect(p.y).toBeLessThanOrEqual(s.pond.bottom + 1);
    }
  });

  it('gives two points on the shadow, one close, none away, on each beat', () => {
    const game = setup();
    const s = game.state;
    const beat = (offset: number) => {
      const before = game.score;
      const until = s.nextBeat;
      while (s.time < until) {
        s.puppet = { x: s.guide.x + offset, y: s.guide.y };
        game.step(1 / 60, NO_INPUT);
      }
      return game.score - before;
    };
    expect(beat(0)).toBe(2);
    expect(beat(50)).toBe(1);
    expect(beat(150)).toBe(0);
    expect(BEAT).toBe(0.5);
  });
});
