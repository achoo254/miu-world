import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTileTriple, deal, isFree, PLACES, solvable, TRAY } from './logic';

describeMinigame('tile-triple');

describe('triple tiles rules', () => {
  const setup = () => createTileTriple({ arena: { width: 863, height: 600 }, goal: 16, duration: 90, params: {}, rng: createRng(3) });

  it('deals boards of whole triples that a careful player can clear', () => {
    expect(PLACES.length % 3).toBe(0);
    const rng = createRng(5);
    for (let n = 0; n < 20; n += 1) {
      const kinds = deal(rng);
      const counts = new Map<number, number>();
      for (const k of kinds) counts.set(k, (counts.get(k) ?? 0) + 1);
      expect([...counts.values()].every((c) => c % 3 === 0)).toBe(true);
      expect(solvable(kinds)).toBe(true);
    }
  });

  it('only takes uncovered tiles, clears three alike, and lays the board out again when the tray fills', () => {
    const game = setup();
    const s = game.state;
    const covered = s.tiles.find((t) => !isFree(s.tiles, t));
    if (!covered) throw new Error('nothing covered');
    const tapTile = (id: number) => {
      const t = s.tiles[id];
      if (!t) throw new Error('no tile');
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.left + t.gx * s.tile, y: s.top + t.gy * s.tile }] });
    };
    // A covered layer-0 corner: tapping its free corner does not take it.
    const corner = s.tiles.find((t) => t.layer === 0 && t.gx === 1.5 && t.gy === 1.5);
    if (corner) tapTile(corner.id);
    expect(s.tray).toHaveLength(0);
    // Force a triple on the top layer.
    const top = s.tiles.filter((t) => t.layer === 1).slice(0, 3);
    for (const t of top) t.kind = 0;
    s.tray = [];
    for (const t of top) tapTile(t.id);
    expect(game.score).toBe(1);
    expect(s.tray).toHaveLength(0);
    // Seven different kinds in the tray: full.
    s.tray = [1, 2, 3, 4, 5, 1];
    const free = s.tiles.find((t) => isFree(s.tiles, t) && t.kind !== 1);
    if (!free) throw new Error('no free tile');
    free.kind = 2;
    tapTile(free.id);
    expect(s.tray.length).toBe(TRAY);
    expect(s.phase).toBe('full');
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.tray).toHaveLength(0);
    expect(s.tiles.every((t) => !t.taken)).toBe(true);
  });
});
