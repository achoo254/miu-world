// A piece the child drags with one finger (the charm she pulls back, the gem she carries): Pointer Events with the
// pointer captured, so the drag keeps working when the finger leaves the piece, and `touch-action: none` on it
// (moves.css) so the page neither scrolls nor zooms. The piece follows the finger by its own style (no React render
// for each move of the finger); where the finger lifts is handed back, with how far it went.
import { useRef, type PointerEvent } from 'react';
import type { ScreenPoint } from './move-target';

export interface DragOffset {
  dx: number;
  dy: number;
}

/** The piece's offset: following the finger, at most `reach` px either way when given. */
const held = (moved: DragOffset, reach: number | undefined): DragOffset =>
  reach === undefined ? moved : { dx: Math.max(-reach, Math.min(reach, moved.dx)), dy: Math.max(-reach, Math.min(reach, moved.dy)) };

export function useDrag(
  onRelease: (end: ScreenPoint, moved: DragOffset) => void,
  disabled: boolean,
  options: { reach?: number; onMove?: (moved: DragOffset | null, piece: HTMLElement) => void } = {},
) {
  const start = useRef<ScreenPoint | null>(null);
  const place = (piece: HTMLElement, moved: DragOffset | null): void => {
    const at = moved ? held(moved, options.reach) : null;
    piece.style.transform = at ? `translate(${at.dx}px, ${at.dy}px)` : '';
    piece.classList.toggle('duel-piece--carried', moved !== null);
    options.onMove?.(moved, piece);
  };
  return {
    onPointerDown(e: PointerEvent<HTMLElement>): void {
      if (disabled) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      start.current = { x: e.clientX, y: e.clientY };
      place(e.currentTarget, { dx: 0, dy: 0 });
    },
    onPointerMove(e: PointerEvent<HTMLElement>): void {
      const from = start.current;
      if (from) place(e.currentTarget, { dx: e.clientX - from.x, dy: e.clientY - from.y });
    },
    onPointerUp(e: PointerEvent<HTMLElement>): void {
      const from = start.current;
      if (!from) return;
      start.current = null;
      place(e.currentTarget, null);
      onRelease({ x: e.clientX, y: e.clientY }, { dx: e.clientX - from.x, dy: e.clientY - from.y });
    },
    onPointerCancel(e: PointerEvent<HTMLElement>): void {
      start.current = null;
      place(e.currentTarget, null);
    },
  };
}
