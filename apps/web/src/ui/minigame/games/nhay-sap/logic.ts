// Nhảy sạp (bamboo dance): two friends kneel at the ends of a pair of bamboo poles and play a four-beat bar:
// clack the poles together on beats one and two, hold them open on beats three and four. Each tap is a hop:
// in between the poles, or back out. The dance step is in on beat three and out on beat four, before the
// clack: done right it is two points. Out too early (still on beat three) is no step; in on a clack, or
// still inside when the poles close, trips the child: a short stumble and the streak starts over (no points
// lost). So hopping all the time scores nothing. The tempo quickens through the round. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface NhaySapState {
  /** Where the poles lie (their middle line, how far apart wide open, how long) and where the dancer waits. */
  poles: { x: number; y: number; gap: number; half: number };
  outAt: Point;
  /** Beats since the start (4 a bar); the poles are open in beats 2–4 of each bar. */
  beat: number;
  beatSeconds: number;
  /** Where the dancer is, and seconds since the last hop (the jump animation). */
  inside: boolean;
  hopAgo: number;
  /** Seconds left of a stumble (0 when dancing). */
  stumble: number;
  /** Bar of the last good step in (its step out may then score), and of the last scored step. */
  steppedIn: number;
  scored: number;
  streak: number;
  best: number;
  /** Words for the last step and when. */
  said: { text: string; good: boolean; at: number } | null;
  score: number;
  time: number;
}

/** In bar beats: the poles start opening at OPEN, are shut again at CLOSE (= the next bar's start). */
export const OPEN = 2;
export const CLOSE = 4;
/** The step in is on beat three (OPEN … OUT_FROM), the step out on beat four (OUT_FROM … CLOSE). */
export const OUT_FROM = 3;
const STUMBLE_SECONDS = 0.6;
const BEAT_START = 0.62;
const BEAT_END = 0.46;

/** How far apart the poles are (0 shut, 1 wide open) at a beat position within the bar. */
export function gapAt(barBeat: number): number {
  if (barBeat >= OPEN) {
    const opening = Math.min(1, (barBeat - OPEN) / 0.15);
    const closing = Math.min(1, (CLOSE - barBeat) / 0.15);
    return Math.min(opening, closing);
  }
  // A little bounce between the two clacks.
  return 0.25 * Math.sin((barBeat % 1) * Math.PI);
}

export function createNhaySap({ arena, duration }: GameSetup): MinigameLogic<NhaySapState> {
  const events = eventQueue();
  const gap = Math.min(170, arena.height * 0.2);
  const poleY = arena.height - gap - 150;
  const state: NhaySapState = {
    poles: { x: arena.width / 2, y: poleY, gap, half: Math.min(arena.width * 0.42, 420) },
    outAt: { x: arena.width / 2, y: poleY + gap / 2 + 110 },
    beat: -2,
    beatSeconds: BEAT_START,
    inside: false,
    hopAgo: 9,
    stumble: 0,
    steppedIn: -1,
    scored: -1,
    streak: 0,
    best: 0,
    said: null,
    score: 0,
    time: 0,
  };
  const bar = (): number => Math.floor(state.beat / 4);
  const inBar = (): number => ((state.beat % 4) + 4) % 4;

  function trip(text: string): void {
    state.inside = false;
    state.stumble = STUMBLE_SECONDS;
    state.streak = 0;
    state.said = { text, good: false, at: state.time };
    events.push({ type: 'hit', x: state.poles.x, y: state.poles.y });
  }

  function good(text: string): void {
    state.streak += 1;
    state.best = Math.max(state.best, state.streak);
    state.score += 2;
    state.said = { text, good: true, at: state.time };
    events.push({ type: 'score', x: state.poles.x, y: state.poles.y - state.poles.gap, points: 2, note: 72 + (state.streak % 5) * 2, voice: 'bell' });
  }

  function hop(): void {
    if (state.stumble > 0 || state.beat < 0) return;
    const b = inBar();
    state.hopAgo = 0;
    if (!state.inside) {
      state.inside = true;
      if (b < OPEN) return trip('Vướng sào!');
      if (b < OUT_FROM) {
        state.steppedIn = bar();
        state.said = { text: 'Vào!', good: true, at: state.time };
        events.push({ type: 'action', x: state.poles.x, y: state.poles.y, note: 67, voice: 'bell' });
      }
      return;
    }
    state.inside = false;
    if (b >= OUT_FROM && state.steppedIn === bar() && state.scored !== bar()) {
      state.scored = bar();
      good('Đẹp!');
    } else if (b < OUT_FROM) {
      state.steppedIn = -1;
      state.said = { text: 'Ra sớm quá', good: false, at: state.time };
    }
  }

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
      state.hopAgo += dt;
      state.stumble = Math.max(0, state.stumble - dt);
      state.beatSeconds = BEAT_START + (BEAT_END - BEAT_START) * Math.min(1, state.time / duration);
      const before = state.beat;
      state.beat += dt / state.beatSeconds;
      // The poles' clacks and the drum on the open beats (a beat's sound when it begins).
      if (Math.floor(state.beat) !== Math.floor(before)) {
        const b = ((Math.floor(state.beat) % 4) + 4) % 4;
        // A puff where the poles' ends clack (or are struck as a drum on the open beats).
        const end = b % 2 === 0 ? -1 : 1;
        events.push({ type: 'action', x: state.poles.x + end * state.poles.half, y: state.poles.y, note: b < OPEN ? 84 : 45, voice: b < OPEN ? 'clap' : 'drum' });
      }
      if (input.taps.length > 0) hop();
      // Still inside when the poles close: caught.
      if (state.inside && state.hopAgo > 0.12 && inBar() < OPEN && gapAt(inBar()) < 0.05 && state.beat >= 0) trip('Kẹp chân rồi!');
    },
  };
}

/** Good play: in just after the poles open, out on the fourth beat before they close. */
export function nhaySapBot(state: NhaySapState, _context: BotContext): BotMove {
  if (state.stumble > 0 || state.beat < 0) return {};
  const b = ((state.beat % 4) + 4) % 4;
  const bar = Math.floor(state.beat / 4);
  if (!state.inside && b >= OPEN + 0.05 && b <= OPEN + 0.6 && state.scored !== bar) return { tap: { ...state.outAt } };
  if (state.inside && b >= OUT_FROM + 0.2) return { tap: { ...state.outAt } };
  return {};
}
