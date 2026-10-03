import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRisingWater } from './logic';

describeMinigame('rising-water');

describe('rising water rules', () => {
  it('raises the held hill, beats a wave below its top and soaks a house above it', () => {
    const game = createRisingWater({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(1) });
    const s = game.state;
    s.waves = [
      { hill: 0, level: 100, peakIn: 0.5, judged: false },
      { hill: 7, level: 100, peakIn: 0.5, judged: false },
    ];
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: s.colW / 2, y: 400 } });
    expect(s.hills[0]?.height).toBeGreaterThan(100);
    expect(s.hills[0]?.wet).toBe(false);
    expect(s.hills[7]?.wet).toBe(true);
    expect(game.score).toBe(1);
  });
});
