// Whether the player asked the device for less motion (`prefers-reduced-motion: reduce`): screens then show their
// end state at once, without flights, shakes or count-ups.
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
