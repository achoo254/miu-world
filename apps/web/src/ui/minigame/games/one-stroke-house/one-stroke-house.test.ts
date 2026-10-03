import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createOneStrokeHouse, eulerPath, FIGURES, oddDots } from './logic';
import { REWARDS } from './draw';

describeMinigame('one-stroke-house');

describe('one stroke rules', () => {
  const setup = () => createOneStrokeHouse({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(1) });

  it('only has pictures that can be drawn in one stroke, each with its reward', () => {
    expect(REWARDS).toHaveLength(FIGURES.length);
    for (const figure of FIGURES) {
      expect(oddDots(figure).length === 0 || oddDots(figure).length === 2).toBe(true);
      const path = eulerPath(figure, figure.lines.map(() => false), oddDots(figure)[0] ?? 0);
      expect(path).toHaveLength(figure.lines.length + 1);
    }
  });

  it('finishes a picture drawn dot to dot, and fades it when the finger lifts early', () => {
    const game = setup();
    const s = game.state;
    const figure = FIGURES[s.figure];
    if (!figure) throw new Error('no figure');
    const path = eulerPath(figure, s.used, oddDots(figure)[0] ?? 0);
    const dot = (i: number | undefined): Point => s.dots[i ?? 0] ?? { x: 0, y: 0 };
    // Two lines, then lift: fades.
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: dot(path[0]) });
    game.step(1 / 60, { ...NO_INPUT, pointer: dot(path[1]) });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(s.phase).toBe('fade');
    expect(s.hint).toBe(true);
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.used.every((u) => !u)).toBe(true);
    // The whole stroke.
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: dot(path[0]) });
    for (const i of path.slice(1)) game.step(1 / 60, { ...NO_INPUT, pointer: dot(i) });
    expect(game.score).toBe(1);
    expect(s.phase).toBe('done');
  });
});
