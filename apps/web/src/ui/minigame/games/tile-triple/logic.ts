// Triple tiles: picture tiles lie in two layers on the market table. Only a tile with nothing on top of it can
// be tapped; it goes down to the tray of seven places, next to its kind. Three of a kind in the tray vanish (a
// point). A full tray tips the tiles back onto the table and the board starts over (points kept); an empty
// table brings a new board. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const TRAY = 7;
/** Kinds of picture (draw.ts has one for each). */
export const KINDS = 6;
const CLEAR_SECONDS = 1;
const FULL_SECONDS = 1.3;
const NOTES = [72, 76, 79];

export interface Tile {
  id: number;
  kind: number;
  layer: number;
  /** Centre in grid units (layer 1 sits half a tile in). */
  gx: number;
  gy: number;
  taken: boolean;
}

export interface TripleState {
  tiles: Tile[];
  /** Kinds as dealt (to start over). */
  dealt: number[];
  tray: number[];
  /** When the last three vanished (a burst over the tray). */
  matchedAt: number;
  phase: 'play' | 'cleared' | 'full';
  phaseAgo: number;
  tile: number;
  left: number;
  top: number;
  trayY: number;
  slot: number;
  lastTapAt: number;
  boards: number;
  score: number;
  time: number;
}

/** Grid places: a 4 × 4 layer under a 3 × 3 ring (no middle) offset by half a tile. */
export const PLACES: readonly { layer: number; gx: number; gy: number }[] = [
  ...Array.from({ length: 16 }, (_, i) => ({ layer: 0, gx: (i % 4) + 0.5, gy: Math.floor(i / 4) + 0.5 })),
  ...Array.from({ length: 9 }, (_, i) => ({ layer: 1, gx: (i % 3) + 1, gy: Math.floor(i / 3) + 1 })).filter((p) => !(p.gx === 2 && p.gy === 2)),
];

/** A tile that nothing above it overlaps. */
export const isFree = (tiles: readonly Tile[], t: Tile): boolean =>
  !t.taken && !tiles.some((o) => !o.taken && o.layer > t.layer && Math.abs(o.gx - t.gx) < 1 && Math.abs(o.gy - t.gy) < 1);

/** The tile a careful player takes next (or null): finish a set, build on one, then a kind with many free. */
export function pickTile(tiles: readonly Tile[], tray: readonly number[]): Tile | null {
  const free = tiles.filter((t) => isFree(tiles, t));
  if (free.length === 0) return null;
  const inTray = (k: number): number => tray.filter((x) => x === k).length;
  const freeOf = (k: number): number => free.filter((t) => t.kind === k).length;
  const finish = free.find((t) => inTray(t.kind) === 2);
  if (finish) return finish;
  if (tray.length <= TRAY - 2) {
    const build = free.find((t) => inTray(t.kind) === 1 && (freeOf(t.kind) >= 2 || tray.length <= TRAY - 3));
    if (build) return build;
  }
  const ranked = [...free].sort((a, b) => freeOf(b.kind) - freeOf(a.kind) || b.layer - a.layer);
  return ranked[0] ?? null;
}

/** Plays a deal through with `pickTile`; true when the table is cleared. */
export function solvable(kinds: readonly number[]): boolean {
  const tiles: Tile[] = PLACES.map((p, i) => ({ id: i, kind: kinds[i] ?? 0, ...p, taken: false }));
  let tray: number[] = [];
  for (let n = 0; n < tiles.length; n += 1) {
    const t = pickTile(tiles, tray);
    if (!t) return false;
    t.taken = true;
    tray.push(t.kind);
    if (tray.filter((k) => k === t.kind).length === 3) tray = tray.filter((k) => k !== t.kind);
    if (tray.length >= TRAY) return false;
  }
  return tiles.every((t) => t.taken);
}

export function deal(rng: Rng): number[] {
  let kinds: number[] = [];
  for (let tries = 0; tries < 60; tries += 1) {
    const triples = Array.from({ length: PLACES.length / 3 }, () => rng.int(0, KINDS - 1));
    kinds = triples.flatMap((k) => [k, k, k]);
    for (let i = kinds.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i);
      const a = kinds[i] ?? 0;
      kinds[i] = kinds[j] ?? 0;
      kinds[j] = a;
    }
    if (solvable(kinds)) return kinds;
  }
  return kinds;
}

export function createTileTriple({ arena, rng }: GameSetup): MinigameLogic<TripleState> {
  const events = eventQueue();
  const slot = Math.min(96, (arena.width - 40) / TRAY);
  const trayY = arena.height - slot / 2 - 26;
  const boardH = trayY - slot / 2 - 30 - (HUD_SAFE_TOP + 16);
  const tile = Math.min(130, boardH / 4, (arena.width - 40) / 4);
  const state: TripleState = {
    tiles: [],
    dealt: [],
    tray: [],
    matchedAt: -9,
    phase: 'play',
    phaseAgo: 0,
    tile,
    left: (arena.width - tile * 4) / 2,
    top: HUD_SAFE_TOP + 16 + (boardH - tile * 4) / 2,
    trayY,
    slot,
    lastTapAt: -9,
    boards: 0,
    score: 0,
    time: 0,
  };

  const layOut = (): void => {
    state.tiles = PLACES.map((p, i) => ({ id: i, kind: state.dealt[i] ?? 0, ...p, taken: false }));
    state.tray = [];
    state.phase = 'play';
    state.phaseAgo = 0;
  };
  const newBoard = (): void => {
    state.dealt = deal(rng);
    layOut();
  };

  const take = (t: Tile): void => {
    t.taken = true;
    state.lastTapAt = state.time;
    // Next to its kind in the tray.
    const at = state.tray.lastIndexOf(t.kind);
    if (at >= 0) state.tray.splice(at + 1, 0, t.kind);
    else state.tray.push(t.kind);
    const count = state.tray.filter((k) => k === t.kind).length;
    const x = state.left + t.gx * state.tile;
    const y = state.top + t.gy * state.tile;
    if (count === 3) {
      state.tray = state.tray.filter((k) => k !== t.kind);
      state.score += 1;
      state.matchedAt = state.time;
      events.push({ type: 'score', x: arena.width / 2, y: trayY, note: 84, voice: 'bell' });
      if (state.tiles.every((o) => o.taken)) {
        state.phase = 'cleared';
        state.phaseAgo = 0;
      }
    } else {
      events.push({ type: 'action', x, y, note: NOTES[count - 1] ?? 72, voice: 'bell' });
      if (state.tray.length >= TRAY) {
        state.phase = 'full';
        state.phaseAgo = 0;
        events.push({ type: 'hit', x: arena.width / 2, y: trayY });
      }
    }
  };

  newBoard();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      if (state.phase === 'cleared') {
        if (state.phaseAgo >= CLEAR_SECONDS) {
          state.boards += 1;
          newBoard();
        }
        return;
      }
      if (state.phase === 'full') {
        if (state.phaseAgo >= FULL_SECONDS) layOut();
        return;
      }
      for (const tap of input.taps) {
        // The topmost tile under the finger.
        const under = state.tiles
          .filter((t) => !t.taken && Math.abs(tap.x - (state.left + t.gx * state.tile)) < state.tile * 0.48 && Math.abs(tap.y - (state.top + t.gy * state.tile)) < state.tile * 0.48)
          .sort((a, b) => b.layer - a.layer)[0];
        if (!under) continue;
        if (isFree(state.tiles, under)) take(under);
        else events.push({ type: 'miss', x: tap.x, y: tap.y });
        return;
      }
    },
  };
}

/** Good play: the careful player's choice, a breath between taps. */
export function tileTripleBot(state: TripleState, _context: BotContext): BotMove {
  if (state.phase !== 'play' || state.time - state.lastTapAt < 0.35) return {};
  const t = pickTile(state.tiles, state.tray);
  if (!t) return {};
  const x = state.left + t.gx * state.tile;
  const y = state.top + t.gy * state.tile;
  return { tap: { x, y } };
}
