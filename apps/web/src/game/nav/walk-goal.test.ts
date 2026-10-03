import { describe, expect, it } from 'vitest';
import type { Interactable } from '@miu/voxel/world-entities';
import { SPOT_REACH, planWalk, type GoalTarget } from './walk-goal';

const def = (id: string, extra: Partial<Interactable> = {}): Interactable => ({ id, kind: 'npc', name: id, label: 'Nói chuyện', position: [10, 13, 20], yaw: 0, radius: 2.5, ...extra });

describe('planWalk', () => {
  const targets = new Map<string, GoalTarget>([
    ['parrot', { def: def('parrot'), available: true }],
    ['gate', { def: def('gate', { kind: 'gate', travel: 'nong-trai', radius: 3 }), available: true }],
    ['stop', { def: def('stop', { kind: 'object', ride: [50, 13, 60] }), available: true }],
    ['hidden', { def: def('hidden'), available: false }],
  ]);
  const targetOf = (id: string): GoalTarget | undefined => targets.get(id);

  it('walks to a character and greets it on arrival', () => {
    const walk = planWalk({ targetId: 'parrot' }, targetOf);
    expect(walk?.target.position).toEqual([10, 13, 20]);
    expect(walk?.target.radius).toBe(2.5);
    expect(walk?.interactOnArrival).toBe(true);
  });

  it('stops beside a gate or a ride stop without going through or getting on', () => {
    expect(planWalk({ targetId: 'gate' }, targetOf)?.interactOnArrival).toBe(false);
    expect(planWalk({ targetId: 'stop' }, targetOf)?.interactOnArrival).toBe(false);
  });

  it('walks to a spot on the ground and stops near it', () => {
    expect(planWalk({ position: [81.5, 13, 80.5] }, targetOf)).toEqual({ target: { position: [81.5, 13, 80.5], radius: SPOT_REACH }, interactOnArrival: false });
  });

  it('has nowhere to go for a target not on this map, one hidden now, or a spot that is no number', () => {
    expect(planWalk({ targetId: 'elsewhere' }, targetOf)).toBeNull();
    expect(planWalk({ targetId: 'hidden' }, targetOf)).toBeNull();
    expect(planWalk({ position: [Number.NaN, 13, 2] }, targetOf)).toBeNull();
  });
});
