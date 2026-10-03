// Boat race: four canoes race up a river. The child paddles by tapping the left half of the screen, then the
// right, in turn: each stroke pushes the boat on, most when the strokes take turns at a steady beat (about
// two or three a second, the drum shows it). Two taps on the same side only turn the boat a little; taps
// faster than the beat only splash. Score at the finish: 3 for first, 2 for second, 1 for third, 0 for last.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const RIVAL_SPRITES: readonly SpriteName[] = ['frog', 'duck', 'turtle'];

export interface Boat {
  lane: number;
  /** Distance up the river, and speed. */
  y: number;
  v: number;
  /** Seconds at which it crossed the line (-1 not yet). */
  finished: number;
}

export type Stroke = 'left' | 'right';

export interface BoatState {
  lanes: number;
  laneWidth: number;
  finishY: number;
  player: Boat;
  rivals: Boat[];
  /** Cruising speeds of the rivals. */
  rivalSpeed: number[];
  lastStroke: Stroke | null;
  /** Seconds since the last stroke, and how the last one went. */
  sinceStroke: number;
  strokeKind: 'good' | 'ok' | 'same' | 'rushed' | null;
  /** A lean after two strokes on one side. */
  yaw: number;
  place: number;
  score: number;
  time: number;
}

export const FINISH = 9000;
const DRAG = 0.9;
const GOOD = 105;
const OK = 85;
const SAME_SIDE = 30;
const RUSHED = 15;
/** Strokes closer than this are rushed; a good beat is between these. */
export const RUSH = 0.18;
export const BEAT_MIN = 0.26;
export const BEAT_MAX = 0.62;
/** Seconds the three rivals take, before the `rivals` param scales them. */
const RIVAL_TIMES = [30, 36, 44];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function createBoatRace({ arena, params, rng }: GameSetup): MinigameLogic<BoatState> {
  const pace = typeof params.rivals === 'number' ? clamp(params.rivals, 0.7, 1.3) : 1;
  const events = eventQueue();
  const lanes = 4;
  const laneWidth = Math.min(170, (arena.width - 40) / lanes);
  const boat = (lane: number): Boat => ({ lane, y: 0, v: 0, finished: -1 });
  const state: BoatState = {
    lanes,
    laneWidth,
    finishY: FINISH,
    player: boat(1),
    rivals: [boat(0), boat(2), boat(3)],
    rivalSpeed: RIVAL_TIMES.map((t) => (FINISH / (t / pace)) * rng.range(0.97, 1.03)),
    lastStroke: null,
    sinceStroke: 9,
    strokeKind: null,
    yaw: 0,
    place: 0,
    score: 0,
    time: 0,
  };

  function stroke(side: Stroke): void {
    const gap = state.sinceStroke;
    let push: number;
    if (gap < RUSH) {
      push = RUSHED;
      state.strokeKind = 'rushed';
    } else if (side === state.lastStroke) {
      push = SAME_SIDE;
      state.strokeKind = 'same';
      state.yaw = side === 'left' ? 0.25 : -0.25;
    } else if (gap >= BEAT_MIN && gap <= BEAT_MAX) {
      push = GOOD;
      state.strokeKind = 'good';
    } else {
      push = OK;
      state.strokeKind = 'ok';
    }
    state.player.v += push;
    state.lastStroke = side;
    state.sinceStroke = 0;
    const x = arena.width / 2 + (side === 'left' ? -1 : 1) * 60;
    events.push({ type: 'action', x, y: arena.height * 0.7, note: side === 'left' ? 45 : 50, voice: 'drum' });
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.player.finished >= 0;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.sinceStroke += dt;
      state.yaw *= 1 - Math.min(1, dt * 3);
      if (state.player.finished < 0) for (const tap of input.taps) stroke(tap.x < arena.width / 2 ? 'left' : 'right');

      const p = state.player;
      p.v -= p.v * DRAG * dt;
      p.y += p.v * dt;
      state.rivals.forEach((r, i) => {
        // A steady paddle with a gentle surge on each stroke.
        const speed = (state.rivalSpeed[i] ?? 250) * (1 + 0.15 * Math.sin(state.time * 7 + i * 2));
        r.v = speed;
        r.y += speed * dt;
        if (r.y >= FINISH && r.finished < 0) r.finished = state.time;
      });
      if (p.y >= FINISH && p.finished < 0) {
        p.finished = state.time;
        state.place = 1 + state.rivals.filter((r) => r.finished >= 0).length;
        state.score = 4 - state.place;
        events.push({ type: state.score > 0 ? 'score' : 'miss', x: arena.width / 2, y: HUD_SAFE_TOP + 80, points: state.score });
      }
    },
  };
}

/** Good play: left, right, left… on the beat (every third decision, three tenths of a second). */
export function boatBot(state: BoatState, context: BotContext): BotMove {
  if (state.sinceStroke < 0.28) return {};
  const side = state.lastStroke === 'left' ? 'right' : 'left';
  return { tap: { x: side === 'left' ? context.arena.width * 0.25 : context.arena.width * 0.75, y: context.arena.height * 0.8 } };
}
