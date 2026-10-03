// Robot vacuum: a little robot must suck up every dust patch in a room full of furniture. The child builds its
// program first, tapping commands (go one square, turn left, turn right; the bin button takes the last one off)
// and then Run. The robot plays the program step by step: bumping into furniture or a wall stops it, and it
// goes back to its corner to try a fixed program; every patch picked up is a clean room (a point) and the next
// room comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const SIZE = 5;
export const MAX_PROGRAM = 12;
const STEP_SECONDS = 0.38;
const BUMP_SECONDS = 1;
const CLEAN_SECONDS = 1.3;
/** Directions: 0 right, 1 down, 2 left, 3 up. */
const DX = [1, 0, -1, 0] as const;
const DY = [0, 1, 0, -1] as const;

export type Command = 'go' | 'left' | 'right';
export type Button = Command | 'undo' | 'run';
export const BUTTONS: readonly Button[] = ['go', 'left', 'right', 'undo', 'run'];

export interface Room {
  /** Furniture squares, dust squares, the start square and facing. */
  blocked: boolean[];
  dust: number[];
  start: number;
  facing: number;
}

export interface RobotState {
  room: Room;
  program: Command[];
  /** The robot as it runs. */
  at: number;
  facing: number;
  cleaned: boolean[];
  /** Index of the command playing, while running. */
  pc: number;
  phase: 'edit' | 'run' | 'bump' | 'short' | 'clean';
  phaseAgo: number;
  stepAgo: number;
  grid: { left: number; top: number; cell: number };
  buttons: { kind: Button; x: number; y: number; w: number; h: number }[];
  strip: { x: number; y: number; tile: number; perRow: number };
  lastTapAt: number;
  rooms: number;
  score: number;
  time: number;
}

/** The shortest program that cleans the room, from its start (breadth-first over square, facing, dust left). */
export function solveRoom(room: Room): Command[] {
  const dustIndex = new Map(room.dust.map((d, i) => [d, i]));
  const full = (1 << room.dust.length) - 1;
  const startMask = dustIndex.has(room.start) ? 1 << (dustIndex.get(room.start) ?? 0) : 0;
  const key = (at: number, facing: number, mask: number): number => (at * 4 + facing) * 64 + mask;
  const prev = new Map<number, { from: number; cmd: Command }>();
  const start = key(room.start, room.facing, startMask);
  prev.set(start, { from: -1, cmd: 'go' });
  const queue = [start];
  for (let head = 0; head < queue.length; head += 1) {
    const k = queue[head] ?? 0;
    const mask = k % 64;
    const facing = Math.floor(k / 64) % 4;
    const at = Math.floor(k / 256);
    if (mask === full) {
      const out: Command[] = [];
      for (let c = k; c !== start; ) {
        const p = prev.get(c);
        if (!p) break;
        out.unshift(p.cmd);
        c = p.from;
      }
      return out;
    }
    const moves: [Command, number, number, number][] = [
      ['left', at, (facing + 3) % 4, mask],
      ['right', at, (facing + 1) % 4, mask],
    ];
    const x = (at % SIZE) + (DX[facing] ?? 0);
    const y = Math.floor(at / SIZE) + (DY[facing] ?? 0);
    if (x >= 0 && x < SIZE && y >= 0 && y < SIZE && !room.blocked[y * SIZE + x]) {
      const to = y * SIZE + x;
      const d = dustIndex.get(to);
      moves.push(['go', to, facing, d === undefined ? mask : mask | (1 << d)]);
    }
    for (const [cmd, a, f, m] of moves) {
      const next = key(a, f, m);
      if (prev.has(next)) continue;
      prev.set(next, { from: k, cmd });
      queue.push(next);
    }
  }
  return [];
}

export function makeRoom(rng: Rng, n: number): Room {
  const dustCount = n < 1 ? 2 : 3;
  for (let tries = 0; tries < 80; tries += 1) {
    const corner = rng.int(0, 3);
    const start = [0, SIZE - 1, SIZE * (SIZE - 1), SIZE * SIZE - 1][corner] ?? 0;
    const facing = [0, 1, 3, 2][corner] ?? 0;
    const blocked = new Array<boolean>(SIZE * SIZE).fill(false);
    const free = (i: number): boolean => i !== start && !blocked[i];
    for (let k = 0, placed = 0; placed < 3 + Math.min(2, n) && k < 40; k += 1) {
      const i = rng.int(0, SIZE * SIZE - 1);
      if (free(i)) {
        blocked[i] = true;
        placed += 1;
      }
    }
    const dust: number[] = [];
    for (let k = 0; dust.length < dustCount && k < 40; k += 1) {
      const i = rng.int(0, SIZE * SIZE - 1);
      if (free(i) && !dust.includes(i)) dust.push(i);
    }
    const room = { blocked, dust, start, facing };
    const plan = solveRoom(room);
    if (dust.length === dustCount && plan.length >= 4 && plan.length <= (n < 1 ? 7 : 10)) return room;
  }
  // A plain room, always solvable: dust ahead along the top row.
  return { blocked: new Array<boolean>(SIZE * SIZE).fill(false), dust: [2, 4], start: 0, facing: 0 };
}

export function createRobotPath({ arena, rng }: GameSetup): MinigameLogic<RobotState> {
  const events = eventQueue();
  const wide = arena.width >= arena.height;
  const free = arena.height - HUD_SAFE_TOP;
  const gridSize = wide ? Math.min(free - 40, arena.width * 0.52, 480) : Math.min(arena.width - 60, free * 0.48, 480);
  const cell = gridSize / SIZE;
  const grid = wide ? { left: 30, top: HUD_SAFE_TOP + (free - gridSize) / 2, cell } : { left: (arena.width - gridSize) / 2, top: HUD_SAFE_TOP + 20, cell };
  const panelLeft = wide ? grid.left + gridSize + 30 : 20;
  const panelW = wide ? arena.width - panelLeft - 20 : arena.width - 40;
  const panelTop = wide ? HUD_SAFE_TOP + 20 : grid.top + gridSize + 24;
  const tile = Math.min(52, panelW / 6.6);
  const perRow = 6;
  const stripH = tile * 2 + 12;
  // Buttons: one row of five on a tall screen; commands above, bin and Run below on a wide one.
  const rows: Button[][] = wide ? [['go', 'left', 'right'], ['undo', 'run']] : [[...BUTTONS]];
  const btnW = Math.min(112, (panelW - 40) / (wide ? 3 : 5));
  const btnH = 88;
  const firstRowY = wide ? panelTop + stripH + 40 + btnH / 2 : Math.min(arena.height - btnH / 2 - 24, panelTop + stripH + 40 + btnH / 2);
  const buttons = rows.flatMap((row, r) => row.map((kind, i) => ({ kind, x: panelLeft + panelW / 2 + (i - (row.length - 1) / 2) * (btnW + 10), y: firstRowY + r * (btnH + 18), w: btnW, h: btnH })));
  const first = makeRoom(rng, 0);
  const state: RobotState = {
    room: first,
    program: [],
    at: first.start,
    facing: first.facing,
    cleaned: first.dust.map(() => false),
    pc: 0,
    phase: 'edit',
    phaseAgo: 0,
    stepAgo: 0,
    grid,
    buttons,
    strip: { x: panelLeft + panelW / 2 - (perRow * (tile + 6)) / 2, y: panelTop + 10, tile, perRow },
    lastTapAt: -9,
    rooms: 0,
    score: 0,
    time: 0,
  };

  const centre = (i: number): Point => ({ x: grid.left + ((i % SIZE) + 0.5) * cell, y: grid.top + (Math.floor(i / SIZE) + 0.5) * cell });
  const backToStart = (): void => {
    state.at = state.room.start;
    state.facing = state.room.facing;
    state.cleaned = state.room.dust.map((d) => d === state.room.start);
    state.pc = 0;
    state.phase = 'edit';
    state.phaseAgo = 0;
  };
  const pickUp = (): void => {
    const d = state.room.dust.indexOf(state.at);
    if (d >= 0 && !state.cleaned[d]) {
      state.cleaned[d] = true;
      const p = centre(state.at);
      events.push({ type: 'action', x: p.x, y: p.y, note: 76 + state.cleaned.filter(Boolean).length * 3, voice: 'bell' });
    }
    if (state.cleaned.every(Boolean)) {
      state.phase = 'clean';
      state.phaseAgo = 0;
      state.score += 1;
      const p = centre(state.at);
      events.push({ type: 'score', x: p.x, y: p.y });
    }
  };

  const press = (kind: Button): void => {
    state.lastTapAt = state.time;
    if (kind === 'run') {
      if (state.program.length === 0) return;
      backToStart();
      state.phase = 'run';
      state.stepAgo = 0;
      return;
    }
    if (kind === 'undo') {
      state.program.pop();
      return;
    }
    if (state.program.length < MAX_PROGRAM) state.program.push(kind);
  };

  backToStart();

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
      state.phaseAgo += dt;
      if (state.phase === 'clean') {
        if (state.phaseAgo >= CLEAN_SECONDS) {
          state.rooms += 1;
          state.room = makeRoom(rng, state.rooms);
          state.program = [];
          backToStart();
        }
        return;
      }
      if (state.phase === 'bump' || state.phase === 'short') {
        if (state.phaseAgo >= BUMP_SECONDS) backToStart();
        return;
      }
      if (state.phase === 'run') {
        state.stepAgo += dt;
        if (state.stepAgo < STEP_SECONDS) return;
        state.stepAgo = 0;
        const cmd = state.program[state.pc];
        if (!cmd) {
          state.phase = 'short';
          state.phaseAgo = 0;
          const p = centre(state.at);
          events.push({ type: 'miss', x: p.x, y: p.y });
          return;
        }
        state.pc += 1;
        if (cmd === 'left') state.facing = (state.facing + 3) % 4;
        else if (cmd === 'right') state.facing = (state.facing + 1) % 4;
        else {
          const x = (state.at % SIZE) + (DX[state.facing] ?? 0);
          const y = Math.floor(state.at / SIZE) + (DY[state.facing] ?? 0);
          if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || state.room.blocked[y * SIZE + x]) {
            state.phase = 'bump';
            state.phaseAgo = 0;
            const p = centre(state.at);
            events.push({ type: 'hit', x: p.x, y: p.y });
            return;
          }
          state.at = y * SIZE + x;
          pickUp();
        }
        return;
      }
      for (const tap of input.taps) {
        const button = state.buttons.find((b) => Math.abs(tap.x - b.x) <= b.w / 2 + 6 && Math.abs(tap.y - b.y) <= b.h / 2 + 6);
        if (button) {
          press(button.kind);
          return;
        }
      }
    },
  };
}

/** Good play: works out the shortest program, types it (fixing what does not match), then runs it. */
export function robotPathBot(state: RobotState, _context: BotContext): BotMove {
  if (state.phase !== 'edit' || state.time - state.lastTapAt < 0.3) return {};
  const plan = solveRoom(state.room);
  const button = (kind: Button) => state.buttons.find((b) => b.kind === kind);
  const mismatch = state.program.findIndex((c, i) => plan[i] !== c);
  const pick = mismatch >= 0 ? 'undo' : state.program.length < plan.length ? plan[state.program.length] : 'run';
  const b = pick ? button(pick) : undefined;
  return b ? { tap: { x: b.x, y: b.y } } : {};
}
