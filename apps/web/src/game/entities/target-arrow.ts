// Direction arrow above the player's head, pointing at the quest's current target (bridge command
// `set-target-hint`). Hidden when there is no target or the player is already in reach. One draw call.
import { ConeGeometry, Mesh, MeshLambertMaterial, type Vector3 } from 'three';

const HEIGHT_ABOVE_PLAYER = 3.1;
const BOB = 0.12;

export interface TargetArrow {
  readonly mesh: Mesh;
  /** `target` is the goal position and its interaction radius, or null for no hint. */
  update(dt: number, player: Vector3, target: { position: readonly number[]; radius: number } | null): void;
}

export function createTargetArrow(): TargetArrow {
  // A cone lying along +z: rotating the mesh around y aims it on the ground plane.
  const geometry = new ConeGeometry(0.22, 0.6, 12).rotateX(Math.PI / 2);
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ color: '#ffd23f', emissive: '#6b4d00' }));
  mesh.name = 'target-arrow';
  mesh.visible = false;
  let time = 0;
  return {
    mesh,
    update(dt, player, target) {
      time += dt;
      if (!target) {
        mesh.visible = false;
        return;
      }
      const [x = 0, , z = 0] = target.position;
      const dx = x - player.x;
      const dz = z - player.z;
      mesh.visible = Math.hypot(dx, dz) > target.radius;
      if (!mesh.visible) return;
      mesh.position.set(player.x, player.y + HEIGHT_ABOVE_PLAYER + Math.sin(time * 3) * BOB, player.z);
      mesh.rotation.y = Math.atan2(dx, dz);
    },
  };
}
