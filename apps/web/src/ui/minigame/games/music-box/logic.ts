// Music box: the music box plays a short tune (4 to 6 notes); each note lights the pin of its row on the drum
// as it rings. The child taps squares of the drum to set one pin per column (high notes on top), then turns
// the handle ("Quay") to hear her tune: each column shows green when its note matches and red when not, so she
// can fix those. "Nghe" plays the box's tune again. A tune played right is a point, and the next is longer.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Pentatonic notes, top row first (high to low): any order sounds sweet on a music box. */
export const PITCHES = [69, 67, 64, 62, 60] as const;
export const ROWS = PITCHES.length;

export type BoxPhase = 'listen' | 'edit' | 'play' | 'solved';

export interface BoxButton extends Point {
  w: number;
  h: number;
  kind: 'listen' | 'play';
}

export interface MusicBoxState {
  left: number;
  top: number;
  cellW: number;
  cellH: number;
  tune: number[];
  /** The child's pin row per column, or -1. */
  pins: number[];
  /** After a turn of the handle: whether each column matched (null before). */
  checked: Array<boolean | null>;
  phase: BoxPhase;
  phaseTime: number;
  /** Column sounding now (-1 none). */
  playing: number;
  buttons: BoxButton[];
  lastTapAt: number;
  tunes: number;
  score: number;
  time: number;
}

export const NOTE_SECONDS = 0.5;
const SOLVED_SECONDS = 1.6;

function makeTune(rng: Rng, length: number): number[] {
  const tune: number[] = [rng.int(1, ROWS - 2)];
  while (tune.length < length) {
    const last = tune.at(-1) ?? 2;
    let next = last + rng.int(-2, 2);
    if (next === last && rng.chance(0.6)) next += rng.chance(0.5) ? 1 : -1;
    tune.push(Math.max(0, Math.min(ROWS - 1, next)));
  }
  return tune;
}

export function createMusicBox({ arena, rng }: GameSetup): MinigameLogic<MusicBoxState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const maxCols = 6;
  const cellW = Math.min(100, (arena.width - (wide ? 220 : 60)) / maxCols);
  const cellH = Math.min(84, (arena.height - HUD_SAFE_TOP - (wide ? 90 : 230)) / ROWS);
  const state: MusicBoxState = {
    left: 0,
    top: HUD_SAFE_TOP + 60,
    cellW,
    cellH,
    tune: [],
    pins: [],
    checked: [],
    phase: 'listen',
    phaseTime: 0,
    playing: -1,
    buttons: [],
    lastTapAt: -9,
    tunes: 0,
    score: 0,
    time: 0,
  };

  function layout(): void {
    const cols = state.tune.length;
    const gridW = cols * cellW;
    const gridH = ROWS * cellH;
    state.left = wide ? (arena.width - 160 - gridW) / 2 : (arena.width - gridW) / 2;
    state.top = wide ? HUD_SAFE_TOP + 40 + (arena.height - HUD_SAFE_TOP - 60 - gridH) / 2 : HUD_SAFE_TOP + 50 + (arena.height - HUD_SAFE_TOP - 230 - gridH) / 2;
    const bw = 130;
    const bh = 76;
    state.buttons = wide
      ? [
          { kind: 'listen', x: arena.width - 100, y: state.top + gridH * 0.25, w: bw, h: bh },
          { kind: 'play', x: arena.width - 100, y: state.top + gridH * 0.75, w: bw, h: bh },
        ]
      : [
          { kind: 'listen', x: arena.width * 0.3, y: state.top + gridH + 90, w: bw, h: bh },
          { kind: 'play', x: arena.width * 0.7, y: state.top + gridH + 90, w: bw, h: bh },
        ];
  }

  function newTune(): void {
    state.tune = makeTune(rng, Math.min(6, 4 + Math.floor(state.tunes / 2)));
    state.pins = state.tune.map(() => -1);
    state.checked = state.tune.map(() => null);
    layout();
    start('listen');
  }

  function start(phase: BoxPhase): void {
    state.phase = phase;
    state.phaseTime = 0;
    state.playing = -1;
  }

  const inButton = (b: BoxButton, p: Point): boolean => Math.abs(p.x - b.x) <= b.w / 2 + 8 && Math.abs(p.y - b.y) <= b.h / 2 + 8;

  function tap(p: Point): void {
    const button = state.buttons.find((b) => inButton(b, p));
    if (button) {
      events.push({ type: 'action', x: button.x, y: button.y });
      start(button.kind === 'listen' ? 'listen' : 'play');
      return;
    }
    const col = Math.floor((p.x - state.left) / cellW);
    const row = Math.floor((p.y - state.top) / cellH);
    if (col < 0 || col >= state.tune.length || row < 0 || row >= ROWS) return;
    state.pins[col] = state.pins[col] === row ? -1 : row;
    state.checked[col] = null;
    state.lastTapAt = state.time;
    events.push({ type: 'action', x: state.left + (col + 0.5) * cellW, y: state.top + (row + 0.5) * cellH, note: PITCHES[row], voice: 'bell' });
  }

  newTune();

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
      state.phaseTime += dt;
      if (state.phase === 'solved') {
        if (state.phaseTime > SOLVED_SECONDS) {
          state.tunes += 1;
          newTune();
        }
        return;
      }
      if (state.phase === 'listen' || state.phase === 'play') {
        const col = Math.floor((state.phaseTime - 0.3) / NOTE_SECONDS);
        if (col > state.playing && col < state.tune.length) {
          state.playing = col;
          const row = state.phase === 'listen' ? state.tune[col] : state.pins[col];
          const x = state.left + (col + 0.5) * cellW;
          if (row !== undefined && row >= 0) events.push({ type: 'action', x, y: state.top + (row + 0.5) * cellH, note: PITCHES[row], voice: 'bell' });
          if (state.phase === 'play') {
            const right = row === state.tune[col];
            state.checked[col] = right;
            if (!right) events.push({ type: 'miss', x, y: state.top });
          }
        }
        if (state.phaseTime >= 0.3 + NOTE_SECONDS * state.tune.length + 0.2) {
          if (state.phase === 'play' && state.checked.every((c) => c === true)) {
            state.score += 1;
            start('solved');
            events.push({ type: 'score', x: state.left + (state.tune.length * cellW) / 2, y: state.top - 30 });
          } else {
            start('edit');
          }
        }
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Good play with a good ear: sets each pin of the tune it heard, then turns the handle. */
export function musicBoxBot(state: MusicBoxState, _context: BotContext): BotMove {
  if (state.phase !== 'edit' || state.time - state.lastTapAt < 0.3) return {};
  const col = state.pins.findIndex((p, i) => p !== state.tune[i]);
  if (col < 0) {
    const play = state.buttons.find((b) => b.kind === 'play');
    return play ? { tap: { x: play.x, y: play.y } } : {};
  }
  const row = state.tune[col] ?? 0;
  return { tap: { x: state.left + (col + 0.5) * state.cellW, y: state.top + (row + 0.5) * state.cellH } };
}
