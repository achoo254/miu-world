// Paper route: the child cycles along a street; houses roll by, each with a mailbox at the kerb. A mailbox
// with its red flag up is waiting for the paper: a tap on it throws one, while it is ahead of the bike or
// beside it (once it is behind, it is too late). A delivered box lowers its flag; a throw at a box with its
// flag down just bounces off, no harm done. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Mailbox {
  id: number;
  /** Screen x of the box (it moves with the street). */
  x: number;
  flagUp: boolean;
  /** Seconds since a paper landed in it (-1: none yet). */
  delivered: number;
}

export interface Paper {
  box: number;
  fromX: number;
  fromY: number;
  t: number;
  hit: boolean;
}

export interface PaperRouteState {
  bikeX: number;
  /** The road the bike rides on, the kerb the boxes stand on, and the houses' ground line. */
  roadY: number;
  boxY: number;
  houseY: number;
  boxes: Mailbox[];
  papers: Paper[];
  /** Where the next house goes (screen x), and the scenery scroll. */
  scroll: number;
  speed: number;
  /** Seconds until the bike can throw again. */
  cooldown: number;
  score: number;
  time: number;
}

/** A box can be hit when it is at most this far ahead of the bike, and not behind it. */
export const REACH = 620;
export const BOX_RADIUS = Math.max(TOUCH_RADIUS * 1.6, 70);
const FLIGHT = 0.4;
const COOLDOWN = 0.22;
const SPEED_START = 185;
const SPEED_END = 240;
const FLAG_SHARE = 0.65;

export function createPaperRoute({ arena, duration, params, rng }: GameSetup): MinigameLogic<PaperRouteState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  // The street band: kept together in the middle of a tall screen.
  const roadY = Math.min(arena.height - 80, Math.max(HUD_SAFE_TOP + 400, arena.height / 2 + 200));
  const state: PaperRouteState = {
    bikeX: Math.max(140, arena.width * 0.2),
    roadY,
    boxY: roadY - 120,
    houseY: roadY - 150,
    boxes: [],
    papers: [],
    scroll: 0,
    speed: SPEED_START * factor,
    cooldown: 0,
    score: 0,
    time: 0,
  };
  let nextId = 0;
  let nextX = state.bikeX + 380;
  const lay = (): void => {
    // Never two empty boxes in a row at the start: the child sees what a waiting box looks like.
    const flagUp = state.boxes.length < 2 || rng.chance(FLAG_SHARE);
    state.boxes.push({ id: (nextId += 1), x: nextX, flagUp, delivered: -1 });
    nextX += rng.range(270, 380);
  };
  while (nextX < arena.width + 400) lay();

  const inReach = (box: Mailbox): boolean => box.x > state.bikeX - 30 && box.x < state.bikeX + REACH;

  function throwAt(at: Point): void {
    if (state.cooldown > 0) return;
    const box = state.boxes
      .filter((b) => inReach(b) && Math.hypot(at.x - b.x, at.y - (state.boxY - 30)) <= BOX_RADIUS)
      .sort((a, b) => Math.abs(a.x - at.x) - Math.abs(b.x - at.x))[0];
    if (!box) return;
    state.cooldown = COOLDOWN;
    state.papers.push({ box: box.id, fromX: state.bikeX, fromY: state.roadY - 90, t: 0, hit: box.flagUp });
    if (box.flagUp) box.flagUp = false;
    events.push({ type: 'action', x: state.bikeX, y: state.roadY - 90 });
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
      state.cooldown = Math.max(0, state.cooldown - dt);
      state.speed = (SPEED_START + (SPEED_END - SPEED_START) * Math.min(1, state.time / duration)) * factor;
      for (const tap of input.taps) throwAt(tap);
      const move = state.speed * dt;
      state.scroll += move;
      nextX -= move;
      for (const box of state.boxes) {
        box.x -= move;
        if (box.delivered >= 0) box.delivered += dt;
      }
      for (const paper of state.papers) {
        paper.t += dt;
        if (paper.t >= FLIGHT && paper.t - dt < FLIGHT) {
          const box = state.boxes.find((b) => b.id === paper.box);
          if (paper.hit && box) {
            box.delivered = 0;
            state.score += 1;
            events.push({ type: 'score', x: box.x, y: state.boxY - 40 });
          } else events.push({ type: 'miss', x: box?.x ?? state.bikeX, y: state.boxY - 40 });
        }
      }
      state.papers = state.papers.filter((p) => p.t < FLIGHT + 0.5);
      state.boxes = state.boxes.filter((b) => b.x > -200);
      while (nextX < arena.width + 400) lay();
    },
  };
}

/** Good play: throw at the nearest waiting box once it is in reach. */
export function paperRouteBot(state: PaperRouteState, _context: BotContext): BotMove {
  const box = state.boxes.filter((b) => b.flagUp && b.x > state.bikeX && b.x < state.bikeX + REACH - 60).sort((a, b) => a.x - b.x)[0];
  return box && state.cooldown <= 0 ? { tap: { x: box.x, y: state.boxY - 30 } } : {};
}
