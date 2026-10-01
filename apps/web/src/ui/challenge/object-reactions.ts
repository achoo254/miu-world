// Objects react while the child plays, on every mechanic at once (Jev review decision "playful objects"):
// whatever lands in a drop zone (an apple in the basket, a stone on its slot, a card in a crate) pops in,
// and the zone gulps it. It watches the play area for pieces arriving in a `data-drop-zone`, so dragging
// and tap-to-select both count, and a new mechanic needs nothing but its drop zones. Motion lives in
// challenge.css under prefers-reduced-motion: no-preference.
import { DROP_ZONE_ATTR } from './use-pointer-drag';

export const LANDED = 'object-landed';
export const GULP = 'zone-gulp';
const SETTLE_MS = 600;

/** Plays `className` once on `el`, even if it played a moment ago. */
export function replay(el: Element, className: string): void {
  el.classList.remove(className);
  void (el as HTMLElement).offsetWidth; // restart the animation
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), SETTLE_MS);
}

/** Starts reacting to pieces that land in the drop zones under `area`; returns the stop function. */
export function watchLandings(area: HTMLElement): () => void {
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const zone = record.target instanceof Element ? record.target.closest(`[${DROP_ZONE_ATTR}]`) : null;
      // The pool the pieces start in is where they go back to, not a landing.
      if (!zone || zone.getAttribute(DROP_ZONE_ATTR) === 'source' || zone.getAttribute(DROP_ZONE_ATTR) === 'pool') continue;
      let landed = false;
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          replay(node, LANDED);
          landed = true;
        }
      });
      if (landed) replay(zone, GULP);
    }
  });
  observer.observe(area, { childList: true, subtree: true });
  return () => observer.disconnect();
}
