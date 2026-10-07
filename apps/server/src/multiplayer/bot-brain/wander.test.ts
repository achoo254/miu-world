import { describe, expect, it } from 'vitest';
import type { WalkPlace } from '@miu/voxel/walk-cells';
import { HOME_LEASH, PLACE_REACH, wanderChooser, type BotView } from './wander';
import { drawnMap, openMap } from './walk-fixtures';

const seq = (...values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length] ?? 0;
};

describe('the wandering chooser', () => {
  const stop: WalkPlace = { id: 'ben-xe-1', kind: 'stop', at: [5.5, 1, 5.5], ride: [50.5, 1, 50.5] };
  const npc: WalkPlace = { id: 'co-giao', kind: 'npc', at: [20.5, 1, 10.5] };
  const map = drawnMap(Array.from({ length: 64 }, () => '1'.repeat(64)), { places: [stop, npc] });
  const view = (x: number, z: number, home = { x: 10, y: 1, z: 10 }): BotView => ({ map, at: { x, y: 1, z }, home, sight: 20 });

  it('walks to a place it sees, not the one it just went to', () => {
    const chooser = wanderChooser(seq(0.1, 0.9));
    const first = chooser.next(view(10, 10), { kind: 'rested' });
    expect(first).toMatchObject({ kind: 'go', place: { id: 'co-giao' }, goal: { x: 20.5, y: 1, z: 10.5, reach: PLACE_REACH } });
    const second = chooser.next(view(10, 10), { kind: 'rested' });
    expect(second).toMatchObject({ kind: 'go', place: { id: 'ben-xe-1' } });
  });

  it('otherwise heads for a spot it sees off in some direction, back towards home once far from it', () => {
    const chooser = wanderChooser(seq(0.99, 0.25, 0.5));
    const away = chooser.next(view(10, 10), { kind: 'rested' });
    expect(away).toMatchObject({ kind: 'go', place: null, goal: { y: 1 } });
    // A spot it sees: within its sight, one to stand on.
    if (away.kind !== 'go') throw new Error('no goal');
    expect(Math.max(Math.abs(away.goal.x - 10.5), Math.abs(away.goal.z - 10.5))).toBeLessThanOrEqual(20);
    expect(map.standAt(Math.floor(away.goal.x), 1, Math.floor(away.goal.z))).not.toBe(0);
    // Nothing to stand on anywhere it looks: it stays a moment.
    expect(wanderChooser(seq(0.99)).next({ ...view(0, 0), map: drawnMap(['1']) }, { kind: 'rested' })).toMatchObject({ kind: 'rest' });
    const far = openMap(400);
    const home = { x: 10, y: 1, z: 10 };
    const back = wanderChooser(seq(0.5)).next({ map: far, at: { x: 10 + HOME_LEASH + 50, y: 1, z: 10 }, home, sight: 20 }, { kind: 'stuck' });
    expect(back.kind === 'go' && back.goal.x).toBeLessThan(10 + HOME_LEASH + 50);
  });

  it('stays a while where it arrives (busy at a person or a thing), and sometimes rides from a stop', () => {
    expect(wanderChooser(seq(0.5)).next(view(20, 10), { kind: 'arrived', place: npc })).toMatchObject({ kind: 'work' });
    expect(wanderChooser(seq(0.5)).next(view(20, 10), { kind: 'arrived', place: null })).toMatchObject({ kind: 'rest' });
    expect(wanderChooser(seq(0.1)).next(view(5, 5), { kind: 'arrived', place: stop })).toEqual({ kind: 'ride', stop, to: { x: 50, y: 1, z: 50 } });
    expect(wanderChooser(seq(0.9)).next(view(5, 5), { kind: 'arrived', place: stop })).toMatchObject({ kind: 'rest' });
  });
});
