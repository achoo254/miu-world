// Conveyor sort: things ride a conveyor belt down toward two baskets. Each basket has a sign (pictures and a
// word): sea animals and land animals, fruit and toys… The child swipes left or right (or taps that side)
// to send the front thing into its basket: the right basket is a point, the wrong one only bounces it out,
// and nothing is lost when a thing rides off the end. The two signs change every quarter of the round.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Side = 'left' | 'right';

export interface SortGroup {
  label: string;
  things: readonly [SpriteName, ...SpriteName[]];
}

/** Pairs of groups a child of seven sorts without doubt. */
export const PAIRS: readonly (readonly [SortGroup, SortGroup])[] = [
  [
    { label: 'Dưới nước', things: ['fish', 'tropical-fish', 'dolphin', 'crab', 'octopus', 'spiral-shell'] },
    { label: 'Trên cạn', things: ['rabbit', 'fox', 'bear', 'chicken', 'panda', 'snail'] },
  ],
  [
    { label: 'Quả', things: ['red-apple', 'banana', 'strawberry', 'grapes', 'lemon', 'pineapple', 'watermelon', 'cherries'] },
    { label: 'Đồ chơi', things: ['teddy-bear', 'soccer-ball', 'kite', 'balloon', 'puzzle-piece', 'skateboard'] },
  ],
  [
    { label: 'Biết bay', things: ['bird', 'butterfly', 'honeybee', 'owl', 'parrot', 'airplane'] },
    { label: 'Không bay', things: ['turtle', 'frog', 'rabbit', 'cat', 'crab', 'automobile'] },
  ],
  [
    { label: 'Đồ ăn', things: ['cookie', 'doughnut', 'ice-cream', 'lollipop', 'candy', 'carrot'] },
    { label: 'Xe cộ', things: ['bus', 'bicycle', 'automobile', 'airplane', 'sailboat', 'rocket'] },
  ],
];

export interface Thing {
  picture: SpriteName;
  /** The basket it belongs in, and the pair of signs it was sorted under. */
  side: Side;
  pair: number;
  y: number;
  /** Sent into a basket: which, whether right, and seconds since. */
  sent: { side: Side; right: boolean; t: number } | null;
  fell: number;
}

export interface ConveyorState {
  beltX: number;
  beltW: number;
  /** Where the belt ends: things past it fall off. */
  endY: number;
  basketY: number;
  leftX: number;
  rightX: number;
  /** Pair order for this round (indexes into PAIRS), and the one on the signs. */
  order: number[];
  signs: number;
  things: Thing[];
  /** Seconds the belt has run (rollers turning). */
  belt: number;
  score: number;
  time: number;
}

const TRAVEL_START = 3.6;
const TRAVEL_END = 2.4;
const GAP_START = 1.35;
const GAP_END = 0.8;
const SEND_SECONDS = 0.35;

export function createConveyorSort({ arena, duration, params, rng }: GameSetup): MinigameLogic<ConveyorState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const basketY = arena.height - 110;
  const endY = basketY - 40;
  const order = [0, 1, 2, 3];
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j] ?? 0, order[i] ?? 0];
  }
  const spread = Math.min(arena.width * 0.33, 280);
  const state: ConveyorState = {
    beltX: arena.width / 2,
    beltW: 150,
    endY,
    basketY,
    leftX: arena.width / 2 - spread,
    rightX: arena.width / 2 + spread,
    order,
    signs: order[0] ?? 0,
    things: [],
    belt: 0,
    score: 0,
    time: 0,
  };
  const startY = HUD_SAFE_TOP - 40;
  let nextThing = 0.6;
  let lastPicture: SpriteName | null = null;

  const progress = (): number => Math.min(1, state.time / duration);
  const beltSpeed = (): number => ((endY - startY) / (TRAVEL_START + (TRAVEL_END - TRAVEL_START) * progress())) * factor;
  const front = (): Thing | undefined => frontThing(state);

  function spawn(): void {
    const pair = state.order[Math.min(3, Math.floor(progress() * 4))] ?? 0;
    const groups = PAIRS[pair];
    if (!groups) return;
    const side: Side = rng.chance(0.5) ? 'left' : 'right';
    const group = groups[side === 'left' ? 0 : 1];
    let picture = rng.pick(group.things);
    if (picture === lastPicture) picture = rng.pick(group.things);
    lastPicture = picture;
    state.things.push({ picture, side, pair, y: startY, sent: null, fell: -1 });
  }

  function send(side: Side): void {
    const thing = front();
    if (!thing) return;
    const right = thing.side === side;
    thing.sent = { side, right, t: 0 };
    const x = side === 'left' ? state.leftX : state.rightX;
    if (right) {
      state.score += 1;
      events.push({ type: 'score', x, y: basketY - 60 });
    } else events.push({ type: 'miss', x, y: basketY - 60 });
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
      const move = beltSpeed() * dt;
      state.belt += move;
      for (const swipe of input.swipes) if (swipe.direction === 'left' || swipe.direction === 'right') send(swipe.direction);
      for (const tap of input.taps) if (tap.y > HUD_SAFE_TOP) send(tap.x < state.beltX ? 'left' : 'right');

      for (const thing of state.things) {
        if (thing.sent) thing.sent.t += dt;
        else if (thing.fell >= 0) thing.fell += dt;
        else {
          thing.y += move;
          if (thing.y > endY) {
            thing.fell = 0;
            events.push({ type: 'miss', x: state.beltX, y: endY });
          }
        }
      }
      state.things = state.things.filter((t) => (t.sent ? t.sent.t < SEND_SECONDS + 0.3 : t.fell < 0.6));
      state.signs = front()?.pair ?? state.order[Math.min(3, Math.floor(progress() * 4))] ?? 0;
      nextThing -= dt;
      if (nextThing <= 0) {
        spawn();
        nextThing += (GAP_START + (GAP_END - GAP_START) * progress()) / factor;
      }
    },
  };
}

/** The thing a swipe sends: the one furthest down the belt, still riding. */
export function frontThing(state: ConveyorState): Thing | undefined {
  return state.things.filter((t) => !t.sent && t.fell < 0 && t.y > HUD_SAFE_TOP - 10).sort((a, b) => b.y - a.y)[0];
}

/** Good play: send the front thing to its basket once it is well down the belt. */
export function conveyorSortBot(state: ConveyorState, _context: BotContext): BotMove {
  const thing = frontThing(state);
  if (!thing || thing.y < state.endY - 260) return {};
  const dx = thing.side === 'left' ? -160 : 160;
  return { swipe: { from: { x: state.beltX, y: state.endY - 100 }, dx, dy: 0 } };
}
