import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMirrorTwins, solveTwins, stepOne, type Garden } from './logic';

describeMinigame('mirror-twins');

describe('mirror twins rules', () => {
  const open: Garden = { rocks: new Set(), star: 0 };

  it('moves the twin the other way left and right, the same way up and down, and stops at rocks', () => {
    expect(stepOne(open, 12, 'left', false)).toBe(11);
    expect(stepOne(open, 12, 'left', true)).toBe(13);
    expect(stepOne(open, 12, 'up', true)).toBe(7);
    expect(stepOne({ rocks: new Set([11]), star: 0 }, 12, 'left', false)).toBe(12);
  });

  it('finds the way to both stars', () => {
    const gardens: [Garden, Garden] = [
      { rocks: new Set(), star: 4 },
      { rocks: new Set(), star: 0 },
    ];
    expect(solveTwins(gardens, [0, 4])).toEqual(['right', 'right', 'right', 'right']);
  });

  it('takes a step back with Lùi', () => {
    const game = createMirrorTwins({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(2) });
    const start = [...game.state.at];
    const dir = game.state.plan[0] ?? 'up';
    const swipe: GameInput = { ...NO_INPUT, swipes: [{ direction: dir, from: { x: 400, y: 400 }, dx: 0, dy: 0, speed: 900 }] };
    game.step(1 / 60, swipe);
    expect(game.state.at).not.toEqual(start);
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.undo] });
    expect(game.state.at).toEqual(start);
  });
});
