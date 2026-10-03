import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { blend } from './draw';
import { createColorMix, mixOf, RECIPES } from './logic';

// Tapping pots at random, as fast as possible, must not win: each mix takes its time to swirl.
let n = 0;
describeMinigame('color-mix', {
  loser: ({ arena }) => {
    n += 1;
    return { tap: { x: (arena.width / 4) * ((n * 7) % 4) + arena.width / 8, y: arena.height - 110 } };
  },
});

describe('color mix rules', () => {
  const setup = () => createColorMix({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { white: true }, rng: createRng(3) });

  it('knows every recipe both ways round', () => {
    for (const [mix, [a, b]] of Object.entries(RECIPES)) {
      expect(mixOf(a, b)).toBe(mix);
      expect(mixOf(b, a)).toBe(mix);
    }
    expect(mixOf('red', 'red')).toBeNull();
  });

  it('scores the right two pots after the swirl and tips out a wrong mix', () => {
    const game = setup();
    const tapPaint = (paint: string) => {
      const pot = game.state.pots.find((p) => p.paint === paint);
      if (pot) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: pot.x, y: pot.y }] });
    };
    const [a, b] = RECIPES[game.state.want];
    const wrong = game.state.pots.map((p) => p.paint).find((p) => p !== a && p !== b) ?? 'white';
    tapPaint(a);
    tapPaint(wrong);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    expect(game.state.phase).toBe('pick');
    tapPaint(b);
    tapPaint(a);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('blends two hex colours half and half', () => {
    expect(blend('#ff0000', '#0000ff')).toBe('rgb(128, 0, 128)');
    expect(blend('red', '#0000ff')).toBe('red');
  });
});
