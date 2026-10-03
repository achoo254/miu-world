// The vehicle that carries the child on a ride, and where she sits or stands on it. A balloon, a cable car cabin
// and a boat are the stop's own model (it leaves the stop with her; the balloon fills out to its flying size, the
// cabin's glass shows her inside). The stops of the buses and the forest train show a small car and a carriage
// smaller than the child, so those rides come with the life-size bus and engine of the vehicle catalogue (built
// in code, the ones she can drive herself), seated at the wheel. One draw call each (two for the cabin).
import { Box3, Color, Group, Mesh, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { clone as cloneModel } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { InteractableObject } from '../entities/interactables';
import { PLAYER_SCALE, type SeatedPose } from '../entities/player-character';
import { createAccessoryMesh } from '../character/character-accessories';
import { resolveOutfitEntry } from '../content/accessories';
import { rideLift, seatedPose } from '../player/vehicle-ride';
import type { RideKind } from './ride-kind';

export interface RideVehicle {
  /** At the ground point under the vehicle's centre; the journey moves and turns it (rotation order YXZ). */
  readonly root: Group;
  readonly pose: SeatedPose | null;
  /** Half the vehicle's width (blocks): she gets off beside it. */
  readonly halfWidth: number;
  /** Her feet (world position) where she rides now. */
  seatWorld(out: Vector3): Vector3;
  /** 0…1: the vehicle filling out at the stop (the balloon), 1 once it travels. */
  setGrowth(amount: number): void;
  setOpacity(amount: number): void;
  /** Bob, roll and rumble as it goes; `speed` in blocks a second. */
  update(dt: number, speed: number): void;
  dispose(): void;
}

/** The life-size catalogue vehicle a ride of this kind brings, when the stop's own model is not one. */
const CATALOGUE_VEHICLE: Partial<Record<RideKind, string>> = { bus: 'vehicle-bus-yellow', train: 'vehicle-train-red' };
/** The balloon flies this much bigger than it stands at the stop: its basket holds her, the envelope clears her ears. */
const BALLOON_FLYING_SCALE = 1.6;
const CABIN_SCALE = 1.4;
/** The cabin's window glass (box-props/nui-tuyet.json): drawn see-through on the ride so she shows inside. */
const CABIN_GLASS = '#a9d8f2';
const GLASS_OPACITY = 0.35;
/**
 * Where she rides on the stop's own models, in blocks at the size the stop shows them, along its length
 * (+ toward the front) and her feet's height: in the balloon's basket (the basket hides her legs), on the
 * cabin's floor, on the rowing boat's back thwart, low in the canoe (the rig's sit pose puts the seat of
 * her trousers 0.1 x PLAYER_SCALE over her feet).
 */
const SEATS: ReadonlyArray<{ match: RegExp; feet: number; forward: number; pose: SeatedPose | null }> = [
  { match: /balloon/, feet: 0.28, forward: 0, pose: null },
  { match: /cable-cabin/, feet: 0.75, forward: 0, pose: null },
  { match: /rowboat/, feet: 0.48 - 0.1 * PLAYER_SCALE, forward: -0.75, pose: 'sit' },
  { match: /canoe/, feet: 0.05, forward: -0.45, pose: 'sit' },
];

/** The vehicle for a ride of `kind` from `stop`. */
export function createRideVehicle(kind: RideKind, stop: InteractableObject, castShadow: boolean): RideVehicle {
  const catalogue = CATALOGUE_VEHICLE[kind];
  return catalogue ? catalogueVehicle(catalogue, kind, castShadow) : stopVehicle(kind, stop, castShadow);
}

interface Parts {
  root: Group;
  /** Bob and roll go here; the model and her seat ride on it. */
  motion: Group;
  model: Object3D;
  materials: Material[];
  /** Base opacity of each material (the cabin's glass is part see-through). */
  base: number[];
  owned: BufferGeometry[];
}

function parts(model: Object3D): Parts {
  const root = new Group();
  root.name = 'ride-vehicle';
  root.rotation.order = 'YXZ';
  const motion = new Group();
  root.add(motion);
  motion.add(model);
  return { root, motion, model, materials: [], base: [], owned: [] };
}

/** Own copies of the model's materials, so fading the ride's vehicle leaves the stop's model alone. */
function ownMaterials(p: Parts, castShadow: boolean): void {
  p.model.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    o.castShadow = castShadow;
    o.receiveShadow = false;
    const list = (Array.isArray(o.material) ? o.material : [o.material]).map((m: Material) => {
      const own = m.clone();
      p.materials.push(own);
      p.base.push(1);
      return own;
    });
    o.material = Array.isArray(o.material) ? list : (list[0] ?? o.material);
  });
}

function vehicle(p: Parts, seat: Vector3, pose: SeatedPose | null, kind: RideKind, grow: (amount: number) => void): RideVehicle {
  p.root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(p.motion);
  const halfWidth = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), 0.4);
  let time = 0;
  let opacity = 1;
  return {
    root: p.root,
    pose,
    halfWidth,
    seatWorld(out) {
      // Moved this frame: the matrices are brought up to date first (the renderer does it only when it draws).
      p.root.updateMatrixWorld(true);
      return p.motion.localToWorld(out.copy(seat));
    },
    setGrowth: grow,
    setOpacity(amount) {
      const next = Math.min(1, Math.max(0, amount));
      if (next === opacity) return;
      const wasClear = opacity >= 1;
      opacity = next;
      p.materials.forEach((m, i) => {
        const base = p.base[i] ?? 1;
        if (wasClear !== opacity >= 1 && base >= 1) {
          // A vehicle fading in or out hides nothing behind it.
          m.transparent = opacity < 1;
          m.depthWrite = opacity >= 1;
          m.needsUpdate = true;
        }
        m.opacity = base * opacity;
      });
    },
    update(dt, speed) {
      time += dt;
      const going = Math.min(1, Math.abs(speed) / 8);
      if (kind === 'boat') {
        p.motion.position.y = 0.06 * Math.sin(time * 2.2);
        p.motion.rotation.z = 0.045 * Math.sin(time * 1.6);
      } else if (kind === 'balloon') {
        p.motion.rotation.z = 0.035 * Math.sin(time * 0.9);
        p.motion.rotation.x = 0.025 * Math.sin(time * 0.7 + 1);
      } else if (kind === 'cable-car') {
        p.motion.rotation.x = 0.05 * Math.sin(time * 1.3) * (0.3 + going);
      } else {
        // The engine's rumble on the road.
        p.motion.position.y = 0.025 * Math.sin(time * 19) * going;
      }
    },
    dispose() {
      p.root.removeFromParent();
      for (const m of p.materials) m.dispose();
      for (const g of p.owned) g.dispose();
    },
  };
}

function catalogueVehicle(entry: string, kind: RideKind, castShadow: boolean): RideVehicle {
  const { def, variant } = resolveOutfitEntry(entry);
  const spec = def.ride ?? { height: 0.5, pose: 'sit' as const };
  const mesh = createAccessoryMesh(def, variant);
  const [ox, oy, oz] = def.offset;
  mesh.scale.setScalar(PLAYER_SCALE);
  mesh.position.set(ox * PLAYER_SCALE, oy * PLAYER_SCALE, oz * PLAYER_SCALE);
  mesh.name = `ride:${def.id}`;
  const p = parts(mesh);
  p.owned.push(mesh.geometry);
  ownMaterials(p, castShadow);
  return vehicle(p, new Vector3(0, rideLift(spec) * PLAYER_SCALE, 0), seatedPose(spec), kind, () => undefined);
}

function stopVehicle(kind: RideKind, stop: InteractableObject, castShadow: boolean): RideVehicle {
  // The stop's visual (the holder's child), still: no bob, no spin. A model of several parts is one skinned mesh
  // over its part nodes (merge-parts.ts): the copy is bound to its own nodes, or it would stay at the stop.
  const visual = stop.root.children[0];
  const model = visual ? cloneModel(visual) : new Group();
  model.position.set(0, 0, 0);
  const shaped = new Group();
  shaped.add(model);
  const p = parts(shaped);
  ownMaterials(p, castShadow);
  // A boat built along x turns its bow (+x) to the front (+z).
  const size = new Box3().setFromObject(model).getSize(new Vector3());
  if (kind === 'boat' && size.x > size.z * 1.2) model.rotation.y = -Math.PI / 2;
  const modelPath = stop.def.model ?? '';
  const seat = SEATS.find((s) => s.match.test(modelPath)) ?? { feet: size.y * 0.3, forward: 0, pose: 'sit' as const };
  const flying = kind === 'balloon' ? BALLOON_FLYING_SCALE : kind === 'cable-car' ? CABIN_SCALE : 1;
  if (kind === 'cable-car') seeThroughGlass(p, new Color(CABIN_GLASS));
  shaped.scale.setScalar(flying);
  return vehicle(p, new Vector3(0, seat.feet * flying, seat.forward * flying), seat.pose, kind, (amount) => {
    shaped.scale.setScalar(1 + (flying - 1) * Math.min(1, Math.max(0, amount)));
  });
}

/** Splits the cabin's faces of glass colour into a second, see-through material (on its own geometry copy). */
function seeThroughGlass(p: Parts, glass: Color): void {
  const srgb = glass.clone().convertLinearToSRGB();
  const isGlass = (r: number, g: number, b: number): boolean =>
    [glass, srgb].some((c) => Math.abs(c.r - r) < 0.04 && Math.abs(c.g - g) < 0.04 && Math.abs(c.b - b) < 0.04);
  p.model.traverse((o) => {
    if (!(o instanceof Mesh) || Array.isArray(o.material)) return;
    const geo = (o.geometry as BufferGeometry).clone();
    const colour = geo.getAttribute('color');
    const position = geo.getAttribute('position');
    if (!colour || !position) return;
    const index = geo.getIndex();
    const corners = index ? index.count : position.count;
    const solid: number[] = [];
    const clear: number[] = [];
    for (let t = 0; t < corners; t += 3) {
      const v = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
      const first = v[0] ?? 0;
      (isGlass(colour.getX(first), colour.getY(first), colour.getZ(first)) ? clear : solid).push(...v);
    }
    if (clear.length === 0) return;
    geo.setIndex([...solid, ...clear]);
    geo.clearGroups();
    geo.addGroup(0, solid.length, 0);
    geo.addGroup(solid.length, clear.length, 1);
    const pane = o.material.clone();
    pane.transparent = true;
    pane.opacity = GLASS_OPACITY;
    pane.depthWrite = false;
    p.materials.push(pane);
    p.base.push(GLASS_OPACITY);
    o.geometry = geo;
    o.material = [o.material, pane];
    p.owned.push(geo);
  });
}
