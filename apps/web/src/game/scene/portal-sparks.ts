// The portals come alive (owner, 03/10/2026: "làm chạy hiệu ứng"): sparks of each portal's light swirl round
// its opening, the inner ones faster, as a vortex, and drift out of either face, shrinking until they go out,
// then start again. One InstancedMesh for every portal of the map, so it costs a single draw call; fewer
// sparks on the low quality; still when the child asked for less motion.
import { BoxGeometry, Color, DynamicDrawUsage, Euler, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { PORTAL_COLOURS, portalColourOf } from '@miu/voxel/portal-colours';

/** The opening the sparks swirl in (the box prop's arch: five wide, four high, three more at the top). */
const CENTRE_Y = 2.2;
const RADIUS_X = 2.0;
const RADIUS_Y = 1.9;
/** How far out of a face a spark drifts before it goes out (blocks), and how long that takes (s). */
const DRIFT = 1.4;
const DRIFT_SECONDS = 2.6;
const SIZE = 0.16;

export interface PortalSparks {
  readonly mesh: InstancedMesh;
  /** Portals animated on this map. */
  readonly portals: number;
  update(dt: number): void;
  dispose(): void;
}

interface Spark {
  frame: Matrix4;
  /** Share of the way out from the middle (0 at the core … 1 at the rim). */
  ring: number;
  angle: number;
  /** Radians per second: inner sparks turn faster. */
  spin: number;
  /** 0 … 1 of its drift out of the face. */
  phase: number;
  /** Which face it drifts out of. */
  face: 1 | -1;
}

export function createPortalSparks(
  props: ReadonlyArray<{ model: string; position: readonly number[]; yaw: number; scale?: number }>,
  options: { perPortal: number; still: boolean },
): PortalSparks {
  const portals = props.flatMap((p) => {
    const colour = portalColourOf(p.model);
    return colour ? [{ colour, p }] : [];
  });
  const count = Math.max(1, portals.length * options.perPortal);
  const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ toneMapped: false }), count);
  mesh.name = 'portal-sparks';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false; // spread over the whole map
  mesh.visible = portals.length > 0;
  mesh.count = portals.length * options.perPortal;
  const sparks: Spark[] = [];
  const colour = new Color();
  for (const { colour: name, p } of portals) {
    const [, , light, core] = PORTAL_COLOURS[name];
    const s = p.scale ?? 1;
    const frame = new Matrix4().compose(new Vector3(p.position[0] ?? 0, p.position[1] ?? 0, p.position[2] ?? 0), new Quaternion().setFromEuler(new Euler(0, (p.yaw * Math.PI) / 180, 0)), new Vector3(s, s, s));
    for (let i = 0; i < options.perPortal; i++) {
      const ring = 0.35 + 0.65 * (((i * 7) % options.perPortal) / options.perPortal);
      mesh.setColorAt(sparks.length, colour.set(i % 4 === 0 ? '#ffffff' : i % 2 === 0 ? core : light));
      sparks.push({ frame, ring, angle: (i / options.perPortal) * Math.PI * 2 * 3, spin: 2.2 - 1.4 * ring, phase: (i * 0.37) % 1, face: i % 2 === 0 ? 1 : -1 });
    }
  }
  const local = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  const turn = new Quaternion();
  const tumble = new Euler();
  const place = (): void => {
    sparks.forEach((spark, i) => {
      // Round the opening, tightening a little as it drifts out; out of its face, shrinking as it goes.
      const r = spark.ring * (1 - 0.35 * spark.phase);
      at.set(Math.cos(spark.angle) * RADIUS_X * r, CENTRE_Y + Math.sin(spark.angle) * RADIUS_Y * r, spark.face * (0.1 + DRIFT * spark.phase));
      const k = SIZE * (1.1 - spark.phase);
      size.set(k, k, k);
      turn.setFromEuler(tumble.set(spark.angle, spark.angle * 0.7, 0));
      local.compose(at, turn, size);
      mesh.setMatrixAt(i, local.premultiply(spark.frame));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place();
  return {
    mesh,
    portals: portals.length,
    update(dt) {
      if (options.still || sparks.length === 0) return;
      for (const spark of sparks) {
        spark.angle += spark.spin * dt;
        spark.phase += dt / DRIFT_SECONDS;
        if (spark.phase >= 1) spark.phase -= 1;
      }
      place();
    },
    dispose() {
      mesh.geometry.dispose();
      (mesh.material as MeshBasicMaterial).dispose();
      mesh.dispose();
    },
  };
}
