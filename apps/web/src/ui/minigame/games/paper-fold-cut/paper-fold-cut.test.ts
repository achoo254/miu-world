import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { area, createPaperFoldCut, cutWith, makeCuts, pieceFor } from './logic';

describeMinigame('paper-fold-cut');

describe('paper fold and cut rules', () => {
  it('keeps the bigger piece of a cut', () => {
    const piece = pieceFor(2);
    const kept = cutWith(piece, { x: 0.5, y: 0 }, { x: 0, y: 0.5 });
    expect(area(kept)).toBeCloseTo(1 - 0.125);
  });

  it('offers three different fair cuts for every fold', () => {
    for (const fold of [1, 2, 4, 6] as const) {
      for (let seed = 1; seed < 10; seed += 1) {
        const cuts = makeCuts(createRng(seed), pieceFor(fold));
        expect(cuts).toHaveLength(3);
      }
    }
  });

  it('scores a swipe along the right cut and not along another', () => {
    const game = createPaperFoldCut({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(2) });
    const s = game.state;
    const xs = s.piece.map((q) => q.x);
    const ys = s.piece.map((q) => q.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const at = (p: { x: number; y: number }) => ({ x: s.paper.x + (p.x - cx) * s.paperK, y: s.paper.y + (p.y - cy) * s.paperK });
    const swipeAlong = (i: number) => {
      const c = s.cuts[i];
      if (!c) throw new Error('no cut');
      const a = at(c.a);
      const b = at(c.b);
      game.step(1 / 60, { ...NO_INPUT, swipes: [{ direction: 'right', from: a, dx: b.x - a.x, dy: b.y - a.y, speed: 900 }] });
    };
    swipeAlong((s.answer + 1) % 3);
    expect(game.score).toBe(0);
    expect(s.tried?.right).toBe(false);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    swipeAlong(s.answer);
    expect(game.score).toBe(1);
  });
});
