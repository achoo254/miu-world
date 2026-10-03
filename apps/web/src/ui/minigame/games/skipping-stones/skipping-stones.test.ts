import { describe, expect, it } from 'vitest';
import { describeMinigame } from '../../testing/describe-minigame';
import { MAX_SKIPS, skipsFor } from './logic';

// Slow, slanted swipes skip once or twice: not enough.
describeMinigame('skipping-stones', { loser: () => ({ swipe: { from: { x: 60, y: 450 }, dx: 60, dy: 50 } }) });

describe('skipping stones rules', () => {
  it('skips most for a fast level swipe, little for a slow or slanted one, never for a swipe the wrong way', () => {
    expect(skipsFor({ dx: 400, dy: 0, speed: 3000 })).toBe(MAX_SKIPS);
    expect(skipsFor({ dx: 400, dy: 0, speed: 400 })).toBeLessThanOrEqual(2);
    expect(skipsFor({ dx: 200, dy: 200, speed: 3000 })).toBe(1);
    expect(skipsFor({ dx: -300, dy: 0, speed: 3000 })).toBe(0);
  });
});
