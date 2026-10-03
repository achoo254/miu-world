// One finger, read the same way by every game: where it is, how long it has been down, and the taps and
// swipes it made since the last step. Pure (no DOM): the stage feeds it pointer events, the bot harness feeds
// it the bot's moves, so both play by the same rules. Positions are arena units; the gesture thresholds are
// in CSS pixels, so a swipe feels the same on a phone and on an iPad.
import type { GameInput, Point, Swipe, SwipeDirection } from './types';

/** A tap moves less than this (CSS px) and lasts less than TAP_MAX_MS. */
export const TAP_MAX_MOVE_PX = 24;
export const TAP_MAX_MS = 450;
/** A swipe moves at least this far (CSS px) within SWIPE_MAX_MS. */
export const SWIPE_MIN_PX = 30;
export const SWIPE_MAX_MS = 800;

export type Gesture = { kind: 'tap'; at: Point } | { kind: 'swipe'; swipe: Swipe } | null;

const directionOf = (dx: number, dy: number): SwipeDirection => (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down');

/** What a finger lifted after `ms` milliseconds from `from` to `to` was; `pxPerUnit`: CSS px per arena unit. */
export function classifyGesture(from: Point, to: Point, ms: number, pxPerUnit: number): Gesture {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const px = Math.hypot(dx, dy) * pxPerUnit;
  if (px < TAP_MAX_MOVE_PX && ms <= TAP_MAX_MS) return { kind: 'tap', at: from };
  if (px >= SWIPE_MIN_PX && ms <= SWIPE_MAX_MS) {
    return { kind: 'swipe', swipe: { direction: directionOf(dx, dy), from, dx, dy, speed: Math.hypot(dx, dy) / Math.max(ms / 1000, 0.05) } };
  }
  return null;
}

export class InputCollector {
  private pointer: Point | null = null;
  private start: { at: Point; ms: number } | null = null;
  private pressed = false;
  private released = false;
  private taps: Point[] = [];
  private swipes: Swipe[] = [];

  /** `pxPerUnit`: CSS px per arena unit (1 for bots). */
  constructor(private pxPerUnit = 1) {}

  setScale(pxPerUnit: number): void {
    this.pxPerUnit = pxPerUnit;
  }

  down(at: Point, ms: number): void {
    this.pointer = at;
    this.start = { at, ms };
    this.pressed = true;
  }

  move(at: Point): void {
    if (this.start) this.pointer = at;
  }

  up(at: Point, ms: number): void {
    if (!this.start) return;
    const gesture = classifyGesture(this.start.at, at, ms - this.start.ms, this.pxPerUnit);
    if (gesture?.kind === 'tap') this.taps.push(gesture.at);
    if (gesture?.kind === 'swipe') this.swipes.push(gesture.swipe);
    this.pointer = null;
    this.start = null;
    this.released = true;
  }

  /** The finger left without a gesture (the browser took it, the tab hid). */
  cancel(): void {
    if (this.start) this.released = true;
    this.pointer = null;
    this.start = null;
  }

  /** The input for the next step; taps, swipes, press and release are handed out once. */
  take(nowMs: number): GameInput {
    const input: GameInput = {
      pointer: this.pointer,
      pressed: this.pressed,
      released: this.released,
      holdTime: this.start ? Math.max(0, (nowMs - this.start.ms) / 1000) : 0,
      taps: this.taps,
      swipes: this.swipes,
    };
    this.pressed = false;
    this.released = false;
    this.taps = [];
    this.swipes = [];
    return input;
  }
}
