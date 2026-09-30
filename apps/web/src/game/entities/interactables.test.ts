import { describe, expect, it } from 'vitest';
import { pickNearest } from './interactables';

const target = (id: string, position: [number, number, number], radius: number, available = true) => ({
  available,
  def: { id, position, radius },
});

describe('pickNearest', () => {
  const parrot = target('parrot-guide', [10, 0, 10], 3);
  const box = target('clue-box', [12, 0, 10], 2);

  it('returns nothing when the player is outside every radius', () => {
    expect(pickNearest([parrot, box], { x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('picks the closest target among those in range', () => {
    expect(pickNearest([parrot, box], { x: 11.6, y: 0, z: 10 })?.def.id).toBe('clue-box');
    expect(pickNearest([parrot, box], { x: 10.4, y: 0, z: 10 })?.def.id).toBe('parrot-guide');
  });

  it('skips hidden targets even when they are closer', () => {
    const hiddenBox = target('clue-box', [12, 0, 10], 2, false);
    expect(pickNearest([parrot, hiddenBox], { x: 11.6, y: 0, z: 10 })?.def.id).toBe('parrot-guide');
  });

  it('counts height, so a target on a ledge above is out of reach', () => {
    expect(pickNearest([box], { x: 12, y: 3, z: 10 })).toBeNull();
  });
});
