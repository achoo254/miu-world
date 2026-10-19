// Where the Interact label goes on screen: over its target, but never resting on the child's own head. A target just
// behind her (a parrot at her shoulder) puts its label right on top of her, where it reads as her own; the label then
// moves straight up until it clears her head.

/** A box on screen, in pixels from the top left. */
export interface ScreenBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Pixels kept between the label and her head. */
export const HEAD_GAP = 12;

/**
 * The label's bottom centre: `at` as it is when the label (`width` × `height`) keeps clear of `her`, else straight
 * above her head with `gap` to spare. A label wholly under her (a target in front, lower down) stays where it is.
 */
export function promptClearOf(at: { x: number; y: number }, label: { width: number; height: number }, her: ScreenBox, gap = HEAD_GAP): { x: number; y: number } {
  const left = at.x - label.width / 2;
  const right = at.x + label.width / 2;
  if (right <= her.left || left >= her.right) return at;
  if (at.y - label.height >= her.bottom) return at;
  if (at.y <= her.top - gap) return at;
  return { x: at.x, y: her.top - gap };
}
