import { describe, expect, it } from 'vitest';
import { describeMinigame } from '../../testing/describe-minigame';
import { isOpen, KIDS, PERIOD } from './logic';

describeMinigame('cat-mouse');

describe('cat and mouse rules', () => {
  it('raises half the gaps at a time, taking turns', () => {
    const up = (t: number) => Array.from({ length: KIDS }, (_, k) => isOpen(k, t)).filter(Boolean).length;
    expect(up(0.1)).toBe(KIDS / 2);
    expect(isOpen(0, 0.1)).toBe(!isOpen(0, PERIOD + 0.1));
  });
});
