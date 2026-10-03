import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDotCopy, DOTS, straightSegments } from './logic';

describeMinigame('dot-copy');

describe('dot copy rules', () => {
  const setup = () => createDotCopy({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });

  it('splits a straight line into unit lines and refuses a crooked one', () => {
    expect(straightSegments(0, 3)).toEqual(['0-1', '1-2', '2-3']);
    expect(straightSegments(0, 15)).toEqual(['0-5', '5-10', '10-15']);
    expect(straightSegments(0, 6)).toBeNull();
  });

  it('keeps picture lines, fades others, and finishes the picture when every line is drawn', () => {
    const game = setup();
    const s = game.state;
    const at = (i: number) => ({ x: s.gridX + (i % DOTS) * s.spacing, y: s.gridY + Math.floor(i / DOTS) * s.spacing });
    const lines = s.picture.map((k) => k.split('-').map(Number) as [number, number]);
    const wrong = [0, 1, 4, 5].flatMap((a) => [a + 1, a + DOTS].map((b) => `${Math.min(a, b)}-${Math.max(a, b)}`)).find((k) => !s.picture.includes(k)) ?? '';
    const [wa, wb] = wrong.split('-').map(Number);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(wa ?? 0)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [at(wb ?? 0)] });
    expect(s.drawn).toEqual([]);
    expect(s.wrong.map((w) => w.key)).toEqual([wrong]);
    for (const [a, b] of lines) {
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: at(a) });
      game.step(1 / 60, { ...NO_INPUT, pointer: at(b) });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    }
    expect(game.score).toBe(1);
  });
});
