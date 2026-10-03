// Piano tiles: coloured keys slide down four lanes in time with two old children's tunes (Twinkle, Twinkle
// and Frère Jacques, which Vietnamese children sing as "Kìa con bướm vàng"). A tap on a key plays its note;
// a key played as its bottom edge crosses the glowing line is right on the beat and scores two. A key that
// slides off the bottom unplayed is a miss, and the sixth miss ends the song early. The round ends with the
// song. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** [MIDI note, beats] */
type Note = readonly [number, number];

const C = 60, D = 62, E = 64, F = 65, G = 67, A = 69, G3 = 55;
const TWINKLE: Note[] = [
  [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
  [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
  [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
  [G, 1], [G, 1], [F, 1], [F, 1], [E, 1], [E, 1], [D, 2],
  [C, 1], [C, 1], [G, 1], [G, 1], [A, 1], [A, 1], [G, 2],
  [F, 1], [F, 1], [E, 1], [E, 1], [D, 1], [D, 1], [C, 2],
];
const JACQUES: Note[] = [
  [C, 1], [D, 1], [E, 1], [C, 1], [C, 1], [D, 1], [E, 1], [C, 1],
  [E, 1], [F, 1], [G, 2], [E, 1], [F, 1], [G, 2],
  [G, 0.5], [A, 0.5], [G, 0.5], [F, 0.5], [E, 1], [C, 1], [G, 0.5], [A, 0.5], [G, 0.5], [F, 0.5], [E, 1], [C, 1],
  [C, 1], [G3, 1], [C, 2], [C, 1], [G3, 1], [C, 2],
];
/** The medley, with a beat of rest between the tunes. */
export const SONG: readonly Note[] = [...TWINKLE, ...JACQUES];
export const SONG_TILES = SONG.length;

export const LANES = 4;
/** Misses allowed: the sixth ends the song. */
export const MISSES_ALLOWED = 5;
/** Units a beat takes on screen. */
const BEAT_UNITS = 150;
const BEAT_START = 0.6;
const BEAT_END = 0.5;
const LEAD_SECONDS = 1.5;
/** A key whose bottom edge is this close to the line when tapped is played right on the beat. */
export const PERFECT_UNITS = 55;

const DEGREE: Readonly<Record<number, number>> = { [G3]: 0, [C]: 0, [D]: 1, [E]: 2, [F]: 3, [G]: 0, [A]: 1 };

export interface Tile {
  lane: number;
  note: number;
  /** Top and bottom edges on screen. */
  y: number;
  h: number;
  /** Seconds since tapped (-1 while waiting), or missed. */
  tapped: number;
  missed: boolean;
  /** Played right on the line: two points. */
  perfect: boolean;
}

export interface PianoState {
  boardX: number;
  laneW: number;
  /** Where keys are meant to be played: a glowing line near the bottom. */
  lineY: number;
  tiles: Tile[];
  misses: number;
  /** Seconds since the last miss (the lane flashes). */
  missAgo: number;
  missLane: number;
  score: number;
  time: number;
  finished: boolean;
}

export function createPianoTiles({ arena, params }: GameSetup): MinigameLogic<PianoState> {
  const factor = typeof params.tempo === 'number' ? Math.min(1.4, Math.max(0.7, params.tempo)) : 1;
  const events = eventQueue();
  const boardW = Math.min(arena.width - 40, 620);
  const lineY = arena.height - 110;
  // Lay the whole song out above the screen: a tile's bottom reaches the line on its beat.
  const tiles: Tile[] = [];
  let beatY = lineY - LEAD_SECONDS * (BEAT_UNITS / BEAT_START);
  let lastLane = -1;
  SONG.forEach(([note, beats], i) => {
    const prev = SONG[i - 1];
    // Same note again: same key; otherwise the scale degree picks the lane, never the lane just used.
    let lane = prev && prev[0] === note ? lastLane : (DEGREE[note] ?? 0) % LANES;
    if (lane === lastLane && prev?.[0] !== note) lane = (lane + 1) % LANES;
    const h = BEAT_UNITS * beats;
    tiles.push({ lane, note, y: beatY - h + 6, h: h - 12, tapped: -1, missed: false, perfect: false });
    beatY -= h;
    lastLane = lane;
  });
  const state: PianoState = { boardX: (arena.width - boardW) / 2, laneW: boardW / LANES, lineY, tiles, misses: 0, missAgo: 9, missLane: 0, score: 0, time: 0, finished: false };
  const totalHeight = -beatY;

  /** Scroll speed (units/s): the tempo picks up a little toward the end. */
  const speed = (): number => {
    const travelled = tiles[0] ? tiles[0].y : 0;
    const p = Math.min(1, Math.max(0, travelled / totalHeight));
    return (BEAT_UNITS / (BEAT_START + (BEAT_END - BEAT_START) * p)) * factor;
  };

  function tap(at: Point): void {
    // The lowest unplayed key under the finger (a little wider than drawn).
    const lane = Math.floor((at.x - state.boardX) / state.laneW);
    const hit = state.tiles
      .filter((t) => t.tapped < 0 && !t.missed && t.lane === lane && at.y >= t.y - 20 && at.y <= t.y + t.h + 20 && t.y + t.h > HUD_SAFE_TOP)
      .sort((a, b) => b.y - a.y)[0];
    if (!hit) return;
    hit.tapped = 0;
    hit.perfect = Math.abs(hit.y + hit.h - lineY) <= PERFECT_UNITS;
    const points = hit.perfect ? 2 : 1;
    state.score += points;
    events.push({ type: 'score', x: state.boardX + (hit.lane + 0.5) * state.laneW, y: Math.min(hit.y + hit.h / 2, lineY), points, note: hit.note, voice: 'piano' });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finished;
    },
    get lives() {
      return MISSES_ALLOWED + 1 - state.misses;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.missAgo += dt;
      for (const at of input.taps) tap(at);
      const move = speed() * dt;
      for (const t of state.tiles) {
        t.y += move;
        if (t.tapped >= 0) t.tapped += dt;
        if (t.tapped < 0 && !t.missed && t.y > arena.height) {
          t.missed = true;
          state.misses += 1;
          state.missAgo = 0;
          state.missLane = t.lane;
          events.push({ type: 'miss', x: state.boardX + (t.lane + 0.5) * state.laneW, y: arena.height - 30 });
        }
      }
      const last = state.tiles[state.tiles.length - 1];
      if (state.misses > MISSES_ALLOWED || (last && last.y > arena.height + 20)) state.finished = true;
    },
  };
}

/** Good play: tap each key as its bottom edge reaches the line. */
export function pianoTilesBot(state: PianoState, _context: BotContext): BotMove {
  const next = state.tiles.filter((t) => t.tapped < 0 && !t.missed && t.y + t.h > HUD_SAFE_TOP + 60).sort((a, b) => b.y - a.y)[0];
  if (!next || next.y + next.h < state.lineY - PERFECT_UNITS * 0.6) return {};
  return { tap: { x: state.boardX + (next.lane + 0.5) * state.laneW, y: Math.max(next.y, HUD_SAFE_TOP) + Math.min(next.h, 60) / 2 } };
}
