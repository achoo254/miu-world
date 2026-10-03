// Train switch: coloured trains come out of a tunnel onto a track that forks three times on its way to four
// stations, one per colour (each with its own sign, so colour is never the only clue). Tapping a fork
// switches it. A train that reaches the station of its own colour is a point; one that reaches another
// station takes a point back (never below zero). Trains come more often as the round goes on. Pure: no DOM,
// no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIGNS = ['heart', 'droplet', 'star', 'clover'] as const;

/** Track pieces: from node → to node. Nodes: 0 tunnel, 1 first fork, 2 and 3 second forks, 4–7 stations. */
export const EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [2, 4],
  [2, 5],
  [3, 6],
  [3, 7],
];
/** Forks: node → its two outgoing edges (index in EDGES), chosen by the fork's setting 0 or 1. */
export const FORKS: Readonly<Record<number, readonly [number, number]>> = { 1: [1, 2], 2: [3, 4], 3: [5, 6] };
export const FORK_NODES = [1, 2, 3] as const;
export const STATION_NODE = 4;

export interface Train {
  colour: number;
  edge: number;
  /** Units along the edge. */
  along: number;
  /** Seconds since it reached a station (-1 while running), and whether it was the right one. */
  arrived: number;
  right: boolean;
}

export interface TrainSwitchState {
  /** Screen position of every node. */
  nodes: Point[];
  /** Setting of each fork (by node). */
  forks: Record<number, number>;
  /** Seconds since each fork was switched (a click). */
  switchedAgo: Record<number, number>;
  trains: Train[];
  speed: number;
  landscape: boolean;
  score: number;
  time: number;
}

export const FORK_RADIUS = 56;
const GAP_START = 4.2;
const GAP_END = 2.7;
/** Seconds a train takes from the tunnel to a station. */
const TRIP_SECONDS = 7;

export const edgeLength = (s: TrainSwitchState, e: number): number => {
  const [a, b] = EDGES[e] ?? [0, 0];
  const p = s.nodes[a];
  const q = s.nodes[b];
  return p && q ? Math.hypot(q.x - p.x, q.y - p.y) : 1;
};

/** A train's position (and heading) on screen, `back` units behind its front. */
export function trainPoint(s: TrainSwitchState, t: Train, back = 0): { x: number; y: number; angle: number } {
  let edge = t.edge;
  let along = t.along - back;
  // Behind the start of this edge: on the edge that leads into it.
  while (along < 0) {
    const from = EDGES[edge]?.[0] ?? 0;
    const previous = EDGES.findIndex(([, to]) => to === from);
    if (previous < 0) {
      along = 0;
      break;
    }
    edge = previous;
    along += edgeLength(s, edge);
  }
  const [a, b] = EDGES[edge] ?? [0, 0];
  const p = s.nodes[a] ?? { x: 0, y: 0 };
  const q = s.nodes[b] ?? { x: 0, y: 0 };
  const k = Math.min(1, along / edgeLength(s, edge));
  return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k, angle: Math.atan2(q.y - p.y, q.x - p.x) };
}

export function createTrainSwitch({ arena, duration, params, rng }: GameSetup): MinigameLogic<TrainSwitchState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const landscape = arena.width >= arena.height;
  const top = HUD_SAFE_TOP + 40;
  // Along the line (u, tunnel to stations) and across it (v).
  const at = (u: number, v: number): Point =>
    landscape ? { x: 70 + u * (arena.width - 150), y: top + v * (arena.height - top - 40) } : { x: 50 + v * (arena.width - 100), y: top + 20 + u * (arena.height - top - 140) };
  const nodes = [at(0, 0.5), at(0.3, 0.5), at(0.58, 0.25), at(0.58, 0.75), at(0.95, 0.125), at(0.95, 0.375), at(0.95, 0.625), at(0.95, 0.875)];
  const state: TrainSwitchState = { nodes, forks: { 1: 0, 2: 0, 3: 1 }, switchedAgo: { 1: 9, 2: 9, 3: 9 }, trains: [], speed: 0, landscape, score: 0, time: 0 };
  state.speed = ((edgeLength(state, 0) + edgeLength(state, 1) + edgeLength(state, 3)) / TRIP_SECONDS) * factor;
  let nextTrain = 1;
  let last = -1;

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
      for (const n of FORK_NODES) state.switchedAgo[n] = (state.switchedAgo[n] ?? 9) + dt;
      for (const tap of input.taps) {
        for (const n of FORK_NODES) {
          const p = nodes[n];
          if (!p || Math.hypot(p.x - tap.x, p.y - tap.y) > FORK_RADIUS * 1.3) continue;
          state.forks[n] = 1 - (state.forks[n] ?? 0);
          state.switchedAgo[n] = 0;
          events.push({ type: 'action', ...p });
        }
      }
      nextTrain -= dt;
      if (nextTrain <= 0) {
        let colour = rng.int(0, 3);
        if (colour === last && rng.chance(0.6)) colour = (colour + rng.int(1, 3)) % 4;
        last = colour;
        state.trains.push({ colour, edge: 0, along: 0, arrived: -1, right: false });
        nextTrain += (GAP_START + (GAP_END - GAP_START) * Math.min(1, state.time / duration)) / factor;
      }
      for (const t of state.trains) {
        if (t.arrived >= 0) {
          t.arrived += dt;
          continue;
        }
        t.along += state.speed * dt;
        const length = edgeLength(state, t.edge);
        if (t.along < length) continue;
        const node = EDGES[t.edge]?.[1] ?? 0;
        const fork = FORKS[node];
        if (fork) {
          t.along -= length;
          t.edge = fork[state.forks[node] ?? 0] ?? fork[0];
          continue;
        }
        t.along = length;
        t.arrived = 0;
        t.right = node - STATION_NODE === t.colour;
        const p = nodes[node] ?? { x: 0, y: 0 };
        if (t.right) {
          state.score += 1;
          events.push({ type: 'score', ...p });
        } else {
          if (state.score > 0) state.score -= 1;
          events.push({ type: 'hit', ...p });
        }
      }
      state.trains = state.trains.filter((t) => t.arrived < 1.2);
    },
  };
}

/** The fork setting at `node` that sends a train of `colour` on its way, or null if its way does not pass there. */
export function wantedSetting(node: number, colour: number): number | null {
  if (node === 1) return colour < 2 ? 0 : 1;
  if (node === 2) return colour === 0 ? 0 : colour === 1 ? 1 : null;
  if (node === 3) return colour === 2 ? 0 : colour === 3 ? 1 : null;
  return null;
}

/** Good play: set each fork for the nearest train heading into it, one tap per decision. */
export function trainSwitchBot(state: TrainSwitchState, _context: BotContext): BotMove {
  let best: { node: number; left: number } | null = null;
  for (const node of FORK_NODES) {
    // Only the train that reaches this fork first matters now.
    let first: { train: Train; left: number } | null = null;
    for (const t of state.trains) {
      if (t.arrived >= 0 || EDGES[t.edge]?.[1] !== node) continue;
      const left = edgeLength(state, t.edge) - t.along;
      if (!first || left < first.left) first = { train: t, left };
    }
    if (!first || state.forks[node] === wantedSetting(node, first.train.colour)) continue;
    if (!best || first.left < best.left) best = { node, left: first.left };
  }
  const p = best ? state.nodes[best.node] : undefined;
  return p ? { tap: { x: p.x, y: p.y } } : {};
}
