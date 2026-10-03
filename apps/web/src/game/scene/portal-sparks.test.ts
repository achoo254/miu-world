import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createPortalSparks } from './portal-sparks';

const props = [
  { model: 'generated/box-props/tt-portal-green.glb', position: [100.5, 12, 50.5], yaw: 180 },
  { model: 'generated/box-props/tt-portal-violet.glb', position: [120.5, 12, 50.5], yaw: 90 },
  { model: 'packs/kenney-nature/2.1/tree_small.glb', position: [10, 12, 10], yaw: 0 },
];
const spot = (sparks: ReturnType<typeof createPortalSparks>, i: number): Vector3 => {
  const m = new Matrix4();
  sparks.mesh.getMatrixAt(i, m);
  return new Vector3().setFromMatrixPosition(m);
};

describe('portal sparks', () => {
  it('swirls sparks in every portal of the map, none elsewhere, in one draw', () => {
    const sparks = createPortalSparks(props, { perPortal: 20, still: false });
    expect(sparks.portals).toBe(2);
    expect(sparks.mesh.count).toBe(40);
    // In its portal's opening: within the arch across, over the ground, a little out of either face.
    for (let i = 0; i < 20; i++) {
      const p = spot(sparks, i);
      expect(Math.abs(p.x - 100.5)).toBeLessThan(2.1);
      expect(p.y).toBeGreaterThan(12);
      expect(p.y).toBeLessThan(12 + 4.2);
      expect(Math.abs(p.z - 50.5)).toBeLessThan(1.6);
    }
    // The second portal turns with its yaw: its opening runs along z.
    for (let i = 20; i < 40; i++) expect(Math.abs(spot(sparks, i).x - 120.5)).toBeLessThan(1.6);
  });

  it('moves on every frame, and holds still when the child asked for less motion', () => {
    const moving = createPortalSparks(props, { perPortal: 8, still: false });
    const before = spot(moving, 3);
    moving.update(0.25);
    expect(spot(moving, 3).distanceTo(before)).toBeGreaterThan(0.05);
    const still = createPortalSparks(props, { perPortal: 8, still: true });
    const held = spot(still, 3);
    still.update(0.25);
    expect(spot(still, 3).distanceTo(held)).toBe(0);
  });
});
