// Gear train: a windmill's crank turns on the left and a millstone waits on the right, with empty pegs between.
// The child drags gears (small and big) from the tray onto the pegs. Two gears turn each other only when their
// teeth just touch, so each peg needs the right size; a gear that would overlap another will not go on. When a
// chain of gears joins the crank to the millstone, it turns: a point, and the next machine. Gears can be lifted
// off again. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SMALL = 46;
export const BIG = 70;
export const END_RADIUS = 50;
/** Teeth mesh when the gap between centres is this close to the sum of the radii. */
const MESH = 9;
const SNAP = 55;
const DONE_SECONDS = 1.6;
/** Gears waiting in the tray are drawn (and touched) a little smaller so they fit. */
export const TRAY_SCALE = 0.72;

export interface Peg extends Point {
  /** Size of gear on it (0 = empty). */
  gear: number;
  /** Right size for the chain (0 for a spare peg). */
  wants: number;
}

export interface TrayGear extends Point {
  r: number;
  /** On a peg now (index), or -1 in the tray. */
  on: number;
}

export interface GearState {
  crank: Point;
  mill: Point;
  pegs: Peg[];
  tray: TrayGear[];
  /** Gear held by the finger (index into tray), and where. */
  held: number;
  heldAt: Point | null;
  /** Crank turn (radians). */
  turn: number;
  /** Pegs whose gear turns with the crank, with direction (+1/-1); mill included as index -2 when reached. */
  driven: Map<number, number>;
  millTurning: boolean;
  rejectedAgo: number;
  doneAgo: number;
  machines: number;
  score: number;
  time: number;
}

const meshes = (a: Point, ra: number, b: Point, rb: number): boolean => Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - (ra + rb)) <= MESH;
const overlaps = (a: Point, ra: number, b: Point, rb: number): boolean => Math.hypot(a.x - b.x, a.y - b.y) < ra + rb - MESH;

/** Which pegs turn with the crank (and which way), and whether the mill does. */
export function drive(state: Pick<GearState, 'crank' | 'mill' | 'pegs'>): { driven: Map<number, number>; mill: boolean } {
  const driven = new Map<number, number>();
  const queue: Array<{ at: Point; r: number; dir: number }> = [{ at: state.crank, r: END_RADIUS, dir: 1 }];
  let mill = false;
  for (let q = queue.shift(); q; q = queue.shift()) {
    state.pegs.forEach((p, i) => {
      if (p.gear > 0 && !driven.has(i) && meshes(q.at, q.r, p, p.gear)) {
        driven.set(i, -q.dir);
        queue.push({ at: p, r: p.gear, dir: -q.dir });
      }
    });
    if (q.at !== state.crank && meshes(q.at, q.r, state.mill, END_RADIUS)) mill = true;
  }
  return { driven, mill };
}

interface Machine {
  crank: Point;
  mill: Point;
  pegs: Peg[];
}

function makeMachine(rng: Rng, area: { x0: number; x1: number; y0: number; y1: number }, tall: boolean): Machine {
  const inside = (p: Point, r: number): boolean => p.x - r >= area.x0 && p.x + r <= area.x1 && p.y - r >= area.y0 && p.y + r <= area.y1;
  for (let tries = 0; tries < 400; tries += 1) {
    const links = rng.int(2, 3);
    const crank = tall ? { x: area.x0 + END_RADIUS + 10, y: area.y0 + END_RADIUS + rng.range(10, 80) } : { x: area.x0 + END_RADIUS + 10, y: rng.range(area.y0 + 90, area.y1 - 90) };
    const base = tall ? Math.PI / 4 : 0;
    const chain: Array<Point & { r: number }> = [{ ...crank, r: END_RADIUS }];
    let ok = true;
    for (let k = 0; k <= links && ok; k += 1) {
      const last = chain.at(-1) ?? chain[0];
      if (!last) break;
      const r = k === links ? END_RADIUS : rng.chance(0.5) ? SMALL : BIG;
      const a = base + rng.range(-0.9, 0.9);
      const next = { x: last.x + Math.cos(a) * (last.r + r), y: last.y + Math.sin(a) * (last.r + r), r };
      // Clear of every gear but the one it turns.
      if (!inside(next, r) || chain.slice(0, -1).some((g) => Math.hypot(g.x - next.x, g.y - next.y) < g.r + r + 14)) ok = false;
      chain.push(next);
    }
    if (!ok) continue;
    const mill = chain.at(-1);
    if (!mill) continue;
    const pegs: Peg[] = chain.slice(1, -1).map((g) => ({ x: g.x, y: g.y, gear: 0, wants: g.r }));
    // A spare peg off the chain, to make her think.
    for (let n = 0; n < 30; n += 1) {
      const spare = { x: rng.range(area.x0 + 50, area.x1 - 50), y: rng.range(area.y0 + 50, area.y1 - 50) };
      if (chain.every((g) => Math.hypot(g.x - spare.x, g.y - spare.y) > g.r + BIG + 20)) {
        pegs.push({ ...spare, gear: 0, wants: 0 });
        break;
      }
    }
    return { crank, mill, pegs };
  }
  const y = (area.y0 + area.y1) / 2;
  const crank = { x: area.x0 + 60, y };
  return { crank, mill: { x: crank.x + END_RADIUS * 2 + SMALL * 2, y }, pegs: [{ x: crank.x + END_RADIUS + SMALL, y, gear: 0, wants: SMALL }] };
}

export function createGearTrain({ arena, rng }: GameSetup): MinigameLogic<GearState> {
  const events = eventQueue();
  const wide = arena.width > arena.height;
  const area = wide ? { x0: 30, x1: arena.width - 190, y0: HUD_SAFE_TOP + 20, y1: arena.height - 20 } : { x0: 20, x1: arena.width - 20, y0: HUD_SAFE_TOP + 20, y1: arena.height - 200 };
  const state: GearState = {
    crank: { x: 0, y: 0 },
    mill: { x: 0, y: 0 },
    pegs: [],
    tray: [],
    held: -1,
    heldAt: null,
    turn: 0,
    driven: new Map(),
    millTurning: false,
    rejectedAgo: 9,
    doneAgo: -1,
    machines: 0,
    score: 0,
    time: 0,
  };

  const traySpot = (i: number): Point => (wide ? { x: arena.width - 90, y: HUD_SAFE_TOP + 75 + i * ((arena.height - HUD_SAFE_TOP - 150) / 3) } : { x: 80 + i * ((arena.width - 160) / 3), y: arena.height - 100 });

  function newMachine(): void {
    const m = makeMachine(rng, area, !wide);
    state.crank = m.crank;
    state.mill = m.mill;
    state.pegs = m.pegs;
    // The sizes the chain needs, plus one spare of the other kind, small ones first.
    const needs = state.pegs.filter((q) => q.wants > 0).map((q) => q.wants);
    const spare = needs.filter((r) => r === SMALL).length > needs.length / 2 ? BIG : SMALL;
    const sizes = [...needs, spare].sort((a, b) => a - b);
    state.tray = sizes.map((r, i) => ({ ...traySpot(i), r, on: -1 }));
    state.held = -1;
    state.doneAgo = -1;
    state.millTurning = false;
    state.driven = new Map();
  }

  function trayHome(g: TrayGear, i: number): void {
    g.on = -1;
    Object.assign(g, traySpot(i));
  }

  function place(i: number, at: Point): void {
    const g = state.tray[i];
    if (!g) return;
    const pegIndex = state.pegs.findIndex((p) => p.gear === 0 && Math.hypot(p.x - at.x, p.y - at.y) <= SNAP);
    const peg = state.pegs[pegIndex];
    const others: Array<Point & { r: number }> = [{ ...state.crank, r: END_RADIUS }, { ...state.mill, r: END_RADIUS }, ...state.pegs.filter((p) => p.gear > 0).map((p) => ({ x: p.x, y: p.y, r: p.gear }))];
    if (!peg || others.some((o) => overlaps(o, o.r, peg, g.r))) {
      trayHome(g, i);
      if (peg) {
        state.rejectedAgo = 0;
        events.push({ type: 'miss', x: peg.x, y: peg.y });
      }
      return;
    }
    peg.gear = g.r;
    g.on = pegIndex;
    g.x = peg.x;
    g.y = peg.y;
    events.push({ type: 'action', x: peg.x, y: peg.y });
    const { driven, mill } = drive(state);
    state.driven = driven;
    if (mill) {
      state.millTurning = true;
      state.doneAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.mill.x, y: state.mill.y - 60 });
    }
  }

  newMachine();

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
      state.turn += dt * 1.6;
      state.rejectedAgo += dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo > DONE_SECONDS) {
          state.machines += 1;
          newMachine();
        }
        return;
      }
      const p = input.pointer;
      if (p && input.pressed && state.held < 0) {
        const i = state.tray.findIndex((g) => Math.hypot(g.x - p.x, g.y - p.y) <= Math.max(g.on < 0 ? g.r * TRAY_SCALE : g.r, 44));
        const g = state.tray[i];
        if (g) {
          if (g.on >= 0) {
            const peg = state.pegs[g.on];
            if (peg) peg.gear = 0;
            g.on = -1;
            state.driven = drive(state).driven;
          }
          state.held = i;
        }
      }
      const g = state.tray[state.held];
      if (p && g) {
        g.x = p.x;
        g.y = p.y;
        state.heldAt = p;
      }
      if (!p && g) {
        place(state.held, { x: g.x, y: g.y });
        state.held = -1;
        state.heldAt = null;
      }
    },
  };
}

/** Good play: fills each chain peg with the size it needs, one gear at a time. */
export function gearBot(state: GearState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const target = state.pegs.find((p) => p.wants > 0 && p.gear !== p.wants);
  if (!target) return {};
  if (target.gear > 0 && state.held < 0) {
    // A wrong gear there: lift it off.
    const wrong = state.tray.find((g) => g.on === state.pegs.indexOf(target));
    return wrong ? { touch: { x: wrong.x, y: wrong.y } } : {};
  }
  const held = state.tray[state.held];
  if (held) {
    if (held.r !== target.wants) return {};
    return Math.hypot(held.x - target.x, held.y - target.y) < 2 ? {} : { touch: { x: target.x, y: target.y } };
  }
  const gear = state.tray.find((g) => g.on < 0 && g.r === target.wants);
  return gear ? { touch: { x: gear.x, y: gear.y } } : {};
}
