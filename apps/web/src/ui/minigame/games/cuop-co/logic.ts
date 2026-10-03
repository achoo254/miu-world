// Cướp cờ (capture the flag): a flag stands in the middle of the yard between two teams. The caller holds up a
// picture: when it is the child's own picture she taps to dash for the flag (the other team's runner sets
// off a moment later: too slow and they get it). With the flag she runs home on her own, and her finger
// steers her left and right round the guard who tries to tag her. Home with the flag is a point; tagged, the
// flag goes back to the middle. Tapping when another picture is called makes her stumble a moment.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type FlagPhase = 'call' | 'dash' | 'home' | 'result';
export type FlagResult = 'scored' | 'tagged' | 'beaten' | 'teammate';

export interface Runner extends Point {
  /** Heading somewhere (or standing at its base). */
  running: boolean;
}

export interface FlagState {
  phase: FlagPhase;
  phaseTime: number;
  /** Who is called: 0 the child, 1–2 a teammate. */
  called: number;
  /** Seconds a call waits for its runner. */
  callFor: number;
  homeY: number;
  baseY: number;
  flag: Point;
  /** The flag is in someone's hand: 'child', 'rival', or null on its pole. */
  carrier: 'child' | 'rival' | null;
  child: Runner;
  rival: Runner;
  guard: Point & { dir: number };
  teammate: Runner;
  /** Seconds since the picture was called (the rival runner sets off RIVAL_DELAY after it). */
  sinceCall: number;
  /** Seconds left of a stumble after a wrong tap. */
  stumble: number;
  result: FlagResult | null;
  calls: number;
  score: number;
  time: number;
}

const CHILD_SPEED = 400;
const HOME_SPEED = 250;
const SIDE_SPEED = 520;
const RIVAL_SPEED = 300;
const RIVAL_DELAY = 0.75;
const GUARD_SPEED = 170;
/** How fast the guard steps sideways toward a child with the flag (share of the screen's width a second), and while she dashes. */
const GUARD_CHASE = 0.3;
const GUARD_WATCH = 110;
/** Tagged when the guard is this close. */
export const TAG_DISTANCE = 52;
const STUMBLE = 0.8;
const RESULT_SECONDS = 1.3;
/** A call for the child waits this long for her tap, at most. */
const CALL_SECONDS = 2.6;

export function createCuopCo({ arena, rng }: GameSetup): MinigameLogic<FlagState> {
  const events = eventQueue();
  const baseY = HUD_SAFE_TOP + 40;
  const homeY = arena.height - 60;
  // The flag stands nearer the other team: the way home is the long one, past the guard.
  const middle = { x: arena.width / 2, y: baseY + (homeY - baseY) * 0.38 };
  const childHome = { x: arena.width / 2, y: homeY };
  const state: FlagState = {
    phase: 'call',
    phaseTime: 0,
    called: 0,
    callFor: CALL_SECONDS,
    homeY,
    baseY,
    flag: { ...middle },
    carrier: null,
    child: { ...childHome, running: false },
    rival: { x: arena.width / 2, y: baseY, running: false },
    guard: { x: arena.width * 0.3, y: middle.y + Math.min((homeY - middle.y) * 0.6, 220), dir: 1 },
    teammate: { x: arena.width / 2 - 120, y: homeY, running: false },
    sinceCall: 0,
    stumble: 0,
    result: null,
    calls: 0,
    score: 0,
    time: 0,
  };

  const go = (phase: FlagPhase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };

  const newCall = (): void => {
    state.calls += 1;
    // The child is called more often than not, and always on the first call.
    state.called = state.calls === 1 || rng.chance(0.62) ? 0 : rng.int(1, 2);
    state.callFor = state.called === 0 ? CALL_SECONDS : 2.2;
    Object.assign(state.flag, middle);
    state.carrier = null;
    Object.assign(state.child, childHome, { running: false });
    Object.assign(state.rival, { x: arena.width / 2, y: baseY, running: false });
    Object.assign(state.teammate, { x: arena.width / 2 - 120, y: homeY, running: false });
    state.result = null;
    state.sinceCall = 0;
    go('call');
  };

  const end = (result: FlagResult): void => {
    state.result = result;
    if (result === 'scored') {
      state.score += 1;
      events.push({ type: 'score', x: state.child.x, y: state.child.y - 40 });
    } else if (result === 'tagged') events.push({ type: 'hit', x: state.child.x, y: state.child.y });
    else if (result === 'beaten') events.push({ type: 'miss', x: state.flag.x, y: state.flag.y });
    go('result');
  };

  const moveTo = (who: Point, to: Point, speed: number, dt: number): boolean => {
    const dx = to.x - who.x;
    const dy = to.y - who.y;
    const d = Math.hypot(dx, dy);
    if (d <= speed * dt) {
      who.x = to.x;
      who.y = to.y;
      return true;
    }
    who.x += (dx / d) * speed * dt;
    who.y += (dy / d) * speed * dt;
    return false;
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
      state.sinceCall += dt;
      state.stumble = Math.max(0, state.stumble - dt);
      const press = input.pressed;

      // The guard paces across its line; it starts drifting toward the child as she dashes, and lines up with
      // her quickly once she has the flag (still slower than she can sidestep, on any screen).
      const g = state.guard;
      if (state.phase === 'dash' || state.phase === 'home') {
        const want = state.child.x - g.x;
        const speed = state.phase === 'home' ? arena.width * GUARD_CHASE : GUARD_WATCH;
        g.x += Math.sign(want) * Math.min(Math.abs(want), speed * dt);
      } else {
        g.x += g.dir * GUARD_SPEED * dt;
        if (g.x < 60 || g.x > arena.width - 60) g.dir *= -1;
      }

      switch (state.phase) {
        case 'call': {
          if (state.called !== 0) {
            // A teammate's turn: they run out and back; the child should wait.
            if (press) {
              state.stumble = STUMBLE;
              events.push({ type: 'miss', x: state.child.x, y: state.child.y });
            }
            const t = state.teammate;
            t.running = true;
            if (state.phaseTime < 1) moveTo(t, middle, 300, dt);
            else moveTo(t, { x: arena.width / 2 - 120, y: homeY }, 300, dt);
            if (state.phaseTime >= state.callFor) {
              state.result = 'teammate';
              go('result');
            }
            break;
          }
          if (press && state.stumble <= 0) {
            state.child.running = true;
            events.push({ type: 'action', x: state.child.x, y: state.child.y });
            go('dash');
            break;
          }
          if (state.sinceCall >= RIVAL_DELAY) state.rival.running = true;
          if (state.rival.running && moveTo(state.rival, state.flag, RIVAL_SPEED, dt)) {
            state.carrier = 'rival';
            end('beaten');
          }
          if (state.phaseTime >= state.callFor && state.phase === 'call') end('beaten');
          break;
        }
        case 'dash': {
          if (state.sinceCall >= RIVAL_DELAY) state.rival.running = true;
          const rivalThere = state.rival.running && moveTo(state.rival, state.flag, RIVAL_SPEED, dt);
          const childThere = moveTo(state.child, state.flag, CHILD_SPEED, dt);
          if (childThere) {
            state.carrier = 'child';
            events.push({ type: 'action', x: state.flag.x, y: state.flag.y });
            go('home');
          } else if (rivalThere) {
            state.carrier = 'rival';
            end('beaten');
          }
          break;
        }
        case 'home': {
          const c = state.child;
          // Down toward home on her own; the finger (or a tap) steers her left and right.
          const steer = input.pointer?.x ?? input.taps.at(-1)?.x;
          if (steer !== undefined) {
            // Kept off the very edges so the flag in her hand stays on screen.
            const want = Math.min(arena.width - 70, Math.max(50, steer)) - c.x;
            c.x += Math.sign(want) * Math.min(Math.abs(want), SIDE_SPEED * dt);
          }
          c.y += HOME_SPEED * dt;
          Object.assign(state.flag, { x: c.x + 24, y: c.y - 40 });
          // The rival runner, empty-handed, goes back.
          moveTo(state.rival, { x: arena.width / 2, y: baseY }, RIVAL_SPEED, dt);
          if (Math.hypot(g.x - c.x, g.y - c.y) < TAG_DISTANCE) {
            Object.assign(state.flag, middle);
            state.carrier = null;
            end('tagged');
          } else if (c.y >= homeY) {
            c.y = homeY;
            end('scored');
          }
          break;
        }
        case 'result':
          if (state.carrier === 'rival') {
            moveTo(state.rival, { x: arena.width / 2, y: baseY }, RIVAL_SPEED, dt);
            Object.assign(state.flag, { x: state.rival.x + 24, y: state.rival.y - 40 });
          }
          if (state.phaseTime >= RESULT_SECONDS) newCall();
          break;
      }
    },
  };
}

/** Good play: dash the moment her picture is called, then run home on the side away from the guard. */
export function cuopCoBot(state: FlagState, context: BotContext): BotMove {
  if (state.phase === 'call') return state.called === 0 && state.stumble <= 0 ? { tap: { x: context.arena.width / 2, y: context.arena.height - 100 } } : {};
  if (state.phase !== 'home') return {};
  const c = state.child;
  const g = state.guard;
  if (c.y > g.y + TAG_DISTANCE) return { touch: { x: c.x, y: c.y } };
  // Run for the edge on the side of the guard she is already on (the far side when they are level).
  const goLeft = c.x < g.x || (c.x === g.x && g.x > context.arena.width / 2);
  return { touch: { x: goLeft ? 40 : context.arena.width - 40, y: c.y } };
}
