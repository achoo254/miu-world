// Moving pieces onto places with one finger, two ways (the touch rules: a drag can always be a tap instead):
// drag a piece and let go over a place, or tap a piece (it is chosen) and then tap the place. Used by the
// games where pieces go into slots (hundred-chart, picture-crossword, story-order). Pure: no DOM, no canvas.
import type { GameInput, Point } from '../../types';

/** A finger moving this far (arena units) from where it pressed a piece is a drag, not a tap. */
const DRAG_START = 16;

export interface PickDrop {
  /** The piece under the finger since it pressed (-1: none). */
  held: number;
  /** The held piece is being dragged; `at` is where it is. */
  dragging: boolean;
  at: Point | null;
  /** The piece chosen by a tap, waiting for a tap on a place (-1: none). */
  selected: number;
  pressAt: Point | null;
}

export const createPickDrop = (): PickDrop => ({ held: -1, dragging: false, at: null, selected: -1, pressAt: null });

/**
 * One step of input. `pieceAt` finds a piece under a point (-1 if none); `drop` tries to put a piece at a point
 * and says whether it went in. A piece that does not go in goes back home (the game shows a bounce).
 */
export function stepPickDrop(pd: PickDrop, input: GameInput, pieceAt: (p: Point) => number, drop: (piece: number, at: Point) => boolean): void {
  const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
  if (press) {
    const piece = pieceAt(press);
    pd.held = piece;
    pd.pressAt = piece >= 0 ? press : null;
    pd.dragging = false;
    pd.at = null;
  }
  if (input.pointer && pd.held >= 0 && pd.pressAt) {
    if (!pd.dragging && Math.hypot(input.pointer.x - pd.pressAt.x, input.pointer.y - pd.pressAt.y) > DRAG_START) {
      pd.dragging = true;
      pd.selected = -1;
    }
    if (pd.dragging) pd.at = input.pointer;
  }
  for (const tap of input.taps) {
    const piece = pieceAt(tap);
    if (piece >= 0) pd.selected = pd.selected === piece ? -1 : piece;
    else if (pd.selected >= 0 && drop(pd.selected, tap)) pd.selected = -1;
  }
  if (input.released) {
    if (pd.dragging && pd.held >= 0 && pd.at) drop(pd.held, pd.at);
    pd.held = -1;
    pd.dragging = false;
    pd.at = null;
    pd.pressAt = null;
  }
}
