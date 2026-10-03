// Blueprint build: a small plan shows a picture made of coloured bricks (a house, a tree, a boat…). The child
// picks a colour from the paint pots and taps squares on the big building grid to lay bricks there; tapping a
// brick of the picked colour takes it away again. When the grid matches the plan the building is finished: a
// point, and a new plan comes (4 × 4 plans first, then 5 × 5). The plan ticks off the squares already right.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type Arena, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Plans: one row per string; r, b, y, g are the four colours, '.' an empty square. */
const SMALL_PLANS = [
  ['yy..', 'yy..', '..bb', '..bb'],
  ['rrrr', 'g..g', 'g..g', 'gggg'],
  ['.yy.', 'yyyy', 'bbbb', '.bb.'],
  ['r..r', '.gg.', '.gg.', 'r..r'],
  ['bbbb', 'b..b', 'yyyy', 'r..r'],
] as const;
const BIG_PLANS = [
  ['..r..', '.rrr.', 'rrrrr', 'bbybb', 'bbybb'],
  ['..g..', '.ggg.', 'ggggg', '..y..', '..y..'],
  ['..r..', '..rr.', '..r..', 'bbbbb', '.bbb.'],
  ['.r.r.', 'rryrr', '.r.r.', '..g..', '.ggg.'],
  ['..b..', '.bbb.', '.byb.', '.bbb.', 'r.r.r'],
  ['y...y', '.y.y.', '..r..', '.ggg.', 'ggggg'],
] as const;
const COLOURS = 'rbyg';

export interface Button extends Point {
  colour: number;
}

export interface BlueprintState {
  size: number;
  /** Wanted colour + 1 per square (0 empty), row by row; and what is built. */
  plan: number[];
  built: number[];
  /** Seconds since each square changed (a brick drops in). */
  changed: number[];
  cell: number;
  left: number;
  top: number;
  /** The small plan's corner and square size. */
  planX: number;
  planY: number;
  planCell: number;
  buttons: Button[];
  buttonRadius: number;
  colour: number;
  /** Seconds since the building was finished (-1 while building). */
  doneAgo: number;
  buildings: number;
  score: number;
  time: number;
}

const NEXT_SECONDS = 1.5;

export function parsePlan(rows: readonly string[]): number[] {
  return rows.flatMap((row) => [...row].map((ch) => COLOURS.indexOf(ch) + 1));
}

function place(arena: Arena, size: number): Pick<BlueprintState, 'cell' | 'left' | 'top' | 'planX' | 'planY' | 'planCell' | 'buttons' | 'buttonRadius'> {
  const top = HUD_SAFE_TOP + 16;
  const buttonRadius = Math.max(TOUCH_RADIUS + 4, 46);
  if (arena.width > arena.height) {
    const cell = Math.min(92, (arena.height - top - 30) / size);
    const left = 40;
    const side = left + cell * size + 40;
    const sideW = arena.width - side - 20;
    const planCell = Math.min(30, (sideW - 20) / size);
    const cx = side + sideW / 2;
    const by = top + planCell * size + 90;
    const gap = Math.min(110, (arena.height - by - buttonRadius - 20) / 1.5);
    const buttons = [0, 1, 2, 3].map((colour) => ({ colour, x: cx + (colour % 2 === 0 ? -1 : 1) * 56, y: by + Math.floor(colour / 2) * gap }));
    return { cell, left, top, planX: cx - (planCell * size) / 2, planY: top + 10, planCell, buttons, buttonRadius };
  }
  const planCell = 26;
  const planY = top;
  const gridTop = planY + planCell * size + 24;
  const cell = Math.min(92, (arena.width - 60) / size, (arena.height - gridTop - buttonRadius * 2 - 50) / size);
  const by = Math.min(arena.height - buttonRadius - 20, gridTop + cell * size + 30 + buttonRadius);
  const spacing = Math.min(130, (arena.width - 40) / 4);
  const buttons = [0, 1, 2, 3].map((colour) => ({ colour, x: arena.width / 2 + (colour - 1.5) * spacing, y: by }));
  return { cell, left: (arena.width - cell * size) / 2, top: gridTop, planX: (arena.width - planCell * size) / 2, planY, planCell, buttons, buttonRadius };
}

export function createBlueprintBuild({ arena, rng }: GameSetup): MinigameLogic<BlueprintState> {
  const events = eventQueue();
  const state = {
    size: 4,
    plan: [],
    built: [],
    changed: [],
    colour: 0,
    doneAgo: -1,
    buildings: 0,
    score: 0,
    time: 0,
    ...place(arena, 4),
  } as BlueprintState;
  let last = '';

  const newPlan = (): void => {
    const pool: ReadonlyArray<readonly string[]> = state.buildings < 2 ? SMALL_PLANS : BIG_PLANS;
    // Never the same plan twice in a row.
    const options = pool.filter((p) => p.join() !== last);
    const rows = options[rng.int(0, options.length - 1)] ?? pool[0] ?? [];
    last = rows.join();
    const size = rows.length;
    Object.assign(state, place(arena, size));
    state.size = size;
    state.plan = parsePlan(rows);
    state.built = state.plan.map(() => 0);
    state.changed = state.plan.map(() => 9);
    state.colour = Math.max(0, (state.plan.find((v) => v > 0) ?? 1) - 1);
    state.doneAgo = -1;
  };
  newPlan();

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
      for (let i = 0; i < state.changed.length; i += 1) state.changed[i] = (state.changed[i] ?? 9) + dt;
      if (state.doneAgo >= 0) {
        state.doneAgo += dt;
        if (state.doneAgo >= NEXT_SECONDS) newPlan();
        return;
      }
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      if (!press) return;
      const button = state.buttons.find((b) => Math.hypot(b.x - press.x, b.y - press.y) <= state.buttonRadius + 10);
      if (button) {
        state.colour = button.colour;
        events.push({ type: 'action', x: button.x, y: button.y });
        return;
      }
      const col = Math.floor((press.x - state.left) / state.cell);
      const row = Math.floor((press.y - state.top) / state.cell);
      if (col < 0 || row < 0 || col >= state.size || row >= state.size) return;
      const i = row * state.size + col;
      const wanted = state.colour + 1;
      state.built[i] = state.built[i] === wanted ? 0 : wanted;
      state.changed[i] = 0;
      const x = state.left + (col + 0.5) * state.cell;
      const y = state.top + (row + 0.5) * state.cell;
      events.push({ type: state.built[i] !== 0 && state.built[i] !== state.plan[i] ? 'miss' : 'action', x, y });
      if (state.built.every((v, k) => v === state.plan[k])) {
        state.buildings += 1;
        state.score += 1;
        state.doneAgo = 0;
        events.push({ type: 'score', x: state.left + (state.cell * state.size) / 2, y: state.top + (state.cell * state.size) / 2 });
      }
    },
  };
}

/** Good play: pick the colour of the next wrong square, then tap it. */
export function blueprintBuildBot(state: BlueprintState, _context: BotContext): BotMove {
  if (state.doneAgo >= 0) return {};
  const i = state.built.findIndex((v, k) => v !== state.plan[k]);
  if (i < 0) return {};
  const want = state.plan[i] ?? 0;
  // An empty square that has a brick: tap it with that brick's colour picked to take it away.
  const colour = want === 0 ? (state.built[i] ?? 1) - 1 : want - 1;
  if (state.colour !== colour) {
    const button = state.buttons[colour];
    return button ? { tap: { x: button.x, y: button.y } } : {};
  }
  return { tap: { x: state.left + ((i % state.size) + 0.5) * state.cell, y: state.top + (Math.floor(i / state.size) + 0.5) * state.cell } };
}
