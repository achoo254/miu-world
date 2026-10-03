// Path guide: ducklings wander in from the edges, each wearing a coloured bow. The child draws a path from a
// duckling (press on it and drag) to the pen of the same colour, and it waddles along the path. A duckling
// in its own pen is a point; a wrong pen turns it away. Two ducklings that bump sit dizzy for a moment.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Pen {
  colour: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Duckling {
  id: number;
  colour: number;
  x: number;
  y: number;
  /** Heading (radians) when not on a path. */
  heading: number;
  path: Point[];
  /** Seconds of dizziness left, and seconds since it got home (-1: not yet). */
  dizzy: number;
  home: number;
}

export interface PathGuideState {
  pens: Pen[];
  ducks: Duckling[];
  /** The duckling a path is being drawn for. */
  drawing: number | null;
  fingerDown: boolean;
  score: number;
  time: number;
}

/** Walking speed on an iPad; a taller or wider field walks a little faster, so the way home takes as long. */
const SPEED = 70;
const GRAB = Math.max(TOUCH_RADIUS * 1.6, 70);
const BUMP = 46;
const DIZZY = 3;
const POINT_GAP = 18;
const MAX_DUCKS = 7;

export const inPen = (pen: Pen, p: Point): boolean => Math.abs(p.x - pen.x) < pen.w / 2 && Math.abs(p.y - pen.y) < pen.h / 2;

export function createPathGuide({ arena, duration, rng }: GameSetup): MinigameLogic<PathGuideState> {
  const events = eventQueue();
  const w = 170;
  const h = 120;
  const bottom = arena.height - h / 2 - 20;
  const pens: Pen[] = [
    { colour: 0, x: w / 2 + 20, y: bottom, w, h },
    { colour: 1, x: arena.width - w / 2 - 20, y: bottom, w, h },
    { colour: 2, x: arena.width / 2, y: HUD_SAFE_TOP + h / 2 + 10, w, h },
  ];
  const state: PathGuideState = { pens, ducks: [], drawing: null, fingerDown: false, score: 0, time: 0 };
  let nextId = 0;
  let nextSpawn = 0;
  const middleY = (HUD_SAFE_TOP + h + arena.height - h) / 2;

  function spawn(): void {
    if (state.ducks.filter((d) => d.home < 0).length >= MAX_DUCKS) return;
    const fromLeft = rng.chance(0.5);
    const y = rng.range(middleY - arena.height * 0.15, middleY + arena.height * 0.15);
    state.ducks.push({ id: (nextId += 1), colour: rng.int(0, 2), x: fromLeft ? -20 : arena.width + 20, y, heading: (fromLeft ? 0 : Math.PI) + rng.range(-0.4, 0.4), path: [], dizzy: 0, home: -1 });
  }

  const speed = SPEED * Math.max(1, Math.max(arena.width, arena.height) / 900);
  function walk(d: Duckling, dt: number): void {
    let left = speed * dt;
    while (left > 0 && d.path.length > 0) {
      const p = d.path[0];
      if (!p) break;
      const dist = Math.hypot(p.x - d.x, p.y - d.y);
      if (dist <= left) {
        d.heading = Math.atan2(p.y - d.y, p.x - d.x);
        d.x = p.x;
        d.y = p.y;
        left -= dist;
        d.path.shift();
      } else {
        d.heading = Math.atan2(p.y - d.y, p.x - d.x);
        d.x += ((p.x - d.x) / dist) * left;
        d.y += ((p.y - d.y) / dist) * left;
        left = 0;
      }
    }
    if (left > 0) {
      d.x += Math.cos(d.heading) * left;
      d.y += Math.sin(d.heading) * left;
    }
    // Keep inside the field: turn back from the edges (once fully in).
    const margin = 30;
    if ((d.x < margin && Math.cos(d.heading) < 0) || (d.x > arena.width - margin && Math.cos(d.heading) > 0)) d.heading = Math.PI - d.heading;
    if ((d.y < HUD_SAFE_TOP + margin && Math.sin(d.heading) < 0) || (d.y > arena.height - margin && Math.sin(d.heading) > 0)) d.heading = -d.heading;
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
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        spawn();
        nextSpawn = 3.6 - 1.4 * Math.min(1, state.time / duration);
      }
      // Drawing: press on a duckling, drag, and the path is its from then on.
      const p = input.pointer;
      state.fingerDown = p !== null;
      if (p && input.pressed) {
        const near = state.ducks.filter((d) => d.home < 0 && Math.hypot(d.x - p.x, d.y - p.y) < GRAB).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
        if (near) {
          state.drawing = near.id;
          near.path = [];
        }
      }
      const drawing = state.ducks.find((d) => d.id === state.drawing);
      if (p && drawing) {
        const last = drawing.path[drawing.path.length - 1] ?? drawing;
        const gap = Math.hypot(p.x - last.x, p.y - last.y);
        // Long jumps (a fast finger) are filled in so the path stays smooth.
        for (let i = 1; i <= Math.floor(gap / POINT_GAP); i += 1) drawing.path.push({ x: last.x + ((p.x - last.x) * i * POINT_GAP) / gap, y: last.y + ((p.y - last.y) * i * POINT_GAP) / gap });
      }
      if (!p) state.drawing = null;

      for (const d of state.ducks) {
        if (d.home >= 0) {
          d.home += dt;
          continue;
        }
        if (d.dizzy > 0) {
          d.dizzy -= dt;
          continue;
        }
        walk(d, dt);
        const pen = state.pens.find((pn) => inPen(pn, d));
        if (pen && pen.colour === d.colour) {
          d.home = 0;
          d.path = [];
          state.score += 1;
          events.push({ type: 'score', x: d.x, y: d.y });
        } else if (pen) {
          // The wrong pen: turned back out.
          d.path = [];
          d.heading = Math.atan2(d.y - pen.y, d.x - pen.x);
          d.x += Math.cos(d.heading) * 12;
          d.y += Math.sin(d.heading) * 12;
          events.push({ type: 'miss', x: d.x, y: d.y });
        }
      }
      // Bumps.
      const walking = state.ducks.filter((d) => d.home < 0 && d.dizzy <= 0 && d.x > 0 && d.x < arena.width);
      for (let i = 0; i < walking.length; i += 1) {
        for (let j = i + 1; j < walking.length; j += 1) {
          const a = walking[i];
          const b = walking[j];
          if (!a || !b || a.dizzy > 0 || b.dizzy > 0 || Math.hypot(a.x - b.x, a.y - b.y) > BUMP) continue;
          for (const d of [a, b]) {
            d.dizzy = DIZZY;
            d.path = [];
            if (state.drawing === d.id) state.drawing = null;
          }
          // They turn away from each other when they get up.
          a.heading = Math.atan2(a.y - b.y, a.x - b.x);
          b.heading = a.heading + Math.PI;
          events.push({ type: 'hit', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        }
      }
      state.ducks = state.ducks.filter((d) => d.home < 0.5);
    },
  };
}

/** Good play: draw a straight path from the duckling nearest its pen into the middle of that pen. */
export function pathGuideBot(state: PathGuideState, context: BotContext): BotMove {
  const drawing = state.ducks.find((d) => d.id === state.drawing);
  if (drawing) {
    const pen = state.pens.find((p) => p.colour === drawing.colour);
    const last = drawing.path[drawing.path.length - 1] ?? drawing;
    if (!pen) return {};
    const d = Math.hypot(pen.x - last.x, pen.y - last.y);
    if (d < 10) return {};
    const step = Math.min(d, 160);
    return { touch: { x: last.x + ((pen.x - last.x) / d) * step, y: last.y + ((pen.y - last.y) / d) * step } };
  }
  // Lift the finger first if it is still down from a path that got cut short.
  if (state.fingerDown) return {};
  const candidates = state.ducks.filter((d) => d.home < 0 && d.dizzy <= 0 && d.path.length === 0 && d.x > 20 && d.x < context.arena.width - 20);
  // The one closest to its pen first: short paths cross less.
  const distance = (d: { x: number; y: number; colour: number }): number => {
    const pen = state.pens.find((p) => p.colour === d.colour);
    return pen ? Math.hypot(pen.x - d.x, pen.y - d.y) : Infinity;
  };
  const pick = candidates.sort((a, b) => distance(a) - distance(b))[0];
  return pick ? { touch: { x: pick.x, y: pick.y } } : {};
}
