// Slot cars: two toy cars race three laps round an oval track, each in its own slot. Holding the screen
// speeds the child's car up, letting go slows it down. On the straights she can go flat out; going into a
// bend too fast flings the car off the track, and it is put back on the slot a second later, standing.
// Score: laps she finishes; the race ends when either car has done three, so the goal (three) means beating
// the other car. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const LAPS = 3;
const ACCEL = 420;
const BRAKE = 600;
export const TOP_SPEED = 620;
/** Faster than this in a bend and the car flies off. */
export const BEND_SPEED = 330;
const CRASH_SECONDS = 1;
const RIVAL_STRAIGHT = 470;
const RIVAL_BEND = 300;

export interface Car {
  /** Distance along its slot this lap, and laps done. */
  d: number;
  laps: number;
  speed: number;
  /** Seconds since it flew off (-1: on the track). */
  crashed: number;
}

export interface SlotCarsState {
  cx: number;
  cy: number;
  /** Half the length of a straight, and the radius of the middle of the track. */
  half: number;
  radius: number;
  /** The track runs left–right on a wide screen, up–down on a tall one. */
  vertical: boolean;
  /** Each car's slot radius: the child inside, the other car outside. */
  childR: number;
  rivalR: number;
  child: Car;
  rival: Car;
  holding: boolean;
  finished: 'child' | 'rival' | null;
  score: number;
  time: number;
}

export const lapLength = (state: SlotCarsState, r: number): number => 4 * state.half + 2 * Math.PI * r;

/** Where along a slot of radius r the distance d is: on a bend or not, and how far until the next bend. */
export function section(state: SlotCarsState, r: number, d: number): { bend: boolean; toBend: number } {
  const straight = 2 * state.half;
  const bend = Math.PI * r;
  const at = ((d % lapLength(state, r)) + lapLength(state, r)) % lapLength(state, r);
  if (at < straight) return { bend: false, toBend: straight - at };
  if (at < straight + bend) return { bend: true, toBend: 0 };
  if (at < 2 * straight + bend) return { bend: false, toBend: 2 * straight + bend - at };
  return { bend: true, toBend: 0 };
}

/** Screen position and heading of a car at distance d on a slot of radius r. */
export function placeOn(state: SlotCarsState, r: number, d: number): Point & { angle: number } {
  const straight = 2 * state.half;
  const bend = Math.PI * r;
  const L = lapLength(state, r);
  const at = ((d % L) + L) % L;
  let x: number;
  let y: number;
  let angle: number;
  if (at < straight) {
    x = -state.half + at;
    y = -r;
    angle = 0;
  } else if (at < straight + bend) {
    const a = -Math.PI / 2 + (at - straight) / r;
    x = state.half + Math.cos(a) * r;
    y = Math.sin(a) * r;
    angle = a + Math.PI / 2;
  } else if (at < 2 * straight + bend) {
    x = state.half - (at - straight - bend);
    y = r;
    angle = Math.PI;
  } else {
    const a = Math.PI / 2 + (at - 2 * straight - bend) / r;
    x = -state.half + Math.cos(a) * r;
    y = Math.sin(a) * r;
    angle = a + Math.PI / 2;
  }
  return state.vertical ? { x: state.cx - y, y: state.cy + x, angle: angle + Math.PI / 2 } : { x: state.cx + x, y: state.cy + y, angle };
}

export function createSlotCars({ arena, params }: GameSetup): MinigameLogic<SlotCarsState> {
  const factor = typeof params.rival === 'number' ? Math.min(1.3, Math.max(0.7, params.rival)) : 1;
  const events = eventQueue();
  const vertical = arena.height > arena.width;
  const long = vertical ? arena.height - HUD_SAFE_TOP - 60 : arena.width - 60;
  const short = vertical ? arena.width - 60 : arena.height - HUD_SAFE_TOP - 60;
  const radius = Math.min(200, short / 2 - 40);
  const state: SlotCarsState = {
    cx: arena.width / 2,
    cy: vertical ? HUD_SAFE_TOP + 30 + long / 2 : HUD_SAFE_TOP + 30 + short / 2,
    half: Math.max(80, Math.min(320, long / 2 - radius - 40)),
    radius,
    vertical,
    childR: radius - 28,
    rivalR: radius + 28,
    child: { d: 0, laps: 0, speed: 0, crashed: -1 },
    rival: { d: 0, laps: 0, speed: 0, crashed: -1 },
    holding: false,
    finished: null,
    score: 0,
    time: 0,
  };

  function advance(car: Car, r: number, dt: number): void {
    car.d += car.speed * dt;
    const L = lapLength(state, r);
    if (car.d >= L) {
      car.d -= L;
      car.laps += 1;
      if (car === state.child) {
        state.score = car.laps;
        events.push({ type: 'score', x: placeOn(state, r, 0).x, y: placeOn(state, r, 0).y });
      }
      if (car.laps >= LAPS && !state.finished) state.finished = car === state.child ? 'child' : 'rival';
    }
  }

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.finished !== null;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.holding = input.pointer !== null && input.pointer.y > HUD_SAFE_TOP;
      const { child, rival } = state;
      if (child.crashed >= 0) {
        child.crashed += dt;
        if (child.crashed >= CRASH_SECONDS) child.crashed = -1;
      } else {
        child.speed = state.holding ? Math.min(TOP_SPEED, child.speed + ACCEL * dt) : Math.max(0, child.speed - BRAKE * dt);
        if (section(state, state.childR, child.d).bend && child.speed > BEND_SPEED) {
          child.crashed = 0;
          child.speed = 0;
          const p = placeOn(state, state.childR, child.d);
          events.push({ type: 'hit', x: p.x, y: p.y });
        } else advance(child, state.childR, dt);
      }
      // The other car drives a steady race: quick on the straights, careful in the bends.
      const s = section(state, state.rivalR, rival.d);
      const want = (s.bend || s.toBend < 60 ? RIVAL_BEND : RIVAL_STRAIGHT) * factor;
      rival.speed += Math.sign(want - rival.speed) * Math.min(Math.abs(want - rival.speed), 500 * dt);
      advance(rival, state.rivalR, dt);
    },
  };
}

/** Good play: flat out on the straights, off the throttle in time to take each bend just under its limit. */
export function slotCarsBot(state: SlotCarsState, context: BotContext): BotMove {
  const car = state.child;
  const s = section(state, state.childR, car.d);
  const hold = { touch: { x: context.arena.width / 2, y: context.arena.height * 0.8 } };
  if (s.bend) return car.speed < BEND_SPEED - 60 ? hold : {};
  // Room to slow down to the bend speed, plus what one more tenth of a second at full throttle adds.
  const needed = Math.max(0, (car.speed * car.speed - BEND_SPEED * BEND_SPEED) / (2 * BRAKE)) + car.speed * 0.15 + 30;
  return s.toBend > needed ? hold : {};
}
