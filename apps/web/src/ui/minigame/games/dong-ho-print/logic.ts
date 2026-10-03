// Đông Hồ print: a sheet of dó paper rides a belt under three carved blocks, one per layer of the picture (a
// red ground, a green pattern, then the black outline of a pig, a rooster, a carp…). The block for the next
// layer glows; the child taps when the sheet's red mark is right under it. Right on the mark is two points, close
// is one; further off the layer still prints but smudged (no points). A picture with all three layers and no
// smudge earns one more point. A tap with no sheet under the glowing block jams it for a moment (and tapping
// a jammed block keeps it jammed), so drumming on the screen prints nothing. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export const LAYERS = 3;
export const PICTURES: readonly SpriteName[] = ['pig', 'chicken', 'fish', 'mouse-face', 'frog', 'cow', 'duck', 'turtle'];

/** How far off the mark (arena units) still prints, prints well, and prints perfectly. */
export const PRINT_WINDOW = 60;
export const GOOD_WINDOW = 32;
export const PERFECT_WINDOW = 14;
export const JAM_SECONDS = 0.5;
const SPEED = 150;

export interface Print {
  /** Offset (units) the layer was printed at, or null while not printed. */
  offset: number | null;
  quality: 'perfect' | 'good' | 'smudge' | 'missed' | null;
}

export interface Sheet {
  picture: SpriteName;
  x: number;
  layers: Print[];
  /** The bonus for a clean picture has been decided. */
  finished: boolean;
}

export interface PrintState {
  sheet: Sheet;
  /** Stamp blocks' x positions, in the order the sheet meets them (layer 0 first, on the right). */
  stamps: number[];
  beltY: number;
  sheetW: number;
  /** Seconds left of a jam. */
  jam: number;
  /** The stamp pressed last and how long ago (it presses down). */
  pressed: number;
  pressedAgo: number;
  /** Finished pictures hung up to dry (latest last). */
  dried: { picture: SpriteName; clean: boolean }[];
  sheets: number;
  score: number;
  time: number;
}

export function createDongHoPrint({ arena, params, rng }: GameSetup): MinigameLogic<PrintState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const sheetW = Math.min(170, arena.width * 0.26);
  const gap = Math.min(220, (arena.width - 80) / 3);
  const stamps = [arena.width / 2 + gap, arena.width / 2, arena.width / 2 - gap];
  const beltY = Math.max(HUD_SAFE_TOP + 300, arena.height * 0.62);
  const newSheet = (): Sheet => ({ picture: PICTURES[rng.int(0, PICTURES.length - 1)] ?? 'pig', x: arena.width + sheetW, layers: Array.from({ length: LAYERS }, () => ({ offset: null, quality: null })), finished: false });
  const state: PrintState = { sheet: newSheet(), stamps, beltY, sheetW, jam: 0, pressed: -1, pressedAgo: 9, dried: [], sheets: 1, score: 0, time: 0 };

  /** The next layer to print: the first one neither printed nor passed. */
  const active = (): number => state.sheet.layers.findIndex((l) => l.quality === null);

  function press(): void {
    const layer = active();
    const x = stamps[layer];
    if (layer < 0 || x === undefined) return;
    state.pressed = layer;
    state.pressedAgo = 0;
    const offset = state.sheet.x - x;
    const print = state.sheet.layers[layer];
    if (Math.abs(offset) > PRINT_WINDOW || !print) {
      state.jam = JAM_SECONDS;
      events.push({ type: 'miss', x, y: beltY });
      return;
    }
    const a = Math.abs(offset);
    print.offset = offset;
    print.quality = a <= PERFECT_WINDOW ? 'perfect' : a <= GOOD_WINDOW ? 'good' : 'smudge';
    const points = print.quality === 'perfect' ? 2 : print.quality === 'good' ? 1 : 0;
    state.score += points;
    events.push(points > 0 ? { type: 'score', x, y: beltY - 60, points } : { type: 'action', x, y: beltY });
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
      state.pressedAgo += dt;
      if (input.taps.length > 0) {
        // A tap on a jammed block keeps it jammed.
        if (state.jam > 0) state.jam = JAM_SECONDS;
        else press();
      } else {
        state.jam = Math.max(0, state.jam - dt);
      }
      const sheet = state.sheet;
      sheet.x -= SPEED * factor * dt;
      // A layer whose block the sheet has gone past without a print is missed.
      sheet.layers.forEach((l, i) => {
        const x = stamps[i];
        if (l.quality === null && x !== undefined && sheet.x < x - PRINT_WINDOW) l.quality = 'missed';
      });
      if (!sheet.finished && sheet.layers.every((l) => l.quality !== null)) {
        sheet.finished = true;
        const clean = sheet.layers.every((l) => l.quality === 'perfect' || l.quality === 'good');
        if (clean) {
          state.score += 1;
          events.push({ type: 'score', x: sheet.x, y: beltY - 80, points: 1 });
        }
        state.dried.push({ picture: sheet.picture, clean });
      }
      if (sheet.x < (stamps[LAYERS - 1] ?? 0) - PRINT_WINDOW - sheetW * 0.7) {
        state.sheet = newSheet();
        state.sheets += 1;
      }
    },
  };
}

/** Good play: taps when the mark is right under the glowing block (a child's eye, a tenth of a second). */
export function dongHoPrintBot(state: PrintState, _context: BotContext): BotMove {
  const layer = state.sheet.layers.findIndex((l) => l.quality === null);
  const x = state.stamps[layer];
  if (layer < 0 || x === undefined || state.jam > 0) return {};
  const offset = state.sheet.x - x;
  // It moves 15 units between two looks: tap when it will be closest.
  return offset <= 9 && offset >= -6 ? { tap: { x: x, y: state.beltY } } : {};
}
