// Knot untangle ("Gỡ rối dây bóng"): a bunch of balloons tied to each other with strings, all in a tangle. The
// child drags balloons around (or taps a balloon, then a spot) until no two strings cross: the strings turn
// green, the bunch floats up (a point) and a new, bigger tangle comes. Crossing strings show red. Every tangle
// can be untangled: it is made by scrambling a bunch that had no crossings. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface KnotState {
  nodes: Point[];
  /** Where each balloon sits in a way with no crossings (the bot's plan). */
  solution: Point[];
  edges: (readonly [number, number])[];
  dragged: number;
  selected: number;
  area: { left: number; top: number; right: number; bottom: number };
  nextIn: number;
  tangles: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.4;
const GRAB = TOUCH_RADIUS + 12;

const cross = (o: Point, a: Point, b: Point): number => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Whether two strings cross (strings sharing a balloon never do). */
export function crosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Indexes of strings that cross another one. */
export function crossingEdges(state: Pick<KnotState, 'nodes' | 'edges'>): Set<number> {
  const out = new Set<number>();
  state.edges.forEach(([a, b], i) => {
    state.edges.forEach(([c, d], j) => {
      if (j <= i || a === c || a === d || b === c || b === d) return;
      const pa = state.nodes[a];
      const pb = state.nodes[b];
      const pc = state.nodes[c];
      const pd = state.nodes[d];
      if (pa && pb && pc && pd && crosses(pa, pb, pc, pd)) {
        out.add(i);
        out.add(j);
      }
    });
  });
  return out;
}

export function createKnotUntangle({ arena, rng }: GameSetup): MinigameLogic<KnotState> {
  const events = eventQueue();
  const area = { left: 50, top: HUD_SAFE_TOP + 40, right: arena.width - 50, bottom: arena.height - 50 };
  const state: KnotState = { nodes: [], solution: [], edges: [], dragged: -1, selected: -1, area, nextIn: 0, tangles: 0, score: 0, time: 0 };
  let pressAt: Point | null = null;

  const deal = (r: Rng): void => {
    const n = Math.min(8, 5 + state.tangles);
    const cx = (area.left + area.right) / 2;
    const cy = (area.top + area.bottom) / 2;
    const rad = Math.min(area.right - area.left, area.bottom - area.top) * 0.42;
    const turn = r.range(0, Math.PI * 2);
    state.solution = Array.from({ length: n }, (_, i) => ({ x: cx + Math.cos(turn + (i * Math.PI * 2) / n) * rad, y: cy + Math.sin(turn + (i * Math.PI * 2) / n) * rad }));
    // A ring plus chords fanning from one balloon: never crossing when the balloons sit round a circle.
    const edges: [number, number][] = Array.from({ length: n }, (_, i) => [i, (i + 1) % n]);
    const hub = r.int(0, n - 1);
    for (let k = 2; k < n - 1; k += 1) if (r.chance(0.7)) edges.push([hub, (hub + k) % n]);
    state.edges = edges;
    // Scramble until enough strings cross.
    for (let tries = 0; tries < 50; tries += 1) {
      state.nodes = state.solution.map(() => ({ x: r.range(area.left, area.right), y: r.range(area.top, area.bottom) }));
      if (crossingEdges(state).size >= 4) break;
    }
    state.dragged = -1;
    state.selected = -1;
  };

  const nodeAt = (p: Point): number => {
    let best = -1;
    let bestD = GRAB;
    state.nodes.forEach((q, i) => {
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };
  const clamp = (p: Point): Point => ({ x: Math.min(area.right, Math.max(area.left, p.x)), y: Math.min(area.bottom, Math.max(area.top, p.y)) });
  const check = (): void => {
    if (crossingEdges(state).size > 0) return;
    state.score += 1;
    state.nextIn = NEXT_SECONDS;
    events.push({ type: 'score', x: arena.width / 2, y: area.top + 40 });
  };

  deal(rng);

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
      if (state.nextIn > 0) {
        for (const n of state.nodes) n.y -= 300 * dt;
        state.nextIn -= dt;
        if (state.nextIn <= 0) {
          state.tangles += 1;
          deal(rng);
        }
        return;
      }
      const tap = input.taps[0];
      if (input.pressed) {
        const at = input.pointer ?? tap;
        if (at) {
          pressAt = at;
          state.dragged = nodeAt(at);
        }
      }
      const held = state.nodes[state.dragged];
      if (held && input.pointer) Object.assign(held, clamp(input.pointer));
      if (!input.released) return;
      const end = input.pointer ?? (held ? { ...held } : (tap ?? null));
      const moved = pressAt && end ? Math.hypot(end.x - pressAt.x, end.y - pressAt.y) > 24 : false;
      if (moved && held) {
        events.push({ type: 'action', x: held.x, y: held.y });
        state.selected = -1;
        check();
      } else if (tap) {
        const index = nodeAt(tap);
        if (index >= 0) state.selected = index === state.selected ? -1 : index;
        else if (state.selected >= 0) {
          const node = state.nodes[state.selected];
          if (node) Object.assign(node, clamp(tap));
          events.push({ type: 'action', x: tap.x, y: tap.y });
          state.selected = -1;
          check();
        }
      }
      state.dragged = -1;
      pressAt = null;
    },
  };
}

/** Good play: drag balloons one by one to their places round a circle. */
export function knotBot(state: KnotState, _context: BotContext): BotMove {
  if (state.nextIn > 0) return {};
  const held = state.nodes[state.dragged];
  const goal = state.solution[state.dragged];
  if (held && goal) return Math.hypot(held.x - goal.x, held.y - goal.y) > 3 ? { touch: goal } : {};
  const i = state.nodes.findIndex((n, k) => {
    const s = state.solution[k];
    return s && Math.hypot(n.x - s.x, n.y - s.y) > 3;
  });
  const node = state.nodes[i];
  // Avoid grabbing a balloon that sits on top of another one.
  return node ? { touch: { ...node } } : {};
}
