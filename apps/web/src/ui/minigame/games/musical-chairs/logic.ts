// Musical chairs: the child and four friends walk round a ring of four chairs while a tune plays. When the
// music stops ("DỪNG!") everyone dashes for a chair: the child taps an empty one to sit. The friends react a
// moment later (quicker every round), so a quick tap wins the round; a tap while the music still plays makes
// her stumble for a second (longer if she keeps tapping), so tapping all the time does not work. One chair short every round: whoever is
// left standing just waits for the next tune. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type ChairsPhase = 'music' | 'scramble' | 'result';

export interface Walker {
  /** Angle on the walking ring (radians), and where it is drawn. */
  angle: number;
  x: number;
  y: number;
  /** The chair it is heading for or sits on (-1: none), and seconds until it reacts to the stop. */
  chair: number;
  react: number;
  seated: boolean;
}

export interface ChairsState {
  phase: ChairsPhase;
  phaseTime: number;
  /** Seconds the current tune plays before it stops. */
  tuneLength: number;
  centre: Point;
  walkRadius: number;
  chairs: Point[];
  /** Who sits on each chair: -1 nobody, 0 the child, 1.. a friend. */
  occupant: number[];
  /** walkers[0] is the child. */
  walkers: Walker[];
  /** Seconds the child is still stumbling after tapping too early. */
  stumble: number;
  /** The last round's outcome for the child. */
  won: boolean | null;
  round: number;
  score: number;
  time: number;
}

export const CHAIRS = 4;
const FRIENDS = 4;
/** Hit radius of a chair: bigger than the picture. */
export const CHAIR_HIT = 62;
const WALK_SPEED = 0.9;
const DASH_SECONDS = 0.22;
const STUMBLE_SECONDS = 1.0;
const RESULT_SECONDS = 1.5;
/** A friend's reaction to the stop, at the first round and from round 6 on (seconds, plus a random spread). */
const REACT_FIRST = 0.8;
const REACT_LAST = 0.5;
const REACT_SPREAD = 0.4;
/** The tune, a bar of a children's song in C (MIDI), one note every NOTE_SECONDS. */
const TUNE = [60, 64, 67, 64, 65, 69, 67, 64, 62, 65, 64, 62, 60, 62, 64, 60] as const;
const NOTE_SECONDS = 0.3;

export function createMusicalChairs({ arena, rng }: GameSetup): MinigameLogic<ChairsState> {
  const events = eventQueue();
  const playTop = HUD_SAFE_TOP + 20;
  const span = Math.min(arena.width, arena.height - playTop);
  const centre = { x: arena.width / 2, y: playTop + (arena.height - playTop) / 2 };
  const walkRadius = span * 0.37;
  const chairRadius = walkRadius * 0.52;
  const chairs = Array.from({ length: CHAIRS }, (_, i) => {
    const a = Math.PI / 4 + (i * Math.PI * 2) / CHAIRS;
    return { x: centre.x + Math.cos(a) * chairRadius, y: centre.y + Math.sin(a) * chairRadius };
  });
  const walkers: Walker[] = Array.from({ length: FRIENDS + 1 }, (_, i) => ({ angle: (i * Math.PI * 2) / (FRIENDS + 1), x: 0, y: 0, chair: -1, react: 0, seated: false }));
  const state: ChairsState = {
    phase: 'music',
    phaseTime: 0,
    tuneLength: rng.range(2.6, 4.8),
    centre,
    walkRadius,
    chairs,
    occupant: chairs.map(() => -1),
    walkers,
    stumble: 0,
    won: null,
    round: 0,
    score: 0,
    time: 0,
  };
  let noteIndex = 0;
  let nextNote = 0;

  const placeOnRing = (w: Walker): void => {
    w.x = centre.x + Math.cos(w.angle) * walkRadius;
    w.y = centre.y + Math.sin(w.angle) * walkRadius;
  };
  walkers.forEach(placeOnRing);

  const nearestFree = (from: Point, taken: ReadonlySet<number>): number => {
    let best = -1;
    let bestDistance = Infinity;
    state.chairs.forEach((c, i) => {
      if (state.occupant[i] !== -1 || taken.has(i)) return;
      const d = Math.hypot(c.x - from.x, c.y - from.y);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  };

  const seat = (who: number, chair: number): void => {
    state.occupant[chair] = who;
    const w = state.walkers[who];
    if (w) {
      w.chair = chair;
      w.seated = true;
    }
  };

  const endRound = (won: boolean): void => {
    state.won = won;
    state.phase = 'result';
    state.phaseTime = 0;
    if (won) {
      state.score += 1;
      const chair = state.chairs[state.walkers[0]?.chair ?? 0] ?? centre;
      events.push({ type: 'score', x: chair.x, y: chair.y - 50 });
    } else {
      const child = state.walkers[0];
      events.push({ type: 'miss', x: child?.x ?? centre.x, y: child?.y ?? centre.y });
    }
  };

  const startRound = (): void => {
    state.round += 1;
    state.phase = 'music';
    state.phaseTime = 0;
    state.tuneLength = rng.range(2.4, 5.2);
    state.occupant = state.chairs.map(() => -1);
    state.won = null;
    for (const w of state.walkers) {
      w.chair = -1;
      w.seated = false;
      placeOnRing(w);
    }
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
      state.phaseTime += dt;
      state.stumble = Math.max(0, state.stumble - dt);
      const child = state.walkers[0];
      if (!child) return;
      // A touch counts the moment the finger goes down (a quick tap has already lifted by then).
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;

      if (state.phase === 'music') {
        for (const w of state.walkers) {
          w.angle += WALK_SPEED * dt;
          placeOnRing(w);
        }
        nextNote -= dt;
        if (nextNote <= 0) {
          nextNote += NOTE_SECONDS;
          events.push({ type: 'action', x: -200, y: -200, note: TUNE[noteIndex % TUNE.length] ?? 60, voice: 'piano' });
          noteIndex += 1;
        }
        // Tapping before the music stops: a stumble, so tapping all the time never wins.
        if (press) state.stumble = STUMBLE_SECONDS;
        if (state.phaseTime >= state.tuneLength) {
          state.phase = 'scramble';
          state.phaseTime = 0;
          const progress = Math.min(1, state.round / 5);
          const base = REACT_FIRST + (REACT_LAST - REACT_FIRST) * progress;
          for (const w of state.walkers.slice(1)) w.react = base + rng.range(0, REACT_SPREAD);
          events.push({ type: 'action', x: centre.x, y: centre.y, note: 84, voice: 'whistle' });
        }
        return;
      }

      if (state.phase === 'scramble') {
        // The child: a tap on an empty chair, once she is not stumbling.
        // Still stumbling: another tap only keeps her stumbling.
        if (press && !child.seated && state.stumble > 0) state.stumble = STUMBLE_SECONDS;
        else if (press && !child.seated) {
          const hit = state.chairs.findIndex((c, i) => state.occupant[i] === -1 && Math.hypot(c.x - press.x, c.y - press.y) <= CHAIR_HIT);
          if (hit >= 0) {
            seat(0, hit);
            events.push({ type: 'action', x: state.chairs[hit]?.x ?? 0, y: state.chairs[hit]?.y ?? 0 });
          }
        }
        // The friends: each dashes for the nearest empty chair once it has reacted.
        const aimed = new Set<number>();
        state.walkers.forEach((w, who) => {
          if (who === 0 || w.seated) return;
          if (state.phaseTime < w.react) return;
          if (w.chair < 0 || state.occupant[w.chair] !== -1) w.chair = nearestFree(w, aimed);
          if (w.chair < 0) return;
          aimed.add(w.chair);
          if (state.phaseTime >= w.react + DASH_SECONDS) seat(who, w.chair);
        });
        // Positions: seated players sit on their chair (with a quick dash there).
        for (const w of state.walkers) {
          const c = w.chair >= 0 ? state.chairs[w.chair] : undefined;
          if (!c) continue;
          const k = Math.min(1, dt / 0.08);
          w.x += (c.x - w.x) * k;
          w.y += (c.y - w.y) * k;
        }
        if (child.seated) endRound(true);
        else if (state.occupant.every((o) => o !== -1)) endRound(false);
        return;
      }

      // Result: everyone settles, then the next tune.
      for (const w of state.walkers) {
        const c = w.chair >= 0 && w.seated ? state.chairs[w.chair] : undefined;
        if (!c) continue;
        w.x += (c.x - w.x) * Math.min(1, dt / 0.08);
        w.y += (c.y - w.y) * Math.min(1, dt / 0.08);
      }
      if (state.phaseTime >= RESULT_SECONDS) startRound();
    },
  };
}

/** Good play: wait for the stop, then tap the empty chair nearest to the child. */
export function musicalChairsBot(state: ChairsState, _context: BotContext): BotMove {
  if (state.phase !== 'scramble' || state.stumble > 0) return {};
  const child = state.walkers[0];
  if (!child || child.seated) return {};
  let best: Point | null = null;
  let bestDistance = Infinity;
  state.chairs.forEach((c, i) => {
    if (state.occupant[i] !== -1) return;
    const d = Math.hypot(c.x - child.x, c.y - child.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = c;
    }
  });
  return best ? { tap: best } : {};
}
