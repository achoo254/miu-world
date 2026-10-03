import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { arenaFor, REFERENCE_SCREENS } from '../../round';
import { HUD_SAFE_TOP, NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTangram, figurePlaces, FIGURES, KINDS, pointInPolygon, turnsApart } from './logic';

describeMinigame('tangram');

type Vec = readonly [number, number];
const area = (pts: readonly Vec[]): number => Math.abs(pts.reduce((sum, [x, y], i) => sum + x * (pts[(i + 1) % pts.length]?.[1] ?? 0) - (pts[(i + 1) % pts.length]?.[0] ?? 0) * y, 0)) / 2;
/** Shortest distance from a point to a polygon's edges. */
const toEdges = ([x, y]: Vec, pts: readonly Vec[]): number =>
  Math.min(
    ...pts.map(([ax, ay], i) => {
      const [bx, by] = pts[(i + 1) % pts.length] ?? [ax, ay];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
      return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay));
    }),
  );

describe('tangram figures', () => {
  for (const figure of FIGURES) {
    it(`${figure.name} uses the seven pieces once, without overlap, all touching`, () => {
      const places = figurePlaces(figure);
      expect(places.map((p) => p.kind).sort()).toEqual([...KINDS].sort());
      expect(places.reduce((sum, p) => sum + area(p.points), 0)).toBeCloseTo(16, 6);
      // No sample point lies inside two pieces.
      const xs = places.flatMap((p) => p.points.map((q) => q[0]));
      const ys = places.flatMap((p) => p.points.map((q) => q[1]));
      for (let x = Math.min(...xs) + 0.013; x < Math.max(...xs); x += 0.05) {
        for (let y = Math.min(...ys) + 0.017; y < Math.max(...ys); y += 0.05) {
          expect(places.filter((p) => pointInPolygon(x, y, p.points)).length).toBeLessThanOrEqual(1);
        }
      }
      // Every piece touches the rest (a corner on another's edge): one connected picture.
      const linked = new Set([0]);
      for (let grew = true; grew; ) {
        grew = false;
        places.forEach((p, i) => {
          if (linked.has(i)) return;
          const touches = [...linked].some((j) => {
            const q = places[j];
            return q !== undefined && (p.points.some((v) => toEdges(v, q.points) < 1e-6) || q.points.some((v) => toEdges(v, p.points) < 1e-6));
          });
          if (touches) {
            linked.add(i);
            grew = true;
          }
        });
      }
      expect(linked.size).toBe(7);
    });
  }

  it('fits every picture and the tray below the HUD on every screen', () => {
    for (const screen of REFERENCE_SCREENS) {
      const { arena } = arenaFor(screen.width, screen.height);
      const game = createTangram({ arena, goal: 2, duration: 90, params: {}, rng: createRng(1) });
      for (const slot of game.state.slots) for (const [x, y] of slot.points) expect(x >= 0 && x <= arena.width && y >= HUD_SAFE_TOP && y <= arena.height).toBe(true);
      for (const piece of game.state.pieces) expect(piece.y).toBeGreaterThan(HUD_SAFE_TOP);
    }
  });
});

describe('tangram rules', () => {
  const setup = () => createTangram({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(3) });
  type Game = ReturnType<typeof setup>;
  const dragTo = (game: Game, index: number, x: number, y: number) => {
    const piece = game.state.pieces[index];
    if (!piece) throw new Error('no piece');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: piece.x, y: piece.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x, y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('turns a piece 45° on a tap', () => {
    const game = setup();
    const piece = game.state.pieces.at(-1);
    if (!piece) throw new Error('no piece');
    const k = piece.k;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: piece.x, y: piece.y }] });
    expect(piece.k).toBe((k + 1) % 8);
  });

  it('snaps a piece dropped near its place when turned right or one turn off, not two', () => {
    const game = setup();
    const index = game.state.pieces.length - 1;
    const piece = game.state.pieces[index];
    if (!piece) throw new Error('no piece');
    const slot = game.state.slots.find((s) => s.kind === piece.kind);
    if (!slot) throw new Error('no slot');
    piece.k = (slot.k + 2) % 8;
    if (turnsApart(piece.kind, piece.k, slot.k) >= 2) {
      dragTo(game, index, slot.x + 10, slot.y - 10);
      expect(piece.slot).toBe(-1);
    }
    piece.k = (slot.k + 1) % 8;
    const now = game.state.pieces.indexOf(piece);
    dragTo(game, now, slot.x - 12, slot.y + 12);
    expect(piece.slot).toBeGreaterThanOrEqual(0);
    expect([piece.x, piece.y, piece.k]).toEqual([slot.x, slot.y, slot.k]);
  });
});
