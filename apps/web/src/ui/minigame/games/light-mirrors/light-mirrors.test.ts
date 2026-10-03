import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLightMirrors, reflect, traceBeam } from './logic';

describeMinigame('light-mirrors');

describe('light mirrors rules', () => {
  it('turns a beam a quarter turn at each mirror', () => {
    expect(reflect('/', 1, 0)).toEqual([0, -1]);
    expect(reflect('\\', 1, 0)).toEqual([0, 1]);
    expect(reflect('/', 0, 1)).toEqual([-1, 0]);
    const { exit } = traceBeam({ cols: 3, rows: 3, sunRow: 1, mirrors: [{ x: 1, y: 1, tilt: '/', answer: '/', flipped: 0 }] });
    expect(exit).toEqual({ x: 1, y: -1 });
  });

  it('deals boards that start unsolved and are solved by setting every path mirror right', () => {
    for (const seed of [1, 2, 3, 4]) {
      const game = createLightMirrors({ arena: { width: 600, height: 863 }, goal: 3, duration: 90, params: {}, rng: createRng(seed) });
      expect(game.state.lit).toBe(false);
      const fix = game.state.mirrors.filter((m) => m.answer && m.tilt !== m.answer);
      for (const m of fix) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.originX + (m.x + 0.5) * game.state.cell, y: game.state.originY + (m.y + 0.5) * game.state.cell }] });
      expect(game.score).toBe(1);
    }
  });

  it('a tap on an empty tile does nothing', () => {
    const game = createLightMirrors({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(5) });
    const before = game.state.mirrors.map((m) => m.tilt).join('');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 5, y: 590 }] });
    expect(game.state.mirrors.map((m) => m.tilt).join('')).toBe(before);
  });
});
