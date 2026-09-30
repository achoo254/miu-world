// Dragging for the 2D challenge screens: Pointer Events (mouse, pen and touch alike, no HTML5 drag API,
// which iPad Safari lacks), pointer capture, and drop zones found under the finger. The dragged tile
// moves through its own style (no React render per move); `pointercancel` puts it back.
import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

/** Mark an element as a drop zone with `data-drop-zone="<zone id>"`. */
export const DROP_ZONE_ATTR = 'data-drop-zone';

function zoneAt(x: number, y: number): string | null {
  const el = document.elementFromPoint(x, y);
  return el?.closest(`[${DROP_ZONE_ATTR}]`)?.getAttribute(DROP_ZONE_ATTR) ?? null;
}

/** Travel (px) below which a press counts as a tap (tap-to-select stays available). */
const TAP_SLOP = 8;

export function usePointerDrag(onDrop: (itemId: string, zone: string | null) => void, onTap: (itemId: string) => void) {
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const reset = (el: HTMLElement): void => {
    el.style.transform = '';
    el.style.pointerEvents = '';
    el.style.zIndex = '';
  };
  return useCallback(
    (itemId: string) => ({
      onPointerDown(e: ReactPointerEvent<HTMLElement>) {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: itemId, x: e.clientX, y: e.clientY, moved: false };
      },
      onPointerMove(e: ReactPointerEvent<HTMLElement>) {
        const d = drag.current;
        if (!d || d.id !== itemId) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
        d.moved = true;
        const el = e.currentTarget;
        el.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
        el.style.pointerEvents = 'none'; // let elementFromPoint see the zone under the finger
        el.style.zIndex = '2';
      },
      onPointerUp(e: ReactPointerEvent<HTMLElement>) {
        const d = drag.current;
        drag.current = null;
        if (!d || d.id !== itemId) return;
        reset(e.currentTarget);
        if (d.moved) onDrop(itemId, zoneAt(e.clientX, e.clientY));
        else onTap(itemId);
      },
      onPointerCancel(e: ReactPointerEvent<HTMLElement>) {
        drag.current = null;
        reset(e.currentTarget); // back where it was
      },
      style: { touchAction: 'none' as const },
    }),
    [onDrop, onTap],
  );
}
