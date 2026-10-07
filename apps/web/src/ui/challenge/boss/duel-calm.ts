// The boss fight with less motion: when the device asks for it (`prefers-reduced-motion`) or the game runs on its
// light setting (`?quality=low`). The camera then jumps instead of flying, nothing shakes, the orbs stand still and a
// blow shows a few sparks; the fight plays the same.
import { readQuality } from '../../../game/quality';
import { prefersReducedMotion } from '../../kit/reduced-motion';

export function duelCalm(): boolean {
  return prefersReducedMotion() || readQuality(window.location.search).level === 'low';
}
