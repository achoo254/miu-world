import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cellCentre, createHundredChart, pickHoles } from './logic';

describeMinigame('hundred-chart');

describe('hundred chart rules', () => {
  const setup = () => createHundredChart({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { holes: 4 }, rng: createRng(4) });
  const step = (game: ReturnType<typeof setup>, input: Partial<GameInput>) => game.step(1 / 60, { ...NO_INPUT, ...input });

  it('makes gaps inside the board: scattered ones apart, a cross of five', () => {
    const rng = createRng(1);
    for (let i = 0; i < 100; i += 1) {
      const holes = pickHoles(rng, 4, false);
      expect(new Set(holes).size).toBe(4);
      for (const a of holes) for (const b of holes) if (a !== b) expect([1, 10]).not.toContain(Math.abs(a - b));
      const cross = pickHoles(rng, 4, true);
      expect(cross.every((n) => n >= 1 && n <= 100)).toBe(true);
      const [c] = cross;
      expect(cross.sort((x, y) => x - y)).toEqual([(c ?? 0) - 10, (c ?? 0) - 1, c, (c ?? 0) + 1, (c ?? 0) + 10]);
    }
  });

  it('keeps a piece dragged onto its gap and bounces one dropped on another gap', () => {
    const game = setup();
    const [a, b] = game.state.pieces;
    if (!a || !b) throw new Error('no pieces');
    const drag = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      step(game, { pointer: from, pressed: true });
      step(game, { pointer: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 } });
      step(game, { pointer: to });
      step(game, { released: true });
    };
    drag(a.home, cellCentre(game.state, b.value));
    expect(a.placed).toBe(false);
    expect(game.score).toBe(0);
    drag(a.home, cellCentre(game.state, a.value));
    expect(a.placed).toBe(true);
    expect(game.score).toBe(1);
  });

  it('places a piece by tapping it and then its gap', () => {
    const game = setup();
    const [a] = game.state.pieces;
    if (!a) throw new Error('no pieces');
    step(game, { taps: [a.home], pressed: true, released: true });
    step(game, { taps: [cellCentre(game.state, a.value)], pressed: true, released: true });
    expect(a.placed).toBe(true);
  });
});
