import { describe, expect, it } from 'vitest';
import { bestBoom, driveFor } from './logic';
import { describeMinigame } from '../../testing/describe-minigame';

describeMinigame('sail-wind');

describe('sail with the wind rules', () => {
  it('draws nothing with the sail along the wind or the boat straight into it', () => {
    // Wind from behind (blowing the way the boat goes), boom along the boat: no push.
    expect(driveFor(0, 0, 0)).toBeCloseTo(0);
    // Straight into the wind: no boom helps.
    expect(driveFor(Math.PI, 0, bestBoom(Math.PI, 0))).toBeLessThan(0.05);
  });

  it('draws well with the sail square to a wind from behind, and across a side wind', () => {
    expect(driveFor(0, 0, bestBoom(0, 0))).toBeGreaterThan(0.95);
    expect(driveFor(Math.PI / 2, 0, bestBoom(Math.PI / 2, 0))).toBeGreaterThan(0.4);
  });
});
