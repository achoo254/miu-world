import { describe, expect, it } from 'vitest';
import { canStep, MAX_CLIMB, MAX_DROP } from './traversal';

describe('canStep', () => {
  it('walks level whatever the room overhead', () => {
    expect(canStep(5, 2, 5, 2)).toBe(true);
    expect(canStep(5, 7, 5, 2)).toBe(true);
  });

  it('steps up one block with three open blocks over the first spot', () => {
    expect(canStep(5, 3, 6, 2)).toBe(true);
    expect(canStep(5, 2, 6, 2)).toBe(false);
  });

  it('climbs two blocks only with room over the first spot for the body to rise', () => {
    expect(canStep(5, 4, 5 + MAX_CLIMB, 2)).toBe(true);
    expect(canStep(5, 3, 5 + MAX_CLIMB, 2)).toBe(false);
  });

  it('never climbs three blocks', () => {
    expect(canStep(5, 7, 5 + MAX_CLIMB + 1, 7)).toBe(false);
  });

  it('drops three blocks with open blocks over the lower spot all the way up', () => {
    expect(canStep(8, 2, 8 - MAX_DROP, 5)).toBe(true);
    expect(canStep(8, 2, 8 - MAX_DROP, 4)).toBe(false);
    expect(canStep(8, 2, 7, 3)).toBe(true);
    expect(canStep(8, 2, 7, 2)).toBe(false);
  });

  it('never drops four blocks', () => {
    expect(canStep(9, 7, 9 - MAX_DROP - 1, 7)).toBe(false);
  });
});
