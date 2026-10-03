// Crowd gates: a little crowd of friends runs up a two-lane road. Pairs of gates come down the road, each
// with a sum on it (+5, −3, ×2); the crowd goes through the gate of the lane it is in and grows or shrinks by
// that sum. The child swipes (or taps a side) to change lanes, picking the gate that makes the crowd bigger.
// At the end of the road a stuck car needs 30 friends to push it out. Points are the friends at the finish.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type GateOp = { kind: '+' | '-' | 'x'; n: number };

export interface GatePair {
  ops: [GateOp, GateOp];
  /** Seconds after the start when the pair reaches the crowd. */
  at: number;
  /** Which lane the crowd took (once passed), -1 before. */
  taken: number;
}

export interface CrowdState {
  /** Lane centres (left, right) and the crowd's y. */
  lanes: [number, number];
  crowdY: number;
  /** Where the gates appear. */
  topY: number;
  crowdX: number;
  lane: 0 | 1;
  crowd: number;
  pairs: GatePair[];
  /** Seconds a gate takes from the top to the crowd. */
  travel: number;
  /** When the finish line reaches the crowd. */
  finishAt: number;
  /** Seconds since the crowd last changed (a pop). */
  changedAgo: number;
  lastChange: number;
  /** Seconds since the finish (-1 before). */
  finishedAgo: number;
  score: number;
  time: number;
}

export const START = 3;
export const PAIRS = 10;
export const NEEDED = 30;
const FIRST_AT = 4;
const GAP = 4.2;
const TRAVEL = 3;
const LANE_SPEED = 1100;
const MAX_CROWD = 99;
const FINISH_SECONDS = 2.2;

export const applyOp = (crowd: number, op: GateOp): number => {
  const next = op.kind === '+' ? crowd + op.n : op.kind === '-' ? crowd - op.n : crowd * op.n;
  return Math.max(1, Math.min(MAX_CROWD, next));
};

export const opText = (op: GateOp): string => (op.kind === '+' ? `+${op.n}` : op.kind === '-' ? `−${op.n}` : `×${op.n}`);

/** Crowd at the finish taking the bigger gate every time (the best possible: every sum only ever helps a bigger crowd). */
export const bestPath = (pairs: readonly Pick<GatePair, 'ops'>[]): number => pairs.reduce((c, p) => Math.max(applyOp(c, p.ops[0]), applyOp(c, p.ops[1])), START);
export const laneOnly = (pairs: readonly Pick<GatePair, 'ops'>[], lane: 0 | 1): number => pairs.reduce((c, p) => applyOp(c, p.ops[lane]), START);

/**
 * One pair for a crowd of `c`: mostly a clear choice (more against fewer), sometimes two that both add, where
 * she has to work out which adds more (+6 or ×2?). Returns [better, worse] for that crowd.
 */
function pairFor(rng: Rng, c: number): [GateOp, GateOp] {
  if (rng.chance(0.4) && c >= 3 && c <= 14) {
    const times: GateOp = { kind: 'x', n: 2 };
    let plus: GateOp = { kind: '+', n: rng.int(2, 9) };
    while (plus.n === c) plus = { kind: '+', n: rng.int(2, 9) };
    return applyOp(c, times) > applyOp(c, plus) ? [times, plus] : [plus, times];
  }
  const good: GateOp = rng.chance(0.3) && c <= 20 ? { kind: 'x', n: 2 } : { kind: '+', n: rng.int(4, 9) };
  const bad: GateOp = rng.chance(0.7) ? { kind: '-', n: rng.int(1, 5) } : { kind: '+', n: rng.int(1, 2) };
  return [good, bad];
}

/** Gates where good choices clear the car with room to spare and staying in one lane never does. */
function makePairs(rng: Rng): GatePair[] {
  let pairs: GatePair[] = [];
  for (let tries = 0; tries < 1000; tries += 1) {
    let c = START;
    pairs = Array.from({ length: PAIRS }, (_, i) => {
      const [better, worse] = pairFor(rng, c);
      c = applyOp(c, better);
      const ops: [GateOp, GateOp] = rng.chance(0.5) ? [better, worse] : [worse, better];
      return { ops, at: FIRST_AT + i * GAP, taken: -1 };
    });
    const best = bestPath(pairs);
    if (best >= NEEDED + 8 && best <= 85 && laneOnly(pairs, 0) <= NEEDED - 8 && laneOnly(pairs, 1) <= NEEDED - 8) return pairs;
  }
  return pairs;
}

export function createCrowdGates({ arena, rng }: GameSetup): MinigameLogic<CrowdState> {
  const events = eventQueue();
  const road = Math.min(arena.width - 60, 560);
  const lanes: [number, number] = [arena.width / 2 - road / 4, arena.width / 2 + road / 4];
  const pairs = makePairs(rng);
  const state: CrowdState = {
    lanes,
    crowdY: arena.height - 150,
    topY: HUD_SAFE_TOP + 10,
    crowdX: lanes[0],
    lane: 0,
    crowd: START,
    pairs,
    travel: TRAVEL,
    finishAt: (pairs.at(-1)?.at ?? 0) + GAP,
    changedAgo: 9,
    lastChange: 0,
    finishedAgo: -1,
    score: START,
    time: 0,
  };

  const steer = (lane: 0 | 1): void => {
    if (state.lane !== lane) events.push({ type: 'action', x: lanes[lane], y: state.crowdY });
    state.lane = lane;
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finishedAgo > FINISH_SECONDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.changedAgo += dt;
      if (state.finishedAgo >= 0) {
        state.finishedAgo += dt;
        return;
      }
      for (const s of input.swipes) {
        if (s.direction === 'left') steer(0);
        if (s.direction === 'right') steer(1);
      }
      for (const t of input.taps) steer(t.x < arena.width / 2 ? 0 : 1);
      const target = lanes[state.lane];
      const move = LANE_SPEED * dt;
      state.crowdX += Math.max(-move, Math.min(move, target - state.crowdX));

      for (const pair of state.pairs) {
        if (pair.taken >= 0 || state.time < pair.at) continue;
        // Through the gate on the side the crowd is on now.
        const lane: 0 | 1 = Math.abs(state.crowdX - lanes[0]) <= Math.abs(state.crowdX - lanes[1]) ? 0 : 1;
        pair.taken = lane;
        const before = state.crowd;
        state.crowd = applyOp(state.crowd, pair.ops[lane]);
        state.lastChange = state.crowd - before;
        state.changedAgo = 0;
        events.push({ type: state.lastChange >= 0 ? 'action' : 'hit', x: lanes[lane], y: state.crowdY - 50 });
        const other = applyOp(before, pair.ops[lane === 0 ? 1 : 0]);
        if (state.crowd >= other) events.push({ type: 'score', x: lanes[lane], y: state.crowdY - 80, points: Math.max(1, state.lastChange) });
      }
      state.score = state.crowd;
      if (state.time >= state.finishAt) {
        state.finishedAgo = 0;
        events.push({ type: state.crowd >= NEEDED ? 'score' : 'miss', x: arena.width / 2, y: state.crowdY - 120, points: state.crowd });
      }
    },
  };
}

/** Good play: as soon as a pair is the next one coming, moves to the side whose sum gives the bigger crowd. */
export function crowdBot(state: CrowdState, context: BotContext): BotMove {
  const next = state.pairs.find((p) => p.taken < 0);
  if (!next || state.finishedAgo >= 0) return {};
  const better: 0 | 1 = applyOp(state.crowd, next.ops[0]) >= applyOp(state.crowd, next.ops[1]) ? 0 : 1;
  if (better === state.lane) return {};
  const y = context.arena.height * 0.6;
  return { swipe: { from: { x: context.arena.width / 2, y }, dx: better === 0 ? -140 : 140, dy: 0 } };
}
