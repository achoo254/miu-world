// Scripted route for automated perf runs (?autopilot=1): walks/runs spawn → bridge → parrot →
// ancient tree and back, forever, so every run measures the same camera path.
import type { Vector3 } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { MoveIntent } from './player-controller';

export class Autopilot {
  private readonly waypoints: Array<[number, number]>;
  private index = 0;
  private elapsed = 0;
  private stuckFor = 0;
  private lastDistance = Infinity;

  constructor(entities: WorldEntities) {
    const at = (id: string): [number, number] => {
      const lm = entities.landmarks.find((l) => l.id === id);
      if (!lm) throw new Error(`landmark ${id} missing`);
      return [lm.position[0], lm.position[2]];
    };
    const spawn: [number, number] = [entities.spawn.position[0], entities.spawn.position[2]];
    const bridge = at('bridge');
    const parrot = entities.npcs[0];
    const tree = at('chest');
    this.waypoints = [
      spawn,
      [bridge[0], bridge[1] - 7],
      [bridge[0], bridge[1] + 7],
      parrot ? [parrot.position[0] - 1.5, parrot.position[2] - 1.5] : bridge,
      tree,
      [bridge[0], bridge[1] + 7],
      [bridge[0], bridge[1] - 7],
    ];
  }

  intent(dt: number, position: Vector3): MoveIntent {
    this.elapsed += dt;
    const target = this.waypoints[this.index] ?? [position.x, position.z];
    const dx = target[0] - position.x;
    const dz = target[1] - position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2) this.index = (this.index + 1) % this.waypoints.length;
    // Not closing in (tree, 2-block ledge): hop, like a player would.
    this.stuckFor = dist > this.lastDistance - 0.5 * dt ? this.stuckFor + dt : 0;
    this.lastDistance = dist;
    const jump = this.stuckFor > 0.6;
    if (jump) this.stuckFor = 0;
    // Alternate walking and running every 8 s so both animation paths are exercised.
    const run = Math.floor(this.elapsed / 8) % 2 === 1;
    return { dirX: dx / Math.max(dist, 1e-6), dirZ: dz / Math.max(dist, 1e-6), run, jump };
  }
}
