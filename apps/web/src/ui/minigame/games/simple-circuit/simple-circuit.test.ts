import { describe, expect, it } from 'vitest';
import { describeMinigame } from '../../testing/describe-minigame';
import { litParts, loopOf, type Part, type Wire } from './logic';

describeMinigame('simple-circuit');

describe('simple circuit rules', () => {
  const part = (kind: Part['kind'], closed = false): Part => ({ kind, centre: { x: 0, y: 0 }, clips: [{ x: 0, y: 0 }, { x: 0, y: 0 }], closed });
  const wire = (a: number, ac: 0 | 1, b: number, bc: 0 | 1): Wire => [
    [a, ac],
    [b, bc],
  ];

  it('lights a bulb only on a closed loop with the switch closed', () => {
    const parts = [part('battery'), part('bulb'), part('switch')];
    const open = [wire(0, 0, 1, 0), wire(1, 1, 2, 0)];
    expect(loopOf({ parts, wires: open })).toBeNull();
    const closed = [...open, wire(2, 1, 0, 1)];
    expect(loopOf({ parts, wires: closed })).toEqual([1, 2]);
    expect(litParts({ parts, wires: closed })).toEqual([]);
    expect(litParts({ parts: [part('battery'), part('bulb'), part('switch', true)], wires: closed })).toEqual([1, 2]);
  });

  it('keeps a loop through a leaf dark', () => {
    const parts = [part('battery'), part('bulb'), part('leaf')];
    expect(litParts({ parts, wires: [wire(0, 0, 1, 0), wire(1, 1, 2, 0), wire(2, 1, 0, 1)] })).toEqual([]);
  });
});
