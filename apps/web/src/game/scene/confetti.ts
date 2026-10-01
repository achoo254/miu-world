// Confetti for a finished quest: paper squares burst up around the child, tumble and drift down, then
// vanish. One InstancedMesh, so the whole burst is a single draw call on the iPad; hidden when idle.
import { Color, DoubleSide, DynamicDrawUsage, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from 'three';

const PIECES = 90;
const SECONDS = 2.8;
const GRAVITY = 6;
/** The game's pastel party colours (pink, sun, sky, leaf, lilac, peach). */
const COLOURS = ['#f2609a', '#ffd23f', '#4c93ff', '#6cc04a', '#b07cff', '#ff9a62'];

export interface Confetti {
  readonly mesh: InstancedMesh;
  /** Bursts around `at` (the child's feet). */
  burst(at: { x: number; y: number; z: number }): void;
  update(dt: number): void;
  readonly active: boolean;
}

export function createConfetti(random: () => number = Math.random): Confetti {
  const mesh = new InstancedMesh(new PlaneGeometry(0.16, 0.24), new MeshBasicMaterial({ side: DoubleSide }), PIECES);
  mesh.name = 'confetti';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const colour = new Color();
  for (let i = 0; i < PIECES; i++) mesh.setColorAt(i, colour.set(COLOURS[i % COLOURS.length] ?? '#ffffff'));
  const pieces = Array.from({ length: PIECES }, () => ({ pos: new Vector3(), vel: new Vector3(), spin: new Vector3(), rot: new Vector3() }));
  const dummy = new Object3D();
  let left = 0;

  return {
    mesh,
    get active() {
      return left > 0;
    },
    burst(at) {
      for (const p of pieces) {
        const angle = random() * Math.PI * 2;
        const out = 1.5 + random() * 2.5;
        p.pos.set(at.x + Math.cos(angle) * 0.4, at.y + 1.6, at.z + Math.sin(angle) * 0.4);
        p.vel.set(Math.cos(angle) * out, 4 + random() * 4, Math.sin(angle) * out);
        p.rot.set(random() * 6, random() * 6, random() * 6);
        p.spin.set(random() * 10 - 5, random() * 10 - 5, random() * 10 - 5);
      }
      left = SECONDS;
      mesh.visible = true;
    },
    update(dt) {
      if (left <= 0) return;
      left -= dt;
      if (left <= 0) {
        mesh.visible = false;
        return;
      }
      pieces.forEach((p, i) => {
        // Paper: it falls slowly once the burst is spent, drifting and tumbling.
        p.vel.y = Math.max(p.vel.y - GRAVITY * dt, -1.6);
        p.vel.x *= 1 - 1.5 * dt;
        p.vel.z *= 1 - 1.5 * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.rot.addScaledVector(p.spin, dt);
        dummy.position.copy(p.pos);
        dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
