// Wayfinding in the world (bridge command `set-target-hint`): a flat golden arrow on the ground by
// Miu's feet points toward the quest's current target and nudges forward like a guide; once the target
// is close, a spinning gem bobs above it. Hidden when there is no target or the player is in reach.
// One draw call each, and only the ones in view are drawn.
import {
  BufferAttribute,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Arrow palette: warm gold on a dark brown rim, readable on grass, path and sand alike. */
const FILL = '#ffd23f';
const RIM = '#7a4a00';
const GEM = '#ffcf2e';
const GEM_GLOW = '#8a5a00';

/** How far from Miu's feet the arrow sits, and how far it slides forward in each nudge (blocks). */
const ARROW_RADIUS = 1.6;
const ARROW_SLIDE = 0.35;
/** Above the ground at Miu's feet, so blocky terrain does not swallow it. */
const ARROW_LIFT = 0.18;
/** The gem shows once the target is this close (blocks) and hangs this high above it. */
const GEM_RANGE = 9;
const GEM_HEIGHT = 2.6;

export interface TargetArrow {
  /** Add this to the scene. */
  readonly root: Group;
  /** Whether a hint is showing (arrow or gem) after the last update. */
  readonly showing: boolean;
  /** `target` is the goal position and its interaction radius, or null for no hint. */
  update(dt: number, player: Vector3, target: { position: readonly number[]; radius: number } | null): void;
}

/** A chunky arrow pointing along +y in its own plane: a short shaft under a wide head. */
function arrowShape(scale: number): Shape {
  const shaft = 0.2 * scale;
  const head = 0.46 * scale;
  const s = new Shape();
  s.moveTo(-shaft, -0.42 * scale);
  s.lineTo(shaft, -0.42 * scale);
  s.lineTo(shaft, 0.02 * scale);
  s.lineTo(head, 0.02 * scale);
  s.lineTo(0, 0.52 * scale);
  s.lineTo(-head, 0.02 * scale);
  s.lineTo(-shaft, 0.02 * scale);
  s.closePath();
  return s;
}

function colored(geometry: BufferGeometry, color: string): BufferGeometry {
  const c = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** Rim and fill in one mesh, the fill just above the rim once laid flat, its point toward +z. */
function arrowGeometry(): BufferGeometry {
  const rim = colored(new ShapeGeometry(arrowShape(1.28)).translate(0, -0.03, 0), RIM);
  const fill = colored(new ShapeGeometry(arrowShape(1)).translate(0, 0, -0.012), FILL);
  const merged = mergeGeometries([rim, fill]);
  if (!merged) throw new Error('arrow geometry did not merge');
  return merged.rotateX(Math.PI / 2);
}

export function createTargetArrow(): TargetArrow {
  const root = new Group();
  root.name = 'target-hint';

  // Drawn over everything: with the camera behind Miu, an arrow pointing straight ahead would
  // otherwise hide under her.
  const arrow = new Mesh(arrowGeometry(), new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, transparent: true, depthTest: false, depthWrite: false }));
  arrow.name = 'target-arrow';
  arrow.visible = false;
  arrow.renderOrder = 10;

  const gem = new Mesh(new OctahedronGeometry(0.32).scale(1, 1.45, 1), new MeshLambertMaterial({ color: GEM, emissive: GEM_GLOW }));
  gem.name = 'target-gem';
  gem.visible = false;

  root.add(arrow, gem);
  let time = 0;
  let showing = false;
  return {
    root,
    get showing() {
      return showing;
    },
    update(dt, player, target) {
      time += dt;
      arrow.visible = false;
      gem.visible = false;
      showing = false;
      if (!target) return;
      const [x = 0, y = 0, z = 0] = target.position;
      const dx = x - player.x;
      const dz = z - player.z;
      const distance = Math.hypot(dx, dz);
      if (distance <= target.radius) return;
      showing = true;

      // Ease out toward the target, then start over: reads as "this way".
      const nudge = (time * 0.9) % 1;
      const slide = ARROW_RADIUS + ARROW_SLIDE * (1 - (1 - nudge) ** 2);
      const heading = Math.atan2(dx, dz);
      arrow.visible = true;
      arrow.position.set(player.x + Math.sin(heading) * slide, player.y + ARROW_LIFT, player.z + Math.cos(heading) * slide);
      arrow.rotation.y = heading;
      (arrow.material as MeshBasicMaterial).opacity = 1 - 0.45 * nudge ** 3;

      if (distance < GEM_RANGE) {
        gem.visible = true;
        gem.position.set(x, y + GEM_HEIGHT + Math.sin(time * 3) * 0.15, z);
        gem.rotation.y = time * 1.8;
      }
    },
  };
}
