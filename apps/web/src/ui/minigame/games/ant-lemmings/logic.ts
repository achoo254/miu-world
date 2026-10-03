// Ant lemmings: ants come out of an anthill one after another and walk straight on, turning round at a wall or
// at an ant standing guard. The nest is one way, past a gap in the ground (two gaps later on); a pond is the
// other way, and the ants set off toward it. The child taps an ant to make it stand guard (the others turn
// round at it), or taps an ant at the edge of a gap to make it lie across as a bridge. Ants that reach the nest
// are home (a point each); ants that fall in a gap or the pond are lost (nothing taken away). When every ant
// of a level is home or lost, the guards and bridges go home too and the next level starts, sometimes mirrored.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

const SPEED = 55;
const SPAWN_GAP = 1.3;
/** Ants this close to a gap's edge, walking toward it, become a bridge when tapped. */
export const BRIDGE_REACH = 70;
const TURN_REACH = 22;
const NEXT_SECONDS = 1;
export const GAP_WIDTH = 56;

export type AntState = 'walk' | 'guard' | 'bridge' | 'home' | 'lost';

export interface Ant {
  x: number;
  dir: -1 | 1;
  state: AntState;
  /** Seconds in its present state (falls, homecomings). */
  since: number;
  /** Where it fell (a gap or the pond), for the drawing. */
  fell: 'gap' | 'pond' | null;
}

export interface Gap {
  x0: number;
  x1: number;
  bridged: boolean;
}

export interface AntLevel {
  /** The side the nest is on (-1 left, 1 right). */
  nestSide: -1 | 1;
  nestX: number;
  spawnX: number;
  pond: { x0: number; x1: number };
  gaps: Gap[];
}

export interface AntsState {
  level: AntLevel;
  ants: Ant[];
  toSpawn: number;
  spawnIn: number;
  groundY: number;
  width: number;
  /** Seconds since the level ended (-1 while playing). */
  ended: number;
  levels: number;
  score: number;
  time: number;
}

export function makeLevel(width: number, n: number, mirrored: boolean): AntLevel {
  const m = (x: number): number => (mirrored ? width - x : x);
  const two = n >= 2;
  const gapA = width * 0.3;
  const gaps: Gap[] = [{ x0: m(gapA - GAP_WIDTH / 2), x1: m(gapA + GAP_WIDTH / 2), bridged: false }];
  if (two) gaps.push({ x0: m(width * 0.15 + 20 - GAP_WIDTH / 2), x1: m(width * 0.15 + 20 + GAP_WIDTH / 2), bridged: false });
  for (const g of gaps) if (g.x0 > g.x1) [g.x0, g.x1] = [g.x1, g.x0];
  const pond = { x0: m(width * 0.82), x1: m(width - 10) };
  if (pond.x0 > pond.x1) [pond.x0, pond.x1] = [pond.x1, pond.x0];
  return { nestSide: mirrored ? 1 : -1, nestX: m(two ? 40 : 55), spawnX: m(width * 0.6), pond, gaps };
}

export function createAntLemmings({ arena, params, rng }: GameSetup): MinigameLogic<AntsState> {
  const perLevel = typeof params.ants === 'number' ? Math.round(Math.min(10, Math.max(4, params.ants))) : 6;
  const events = eventQueue();
  const groundY = Math.max(HUD_SAFE_TOP + 220, arena.height * 0.55);
  const state: AntsState = { level: makeLevel(arena.width, 0, false), ants: [], toSpawn: perLevel, spawnIn: 0.8, groundY, width: arena.width, ended: -1, levels: 1, score: 0, time: 0 };

  function startLevel(): void {
    state.level = makeLevel(arena.width, state.levels, rng.chance(0.5));
    state.ants = [];
    state.toSpawn = perLevel;
    state.spawnIn = 0.8;
    state.ended = -1;
    state.levels += 1;
  }

  const inGap = (x: number): Gap | undefined => state.level.gaps.find((g) => !g.bridged && x > g.x0 + 4 && x < g.x1 - 4);

  function tap(x: number, y: number): void {
    let best: Ant | undefined;
    let bestD = TOUCH_RADIUS * 1.4;
    for (const a of state.ants) {
      if (a.state !== 'walk' && a.state !== 'guard') continue;
      const d = Math.hypot(a.x - x, groundY - 16 - y);
      if (d < bestD) {
        best = a;
        bestD = d;
      }
    }
    if (!best) return;
    if (best.state === 'guard') {
      // A guard tapped again walks on, toward the nest.
      best.state = 'walk';
      best.dir = state.level.nestSide;
      return;
    }
    const ant = best;
    const gap = state.level.gaps.find((g) => !g.bridged && (ant.dir > 0 ? g.x0 - ant.x : ant.x - g.x1) >= -4 && (ant.dir > 0 ? g.x0 - ant.x : ant.x - g.x1) <= BRIDGE_REACH);
    if (gap) {
      ant.state = 'bridge';
      ant.x = (gap.x0 + gap.x1) / 2;
      gap.bridged = true;
      events.push({ type: 'action', x: ant.x, y: groundY });
    } else {
      ant.state = 'guard';
      events.push({ type: 'action', x: ant.x, y: groundY - 20 });
    }
    ant.since = 0;
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
      if (state.ended >= 0) {
        state.ended += dt;
        if (state.ended >= NEXT_SECONDS) startLevel();
        return;
      }
      for (const t of input.taps) tap(t.x, t.y);
      if (state.toSpawn > 0) {
        state.spawnIn -= dt;
        if (state.spawnIn <= 0) {
          state.ants.push({ x: state.level.spawnX, dir: (-state.level.nestSide) as -1 | 1, state: 'walk', since: 0, fell: null });
          state.toSpawn -= 1;
          state.spawnIn = SPAWN_GAP;
        }
      }
      const guards = state.ants.filter((a) => a.state === 'guard');
      for (const a of state.ants) {
        a.since += dt;
        if (a.state !== 'walk') continue;
        a.x += a.dir * SPEED * dt;
        // Turn round at a guard ahead, or at the edge of the screen.
        if (guards.some((g) => (g.x - a.x) * a.dir > 0 && (g.x - a.x) * a.dir < TURN_REACH)) a.dir = (-a.dir) as -1 | 1;
        if (a.x < 12 || a.x > arena.width - 12) a.dir = (-a.dir) as -1 | 1;
        const { pond, nestX } = state.level;
        if (Math.abs(a.x - nestX) < 14) {
          a.state = 'home';
          a.since = 0;
          state.score += 1;
          events.push({ type: 'score', x: nestX, y: groundY - 30 });
        } else if (a.x > pond.x0 + 8 && a.x < pond.x1 - 8) {
          a.state = 'lost';
          a.fell = 'pond';
          a.since = 0;
          events.push({ type: 'miss', x: a.x, y: groundY });
        } else if (inGap(a.x)) {
          a.state = 'lost';
          a.fell = 'gap';
          a.since = 0;
          events.push({ type: 'miss', x: a.x, y: groundY });
        }
      }
      if (state.toSpawn === 0 && !state.ants.some((a) => a.state === 'walk')) {
        // Guards and bridges walk home too.
        const helpers = state.ants.filter((a) => a.state === 'guard' || a.state === 'bridge');
        state.score += helpers.length;
        for (const a of helpers) {
          a.state = 'home';
          a.since = 0;
        }
        if (helpers.length > 0) events.push({ type: 'score', x: state.level.nestX, y: groundY - 30, points: helpers.length });
        state.ended = 0;
      }
    },
  };
}

/** Good play: a guard between the anthill and the pond first, then a bridge at each gap as an ant reaches it. */
export function antLemmingsBot(state: AntsState, _context: BotContext): BotMove {
  if (state.ended >= 0) return {};
  const { level } = state;
  const at = (x: number) => ({ tap: { x, y: state.groundY - 16 } });
  const hasGuard = state.ants.some((a) => a.state === 'guard');
  const away = -level.nestSide;
  if (!hasGuard) {
    const first = state.ants.find((a) => a.state === 'walk' && a.dir === away && (a.x - level.spawnX) * away > 30);
    return first ? at(first.x) : {};
  }
  for (const gap of level.gaps) {
    if (gap.bridged) continue;
    const comer = state.ants.find((a) => a.state === 'walk' && a.dir === level.nestSide && (a.dir > 0 ? gap.x0 - a.x : a.x - gap.x1) >= 0 && (a.dir > 0 ? gap.x0 - a.x : a.x - gap.x1) <= 40);
    if (comer) return at(comer.x);
  }
  return {};
}
