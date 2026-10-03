// Block count: a little stack of wooden cubes stands on a table, drawn in 3D, and some cubes hide behind or
// under others. The child taps the number of cubes among three big buttons. Right: the cubes pop and a new
// stack comes. Wrong: the buttons rest a moment while the stack turns all the way round, showing its back,
// and the child tries again (no penalty). Stacks grow bigger as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export interface Cube {
  x: number;
  y: number;
  z: number;
}

export interface Choice {
  value: number;
  x: number;
  y: number;
  /** Seconds since it was tapped wrongly (a shake), large = long ago. */
  wrongAgo: number;
}

export interface BlockCountState {
  /** Grid side (cubes stand on a side × side base). */
  side: number;
  cubes: Cube[];
  choices: Choice[];
  /** Radius of an answer button. */
  buttonRadius: number;
  /** Where the stack stands and how big one cube is drawn. */
  centre: Point;
  cubeSize: number;
  /** Turn of the stack (radians): a gentle sway, and a full turn after a wrong answer. */
  angle: number;
  /** Seconds left of the full turn after a wrong answer (0 when none). */
  turning: number;
  /** Seconds since the stack was answered right (cubes pop), or -1 while it is being counted. */
  solvedAgo: number;
  stacks: number;
  /** When the stack appeared (the bot counts a moment before answering). */
  shownAt: number;
  score: number;
  time: number;
}

/** Seconds of the full turn after a wrong answer; the buttons rest for the first part of it. */
export const TURN_SECONDS = 3;
export const LOCK_SECONDS = 1.2;
const NEXT_SECONDS = 0.9;

/** A stack whose number of cubes lies in [min, max], every cube standing on the table or on another cube. */
export function makeStack(rng: Rng, side: number, maxHeight: number, min: number, max: number): Cube[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const heights: number[] = [];
    for (let i = 0; i < side * side; i += 1) heights.push(rng.chance(0.3) ? 0 : rng.int(1, maxHeight));
    const total = heights.reduce((a, b) => a + b, 0);
    if (total < min || total > max) continue;
    const cubes: Cube[] = [];
    heights.forEach((h, i) => {
      for (let z = 0; z < h; z += 1) cubes.push({ x: i % side, y: Math.floor(i / side), z });
    });
    return cubes;
  }
  return [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }];
}

/** Three different answers, the right one among them, none below one, in order. */
export function makeChoices(rng: Rng, answer: number): number[] {
  const shapes: readonly (readonly number[])[] = [
    [-2, -1, 0],
    [-1, 0, 1],
    [0, 1, 2],
    [-2, 0, 2],
    [-1, 0, 2],
  ];
  const offsets = shapes[rng.int(0, shapes.length - 1)] ?? [-1, 0, 1];
  let values = offsets.map((o) => answer + o);
  if (Math.min(...values) < 1) values = [answer, answer + 1, answer + 2];
  return values.sort((a, b) => a - b);
}

export function createBlockCount({ arena, rng }: GameSetup): MinigameLogic<BlockCountState> {
  const events = eventQueue();
  const buttonRadius = Math.min(66, arena.width / 8);
  const buttonY = arena.height - buttonRadius - 34;
  const stackTop = HUD_SAFE_TOP + 20;
  const stackBottom = buttonY - buttonRadius - 30;
  const cubeSize = Math.min(104, (stackBottom - stackTop) / 5.2, arena.width / 6.5);
  const state: BlockCountState = {
    side: 3,
    cubes: [],
    choices: [],
    buttonRadius,
    // The stack rises about three cubes above its base and its table reaches one and a half below.
    centre: { x: arena.width / 2, y: Math.min(stackBottom - cubeSize * 1.6, (stackTop + stackBottom) / 2 + cubeSize * 1.2) },
    cubeSize,
    angle: 0,
    turning: 0,
    solvedAgo: -1,
    stacks: 0,
    shownAt: 0,
    score: 0,
    time: 0,
  };

  function deal(): void {
    const level = state.stacks;
    const [maxHeight, min, max] = level < 3 ? [2, 3, 7] : level < 7 ? [3, 6, 11] : [3, 9, 15];
    state.cubes = makeStack(rng, 3, maxHeight, min, max);
    const gap = Math.min(arena.width / 3.3, buttonRadius * 2 + 50);
    state.choices = makeChoices(rng, state.cubes.length).map((value, i) => ({ value, x: arena.width / 2 + (i - 1) * gap, y: buttonY, wrongAgo: 99 }));
    state.turning = 0;
    state.solvedAgo = -1;
    state.stacks += 1;
    state.shownAt = state.time;
  }
  deal();

  function tap(p: Point): void {
    if (state.solvedAgo >= 0 || state.turning > TURN_SECONDS - LOCK_SECONDS) return;
    const choice = state.choices.find((c) => Math.hypot(p.x - c.x, p.y - c.y) <= buttonRadius + 12);
    if (!choice) return;
    if (choice.value === state.cubes.length) {
      state.solvedAgo = 0;
      state.score += 1;
      events.push({ type: 'score', x: state.centre.x, y: state.centre.y - cubeSize, note: 72 + Math.min(12, state.cubes.length), voice: 'bell' });
    } else {
      choice.wrongAgo = 0;
      state.turning = TURN_SECONDS;
      events.push({ type: 'miss', x: choice.x, y: choice.y });
    }
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
      for (const c of state.choices) c.wrongAgo += dt;
      if (state.turning > 0) {
        state.turning = Math.max(0, state.turning - dt);
        // Ease once round, starting and ending slowly.
        const t = 1 - state.turning / TURN_SECONDS;
        state.angle = (t - Math.sin(t * Math.PI * 2) / (Math.PI * 2)) * Math.PI * 2;
      } else {
        state.angle = Math.sin(state.time * 0.9) * 0.12;
      }
      if (state.solvedAgo >= 0) {
        state.solvedAgo += dt;
        if (state.solvedAgo >= NEXT_SECONDS) deal();
        return;
      }
      for (const p of input.taps) tap(p);
    },
  };
}

/** Seconds the bot looks at a stack before answering. */
const BOT_LOOK = 1.2;

export function blockCountBot(state: BlockCountState, _context: BotContext): BotMove {
  if (state.solvedAgo >= 0 || state.time - state.shownAt < BOT_LOOK) return {};
  const right = state.choices.find((c) => c.value === state.cubes.length);
  return right ? { tap: { x: right.x, y: right.y } } : {};
}
