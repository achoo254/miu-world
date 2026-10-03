// Rice winnow (sảy gạo giúp Tấm): rice mixed with husks lies in a round winnowing tray. The child flicks up to
// toss it; the wind blows from the left and carries the light husks away while the rice falls back. How high
// it goes follows the length of the flick: a little toss blows off one husk, a good toss three; a toss too high
// blows off four husks but some rice flies away too (the tray then gets fewer stars, never fewer points). A
// tray with no husk left is a point and a new tray comes. A gauge beside the tray shows the good band and where
// the last toss went. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type TossKind = 'low' | 'good' | 'high';

export interface Toss {
  height: number;
  kind: TossKind;
  husksOff: number;
  riceOff: number;
  ago: number;
}

export interface WinnowState {
  tray: Point & { r: number };
  rice: number;
  husks: number;
  toss: Toss | null;
  /** Height of the last toss (the gauge's marker), or null. */
  lastHeight: number | null;
  /** Seconds since the tray came clean (it shines, then a new one comes), -1 while working. */
  cleanAgo: number;
  /** Stars of finished trays (by how much rice stayed), newest last. */
  trays: number[];
  /** Gauge: units of toss height per unit of gauge, and the good band. */
  goodLow: number;
  goodHigh: number;
  maxHeight: number;
  lastTossAt: number;
  score: number;
  time: number;
}

export const RICE = 40;
export const HUSKS = 12;
export const TOSS_SECONDS = 0.9;
const CLEAN_SECONDS = 1.1;
/** Toss heights (arena units) of the good band, and the highest a toss can go. */
export const GOOD_LOW = 110;
export const GOOD_HIGH = 260;
const MAX_HEIGHT = 420;

/** What a toss of this height does. */
export function tossFor(height: number, husks: number): Pick<Toss, 'kind' | 'husksOff' | 'riceOff'> {
  if (height < GOOD_LOW) return { kind: 'low', husksOff: Math.min(husks, 1), riceOff: 0 };
  if (height <= GOOD_HIGH) return { kind: 'good', husksOff: Math.min(husks, 3), riceOff: 0 };
  return { kind: 'high', husksOff: Math.min(husks, 4), riceOff: 4 };
}

export function createRiceWinnow({ arena }: GameSetup): MinigameLogic<WinnowState> {
  const events = eventQueue();
  const r = Math.min(190, arena.width * 0.3);
  const state: WinnowState = {
    tray: { x: arena.width / 2, y: arena.height - r * 0.45 - 60, r },
    rice: RICE,
    husks: HUSKS,
    toss: null,
    lastHeight: null,
    cleanAgo: -1,
    trays: [],
    goodLow: GOOD_LOW,
    goodHigh: GOOD_HIGH,
    maxHeight: MAX_HEIGHT,
    lastTossAt: 0,
    score: 0,
    time: 0,
  };

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
      if (state.cleanAgo >= 0) {
        state.cleanAgo += dt;
        if (state.cleanAgo >= CLEAN_SECONDS) {
          state.cleanAgo = -1;
          state.rice = RICE;
          state.husks = HUSKS;
          state.lastHeight = null;
        }
        return;
      }
      if (state.toss) {
        state.toss.ago += dt;
        if (state.toss.ago < TOSS_SECONDS) return;
        // Landed: the wind has taken what it took.
        const toss = state.toss;
        state.toss = null;
        state.husks -= toss.husksOff;
        state.rice = Math.max(0, state.rice - toss.riceOff);
        if (state.husks <= 0) {
          state.cleanAgo = 0;
          state.score += 1;
          state.trays.push(state.rice >= RICE - 4 ? 3 : state.rice >= RICE - 12 ? 2 : 1);
          events.push({ type: 'score', x: state.tray.x, y: state.tray.y - state.tray.r * 0.6 });
        }
        return;
      }
      const flick = input.swipes.find((s) => s.dy < 0 && Math.abs(s.dy) >= Math.abs(s.dx) * 0.7);
      if (!flick) return;
      const height = Math.min(MAX_HEIGHT, Math.abs(flick.dy) * 1.1);
      state.toss = { height, ...tossFor(height, state.husks), ago: 0 };
      state.lastHeight = height;
      state.lastTossAt = state.time;
      const kind = state.toss.kind;
      events.push({ type: kind === 'high' ? 'miss' : 'action', x: state.tray.x, y: state.tray.y - 30, note: kind === 'good' ? 72 : kind === 'low' ? 65 : 79, voice: 'whistle' });
    },
  };
}

/** Good play: a flick of the right length for a good toss, a beat after each landing. */
export function riceWinnowBot(state: WinnowState, _context: BotContext): BotMove {
  if (state.toss || state.cleanAgo >= 0 || state.time - state.lastTossAt < TOSS_SECONDS + 0.2) return {};
  const length = (GOOD_LOW + GOOD_HIGH) / 2 / 1.1;
  return { swipe: { from: { x: state.tray.x, y: state.tray.y }, dx: 0, dy: -length } };
}
