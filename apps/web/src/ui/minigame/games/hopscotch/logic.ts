// Hopscotch (nhảy lò cò): eight numbered boxes chalked on the ground. Each round has a target box (1, then
// 2, … up to 8, then again). First the throw: a marker runs up and down the boxes and a tap throws the
// stone onto the box the marker is on; the wrong box means throw again. Then the hop: tap the boxes in order
// from 1 to 8, jumping over the box with the stone. A wrong box sends her back to the start to throw again.
// Every round done is a point. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Boxes 1–8: row from the start (0 nearest) and side (-1 left, 0 middle, 1 right). */
const LAYOUT: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, -1],
  [3, 1],
  [4, 0],
  [5, -1],
  [5, 1],
];
export const BOXES = LAYOUT.length;

export type HopPhase = 'throw' | 'hop' | 'oops' | 'done';

export interface HopscotchState {
  /** Box centres on screen (index 0 is box 1), the box size, and where she stands to start. */
  boxes: Point[];
  box: number;
  start: Point;
  /** The box (0-based) the stone must land on this round. */
  target: number;
  /** Where the throwing marker is: 0 → BOXES, back and forth. */
  marker: number;
  markerDir: number;
  stone: number | null;
  /** Boxes hopped so far this round (0-based box indices), and where she stands. */
  hopped: number[];
  at: Point;
  hopFrom: Point;
  hopAgo: number;
  phase: HopPhase;
  phaseAgo: number;
  /** Why the last try went wrong. */
  oops: 'throw' | 'hop' | null;
  rounds: number;
  score: number;
  time: number;
}

const MARKER_SPEED = 1.6;
const HOP_SECONDS = 0.28;
const OOPS_SECONDS = 1.1;
const DONE_SECONDS = 1.0;

/** The boxes to hop this round, in order: all but the one with the stone. */
export const hopOrder = (s: Pick<HopscotchState, 'target'>): number[] => Array.from({ length: BOXES }, (_, i) => i).filter((i) => i !== s.target);

export function createHopscotch({ arena, params }: GameSetup): MinigameLogic<HopscotchState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 20;
  const box = wide ? Math.min(118, (arena.width - 220) / 6, (arena.height - top - 40) / 2) : Math.min(130, (arena.height - top - 200) / 6, (arena.width - 80) / 2);
  const along = (row: number): number => (wide ? 160 + (row + 0.5) * box : arena.height - 150 - (row + 0.5) * box);
  const across = (side: number): number => (wide ? top + (arena.height - top) / 2 + side * box * 0.5 : arena.width / 2 + side * box * 0.5);
  const boxes = LAYOUT.map(([row, side]) => (wide ? { x: along(row), y: across(side) } : { x: across(side), y: along(row) }));
  const start = wide ? { x: 70, y: across(0) } : { x: across(0), y: arena.height - 60 };
  const state: HopscotchState = {
    boxes,
    box,
    start,
    target: 0,
    marker: 0,
    markerDir: 1,
    stone: null,
    hopped: [],
    at: start,
    hopFrom: start,
    hopAgo: 9,
    phase: 'throw',
    phaseAgo: 0,
    oops: null,
    rounds: 0,
    score: 0,
    time: 0,
  };
  const setPhase = (phase: HopPhase): void => {
    state.phase = phase;
    state.phaseAgo = 0;
  };
  const boxAt = (p: Point): number => boxes.findIndex((b) => Math.abs(b.x - p.x) <= box * 0.5 + 6 && Math.abs(b.y - p.y) <= box * 0.5 + 6);
  const backToStart = (): void => {
    state.stone = null;
    state.hopped = [];
    state.at = start;
    state.hopFrom = start;
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
      state.phaseAgo += dt;
      state.hopAgo += dt;
      switch (state.phase) {
        case 'throw': {
          state.marker += state.markerDir * MARKER_SPEED * factor * dt;
          if (state.marker >= BOXES) {
            state.marker = BOXES - 1e-6;
            state.markerDir = -1;
          } else if (state.marker <= 0) {
            state.marker = 0;
            state.markerDir = 1;
          }
          if (input.taps.length === 0) break;
          const landed = Math.floor(state.marker);
          state.stone = landed;
          const b = boxes[landed] ?? start;
          if (landed === state.target) {
            events.push({ type: 'action', ...b });
            setPhase('hop');
          } else {
            state.oops = 'throw';
            events.push({ type: 'miss', ...b });
            setPhase('oops');
          }
          break;
        }
        case 'hop': {
          if (state.hopAgo < HOP_SECONDS) break;
          const tap = input.taps[0];
          if (!tap) break;
          const i = boxAt(tap);
          if (i < 0) break;
          const order = hopOrder(state);
          const next = order[state.hopped.length];
          if (i !== next) {
            state.oops = 'hop';
            events.push({ type: 'hit', ...(boxes[i] ?? start) });
            setPhase('oops');
            break;
          }
          state.hopFrom = state.at;
          state.at = boxes[i] ?? start;
          state.hopAgo = 0;
          state.hopped.push(i);
          events.push({ type: 'action', ...state.at });
          if (state.hopped.length === order.length) {
            state.score += 1;
            state.rounds += 1;
            events.push({ type: 'score', ...state.at });
            setPhase('done');
          }
          break;
        }
        case 'oops':
          if (state.phaseAgo >= OOPS_SECONDS) {
            backToStart();
            setPhase('throw');
          }
          break;
        case 'done':
          if (state.phaseAgo >= DONE_SECONDS) {
            backToStart();
            state.target = (state.target + 1) % BOXES;
            state.marker = 0;
            state.markerDir = 1;
            setPhase('throw');
          }
          break;
      }
    },
  };
}

/** Good play: throw when the marker is in the middle of the target box, then hop the boxes in order. */
export function hopscotchBot(state: HopscotchState, _context: BotContext): BotMove {
  if (state.phase === 'throw') {
    const inBox = state.marker - state.target;
    return inBox > 0.25 && inBox < 0.75 ? { tap: state.start } : {};
  }
  if (state.phase === 'hop' && state.hopAgo >= 0.3) {
    const next = hopOrder(state)[state.hopped.length];
    const b = next === undefined ? undefined : state.boxes[next];
    return b ? { tap: b } : {};
  }
  return {};
}
