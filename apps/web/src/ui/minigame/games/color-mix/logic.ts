// Color mix: a little customer asks for a colour (shown by a thing of that colour: a carrot for orange,
// grapes for purple). The child taps two paint pots; their paints pour into the bowl and swirl together. The
// right mix is a point and the next customer comes; a wrong mix is tipped out, nothing lost. Tapping a chosen
// pot again puts it back. With `white` off, only orange, green and purple are asked. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Paint = 'red' | 'yellow' | 'blue' | 'white';
export type Mix = 'orange' | 'green' | 'purple' | 'pink' | 'sky';

export const PAINTS: readonly Paint[] = ['red', 'yellow', 'blue', 'white'];

/** What each mix is made of. */
export const RECIPES: Readonly<Record<Mix, readonly [Paint, Paint]>> = {
  orange: ['red', 'yellow'],
  green: ['yellow', 'blue'],
  purple: ['red', 'blue'],
  pink: ['red', 'white'],
  sky: ['blue', 'white'],
};

/** A thing of each colour, so the colour can be asked for without words (and seen without colour vision). */
export const PAINT_ICONS: Readonly<Record<Paint, SpriteName>> = { red: 'red-apple', yellow: 'lemon', blue: 'gem', white: 'cloud' };
export const MIX_ICONS: Readonly<Record<Mix, SpriteName>> = { orange: 'carrot', green: 'clover', purple: 'grapes', pink: 'lotus', sky: 'snowflake' };
export const CUSTOMERS: readonly SpriteName[] = ['rabbit', 'cat', 'panda', 'bear', 'fox', 'penguin', 'frog', 'owl'];

/** Seconds the two paints swirl in the bowl before the result shows. */
export const SWIRL_SECONDS = 0.6;
/** Seconds a right mix is shown off, and a wrong one is tipped out. */
const SERVE_SECONDS = 0.6;
const DUMP_SECONDS = 0.8;

export interface Pot {
  paint: Paint;
  x: number;
  y: number;
}

export interface ColorMixState {
  pots: Pot[];
  potRadius: number;
  bowl: Point;
  customer: Point;
  want: Mix;
  who: SpriteName;
  /** Pots chosen for this mix, in order. */
  picked: Paint[];
  /** 'pick' while choosing; 'swirl' while mixing; then 'serve' (right) or 'dump' (wrong). */
  phase: 'pick' | 'swirl' | 'serve' | 'dump';
  inPhase: number;
  served: number;
  score: number;
  time: number;
}

/** The mix two paints make, or null when they make nothing asked for (the same paint twice). */
export function mixOf(a: Paint, b: Paint): Mix | null {
  for (const [mix, [x, y]] of Object.entries(RECIPES) as [Mix, readonly [Paint, Paint]][]) {
    if ((a === x && b === y) || (a === y && b === x)) return mix;
  }
  return null;
}

export function createColorMix({ arena, params, rng }: GameSetup): MinigameLogic<ColorMixState> {
  const withWhite = params.white !== false;
  const asks: Mix[] = withWhite ? ['orange', 'green', 'purple', 'pink', 'sky'] : ['orange', 'green', 'purple'];
  const paints = withWhite ? PAINTS : PAINTS.filter((p) => p !== 'white');
  const events = eventQueue();
  const potRadius = Math.max(TOUCH_RADIUS + 12, Math.min(70, arena.width / (paints.length * 2.6)));
  // Customer, bowl and pots stay together in a block, centred on a tall screen.
  const available = arena.height - HUD_SAFE_TOP - 20;
  const block = Math.min(available, 560);
  const top = HUD_SAFE_TOP + 20 + (available - block) / 2;
  const potY = top + block - potRadius - 50;
  const gap = Math.min(arena.width, 640) / paints.length;
  const left = (arena.width - gap * paints.length) / 2;
  const pots = paints.map((paint, i) => ({ paint, x: left + gap * (i + 0.5), y: potY }));
  const customer = { x: arena.width / 2, y: top + (potY - potRadius - top) * 0.28 };
  const bowl = { x: arena.width / 2, y: top + (potY - potRadius - top) * 0.72 };
  const state: ColorMixState = { pots, potRadius, bowl, customer, want: 'orange', who: 'rabbit', picked: [], phase: 'pick', inPhase: 0, served: 0, score: 0, time: 0 };

  function nextCustomer(): void {
    let want = asks[rng.int(0, asks.length - 1)] ?? 'orange';
    if (want === state.want && state.served > 0) want = asks[(asks.indexOf(want) + 1) % asks.length] ?? 'orange';
    state.want = want;
    state.who = CUSTOMERS[rng.int(0, CUSTOMERS.length - 1)] ?? 'rabbit';
    state.picked = [];
    state.phase = 'pick';
    state.inPhase = 0;
    state.served += 1;
  }

  const potAt = (p: Point): Pot | undefined => state.pots.find((pot) => Math.hypot(pot.x - p.x, pot.y - p.y) <= potRadius * 1.35);

  nextCustomer();

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
      state.inPhase += dt;
      if (state.phase === 'swirl' && state.inPhase >= SWIRL_SECONDS) {
        const [a, b] = state.picked;
        const right = a !== undefined && b !== undefined && mixOf(a, b) === state.want;
        state.phase = right ? 'serve' : 'dump';
        state.inPhase = 0;
        if (right) {
          state.score += 1;
          events.push({ type: 'score', x: bowl.x, y: bowl.y - 40 });
        } else {
          events.push({ type: 'miss', x: bowl.x, y: bowl.y });
        }
        return;
      }
      if (state.phase === 'serve' && state.inPhase >= SERVE_SECONDS) nextCustomer();
      if (state.phase === 'dump' && state.inPhase >= DUMP_SECONDS) {
        state.picked = [];
        state.phase = 'pick';
        state.inPhase = 0;
      }
      if (state.phase !== 'pick') return;
      for (const tap of input.taps) {
        const pot = potAt(tap);
        if (!pot) continue;
        const already = state.picked.indexOf(pot.paint);
        if (already >= 0) {
          state.picked.splice(already, 1);
          continue;
        }
        state.picked.push(pot.paint);
        events.push({ type: 'action', x: pot.x, y: pot.y - potRadius });
        if (state.picked.length === 2) {
          state.phase = 'swirl';
          state.inPhase = 0;
          break;
        }
      }
    },
  };
}

/** Good play: knows the recipes; taps the two pots, one after the other. */
export function colorMixBot(state: ColorMixState, _context: BotContext): BotMove {
  if (state.phase !== 'pick' || state.inPhase < 0.25) return {};
  const need = RECIPES[state.want].find((p) => !state.picked.includes(p));
  const pot = state.pots.find((p) => p.paint === need);
  return pot ? { tap: { x: pot.x, y: pot.y } } : {};
}
