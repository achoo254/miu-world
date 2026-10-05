// Things made in code for the pet (no new asset files): what it wears (content/pet-gear.json: hats, bows, a crown,
// a flower, collars, a scarf) and the props of its care scenes (a food bowl, a little bath tub, a ball, a nap
// cushion). Each is a few coloured primitives merged into one mesh: one draw call, one material.
import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Mesh,
  MeshLambertMaterial,
  Raycaster,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
  type ColorRepresentation,
  type Mesh as MeshType,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PetGearShape } from '@miu/schema/pet-gear';

/** A primitive coloured all over (the colour lives in its vertices, so many merge into one mesh). */
function paint(geometry: BufferGeometry, color: ColorRepresentation): BufferGeometry {
  const c = new Color(color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  // The primitives differ in whether they carry an index; merged, they must agree.
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

/** One mesh of painted parts. */
function paintedMesh(name: string, parts: BufferGeometry[], castShadow: boolean): MeshType {
  const geometry = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!geometry) throw new Error(`${name}: parts did not merge`);
  geometry.computeBoundingSphere();
  const mesh = new Mesh(geometry, new MeshLambertMaterial({ vertexColors: true }));
  mesh.name = name;
  mesh.castShadow = castShadow;
  return mesh;
}

/** Where things sit on a pet, in its model's own units (before its world scale), worked out from its shape. */
export interface PetAnchors {
  /** The model's height. */
  height: number;
  /** The middle of the top of its head, and the head's width there. */
  headTop: Vector3;
  headWidth: number;
  /** Round its neck: the middle of the slice under the head, its half width and depth, and how far forward its front is. */
  neck: Vector3;
  neckHalfX: number;
  neckHalfZ: number;
  /** In front of its mouth, where it carries the ball. */
  mouth: Vector3;
}

/** Parts that are not the pet's head and body (legs, tail, wings): left out when finding where gear sits. */
const LIMB = /leg|tail|wing/i;

function isLimb(o: Object3D, model: Object3D): boolean {
  for (let at: Object3D | null = o; at && at !== model; at = at.parent) if (LIMB.test(at.name)) return true;
  return false;
}

/**
 * The anchors of a pet model (Kenney Cube Pets face +z, feet at y = 0). A Cube Pet is a big head-and-body block on
 * little legs: a hat sits on the top of that block where a ray straight down meets it (between the ears, not on
 * them), a collar rings the bottom of the block, just above the legs. Read from the parts as posed when loaded.
 */
export function petAnchors(model: Object3D): PetAnchors {
  model.updateMatrixWorld(true);
  const toModel = model.matrixWorld.clone().invert();
  const all: Vector3[] = [];
  const core: Vector3[] = [];
  const coreMeshes: MeshType[] = [];
  model.traverse((o) => {
    const mesh = o as MeshType;
    if (!mesh.isMesh || mesh.name === 'merged-parts') return;
    const limb = isLimb(mesh, model);
    if (!limb) coreMeshes.push(mesh);
    const position = mesh.geometry.getAttribute('position');
    const toHere = toModel.clone().multiply(mesh.matrixWorld);
    for (let i = 0; i < position.count; i++) {
      const p = new Vector3().fromBufferAttribute(position, i).applyMatrix4(toHere);
      all.push(p);
      if (!limb) core.push(p);
    }
  });
  const whole = new Box3().setFromPoints(all);
  const body = core.length > 0 ? new Box3().setFromPoints(core) : whole.clone();
  const height = Math.max(0.01, whole.max.y - whole.min.y);
  const coreHeight = Math.max(0.01, body.max.y - body.min.y);
  const slice = (from: number, to: number): Box3 => {
    const inside = (core.length > 0 ? core : all).filter((p) => p.y >= body.min.y + from * coreHeight && p.y <= body.min.y + to * coreHeight);
    return inside.length > 0 ? new Box3().setFromPoints(inside) : body.clone();
  };
  const top = slice(0.85, 1).getCenter(new Vector3());
  // Where a ray straight down through the middle of the top first meets the head.
  const from = new Vector3(top.x, body.max.y + 1, top.z).applyMatrix4(model.matrixWorld);
  const ray = new Raycaster(from, new Vector3(0, -1, 0).transformDirection(model.matrixWorld));
  const hit = ray.intersectObjects(coreMeshes, false)[0];
  const headY = hit ? hit.point.clone().applyMatrix4(toModel).y : body.max.y;
  // Round the bottom of the block: how far its sides are from the middle at that height, found by rays from
  // outside (the block's corners are rounded and some pets have cheeks: the extents of its points would be too wide).
  const base = slice(0, 0.3);
  const baseCentre = base.getCenter(new Vector3());
  const neckY = body.min.y + coreHeight * 0.14;
  const reach = (dx: number, dz: number, fallback: number): number => {
    const outside = new Vector3(baseCentre.x + dx * 5, neckY, baseCentre.z + dz * 5);
    ray.set(outside.clone().applyMatrix4(model.matrixWorld), new Vector3(-dx, 0, -dz).transformDirection(model.matrixWorld));
    const side = ray.intersectObjects(coreMeshes, false)[0];
    if (!side) return fallback;
    const at = side.point.clone().applyMatrix4(toModel);
    return Math.abs(dx !== 0 ? at.x - baseCentre.x : at.z - baseCentre.z);
  };
  const halfX = (reach(1, 0, (base.max.x - base.min.x) / 2) + reach(-1, 0, (base.max.x - base.min.x) / 2)) / 2;
  const halfZ = (reach(0, 1, (base.max.z - base.min.z) / 2) + reach(0, -1, (base.max.z - base.min.z) / 2)) / 2;
  return {
    height,
    headTop: new Vector3(top.x, headY, top.z),
    headWidth: Math.max(0.05, (body.max.x - body.min.x) * 0.8),
    neck: new Vector3(baseCentre.x, neckY, baseCentre.z),
    neckHalfX: Math.max(0.05, halfX),
    neckHalfZ: Math.max(0.05, halfZ),
    mouth: new Vector3(top.x, body.min.y + coreHeight * 0.3, body.max.z + height * 0.06),
  };
}

/** A rectangular band round the neck (cube pets are boxy: a square collar fits them). */
function band(a: PetAnchors, thick: number, color: ColorRepresentation): BufferGeometry[] {
  const t = a.height * 0.045;
  const hx = a.neckHalfX + t / 2;
  const hz = a.neckHalfZ + t / 2;
  const y = a.neck.y;
  const x0 = a.neck.x;
  const z0 = a.neck.z;
  return [
    paint(new BoxGeometry(2 * hx + t, thick, t).translate(x0, y, z0 + hz), color),
    paint(new BoxGeometry(2 * hx + t, thick, t).translate(x0, y, z0 - hz), color),
    paint(new BoxGeometry(t, thick, 2 * hz).translate(x0 + hx, y, z0), color),
    paint(new BoxGeometry(t, thick, 2 * hz).translate(x0 - hx, y, z0), color),
  ];
}

/** What the pet wears, built for its shape; placed in the model's units (it moves with the model's body). */
export function buildGear(shape: PetGearShape, colors: readonly [string, string], a: PetAnchors, castShadow: boolean): MeshType {
  const [main, trim] = colors;
  const w = a.headWidth;
  const top = a.headTop;
  // A little above the top the ray found (the top of a Cube Pet is bevelled): a bow and a flower sit up on it.
  const lift = { 'party-hat': 0.01, 'sun-hat': 0.01, crown: 0.04, bow: 0.1, flower: 0.07, collar: 0, 'medal-collar': 0, scarf: 0 }[shape] * w;
  const at = (g: BufferGeometry, x: number, y: number, z: number): BufferGeometry => g.translate(top.x + x, top.y + lift + y, top.z + z);
  const front = a.neck.z + a.neckHalfZ + a.height * 0.06;
  let parts: BufferGeometry[];
  switch (shape) {
    case 'party-hat':
      parts = [
        paint(at(new ConeGeometry(w * 0.26, w * 0.6, 12), 0, w * 0.3, 0), main),
        paint(at(new CylinderGeometry(w * 0.27, w * 0.27, w * 0.06, 12), 0, w * 0.03, 0), trim),
        paint(at(new SphereGeometry(w * 0.08, 8, 6), 0, w * 0.62, 0), trim),
      ];
      break;
    case 'sun-hat':
      parts = [
        paint(at(new CylinderGeometry(w * 0.6, w * 0.6, w * 0.04, 16), 0, w * 0.02, 0), main),
        paint(at(new CylinderGeometry(w * 0.28, w * 0.32, w * 0.26, 14), 0, w * 0.15, 0), main),
        paint(at(new CylinderGeometry(w * 0.33, w * 0.33, w * 0.07, 14), 0, w * 0.07, 0), trim),
      ];
      break;
    case 'crown': {
      parts = [paint(at(new CylinderGeometry(w * 0.27, w * 0.27, w * 0.12, 10, 1, true), 0, w * 0.06, 0), main)];
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        parts.push(paint(at(new ConeGeometry(w * 0.06, w * 0.16, 4), Math.sin(angle) * w * 0.25, w * 0.19, Math.cos(angle) * w * 0.25), main));
        parts.push(paint(at(new SphereGeometry(w * 0.035, 6, 4), Math.sin(angle) * w * 0.28, w * 0.07, Math.cos(angle) * w * 0.28), trim));
      }
      break;
    }
    case 'bow': {
      // Two loops pointing out from a knot, on one side of the head.
      const side = w * 0.22;
      parts = [
        paint(at(new ConeGeometry(w * 0.14, w * 0.26, 4).rotateZ(Math.PI / 2), side + w * 0.13, w * 0.05, 0), main),
        paint(at(new ConeGeometry(w * 0.14, w * 0.26, 4).rotateZ(-Math.PI / 2), side - w * 0.13, w * 0.05, 0), main),
        paint(at(new SphereGeometry(w * 0.07, 8, 6), side, w * 0.05, 0), trim),
      ];
      break;
    }
    case 'flower': {
      const side = w * 0.25;
      parts = [paint(at(new SphereGeometry(w * 0.07, 8, 6), side, w * 0.06, 0), trim)];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        parts.push(paint(at(new SphereGeometry(w * 0.07, 8, 6).scale(1, 0.45, 1), side + Math.cos(angle) * w * 0.12, w * 0.06, Math.sin(angle) * w * 0.12), main));
      }
      break;
    }
    case 'collar':
      parts = [...band(a, a.height * 0.07, main), paint(new SphereGeometry(a.height * 0.06, 8, 6).translate(a.neck.x, a.neck.y - a.height * 0.06, front), trim)];
      break;
    case 'medal-collar':
      parts = [
        ...band(a, a.height * 0.06, main),
        paint(new CylinderGeometry(a.height * 0.07, a.height * 0.07, a.height * 0.02, 12).rotateX(Math.PI / 2).translate(a.neck.x, a.neck.y - a.height * 0.09, front), trim),
      ];
      break;
    case 'scarf':
      parts = [
        ...band(a, a.height * 0.11, main),
        paint(new BoxGeometry(a.height * 0.1, a.height * 0.22, a.height * 0.04).translate(a.neck.x + a.neckHalfX * 0.5, a.neck.y - a.height * 0.13, front), main),
        paint(new BoxGeometry(a.height * 0.1, a.height * 0.04, a.height * 0.045).translate(a.neck.x + a.neckHalfX * 0.5, a.neck.y - a.height * 0.24, front), trim),
      ];
      break;
  }
  return paintedMesh(`pet-gear:${shape}`, parts, castShadow);
}

/** A piece of gear to put on (content/pet-gear.json). */
export interface PetGearLook {
  id: string;
  shape: PetGearShape;
  colors: readonly [string, string];
}

/**
 * Puts gear on a pet model: built in the model's units from its anchors, carried by its body part (it bobs with
 * the clip; a model without one carries it on the whole). Returns the meshes, to take off with `disposeShape`.
 */
export function attachGear(model: Object3D, anchors: PetAnchors, gear: readonly PetGearLook[], castShadow: boolean): MeshType[] {
  const body = model.getObjectByName('body') ?? model;
  model.updateMatrixWorld(true);
  const toBody = body.matrixWorld.clone().invert().multiply(model.matrixWorld);
  return gear.map((g) => {
    const mesh = buildGear(g.shape, g.colors, anchors, castShadow);
    mesh.geometry.applyMatrix4(toBody);
    body.add(mesh);
    return mesh;
  });
}

/** The care scenes' props, in world units (a block is 1), resting on y = 0. */
export type CareProp = 'bowl' | 'tub' | 'ball' | 'cushion';

export function buildCareProp(kind: CareProp, castShadow: boolean): { mesh: MeshType; food?: MeshType } {
  switch (kind) {
    case 'bowl': {
      // A blue bowl; the food heap is its own mesh, so it can go down as the pet eats.
      const mesh = paintedMesh('pet-bowl', [paint(new CylinderGeometry(0.3, 0.22, 0.16, 16, 1, true).translate(0, 0.08, 0), '#4f8fd6'), paint(new CylinderGeometry(0.22, 0.22, 0.02, 16).translate(0, 0.01, 0), '#3a6fae'), paint(new TorusGeometry(0.3, 0.025, 6, 20).rotateX(Math.PI / 2).translate(0, 0.16, 0), '#7fb6ea')], castShadow);
      const food = paintedMesh('pet-bowl-food', [paint(new SphereGeometry(0.24, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1), '#c98f5a'), paint(new SphereGeometry(0.05, 6, 4).translate(0.08, 0.08, 0.04), '#e2584f'), paint(new SphereGeometry(0.045, 6, 4).translate(-0.07, 0.07, -0.05), '#6fc27a')], false);
      food.position.y = 0.1;
      mesh.add(food);
      return { mesh, food };
    }
    case 'tub':
      return {
        mesh: paintedMesh('pet-tub', [
          paint(new CylinderGeometry(0.62, 0.5, 0.36, 18, 1, true).translate(0, 0.18, 0), '#f6f1e6'),
          paint(new TorusGeometry(0.62, 0.05, 6, 24).rotateX(Math.PI / 2).translate(0, 0.36, 0), '#e8e0d2'),
          paint(new CylinderGeometry(0.58, 0.58, 0.02, 18).translate(0, 0.3, 0), '#8fd0f5'),
          paint(new CylinderGeometry(0.5, 0.5, 0.03, 18).translate(0, 0.015, 0), '#d8cfbf'),
        ], castShadow),
      };
    case 'ball':
      return {
        mesh: paintedMesh('pet-ball', [
          paint(new SphereGeometry(0.16, 12, 8).translate(0, 0.16, 0), '#e2584f'),
          paint(new TorusGeometry(0.16, 0.025, 6, 16).translate(0, 0.16, 0), '#ffe066'),
          paint(new TorusGeometry(0.16, 0.025, 6, 16).rotateY(Math.PI / 2).translate(0, 0.16, 0), '#fffdf8'),
        ], castShadow),
      };
    case 'cushion':
      return {
        mesh: paintedMesh('pet-cushion', [
          paint(new CylinderGeometry(0.62, 0.66, 0.14, 18).translate(0, 0.07, 0), '#cdb4f0'),
          paint(new TorusGeometry(0.58, 0.09, 8, 22).rotateX(Math.PI / 2).translate(0, 0.16, 0), '#b096dc'),
          paint(new CylinderGeometry(0.5, 0.5, 0.02, 18).translate(0, 0.15, 0), '#efe4ff'),
        ], castShadow),
      };
  }
}

/** Frees a mesh made here (geometry and material). */
export function disposeShape(mesh: MeshType): void {
  mesh.traverse((o) => {
    const m = o as MeshType;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const material = m.material;
    if (Array.isArray(material)) material.forEach((x) => x.dispose());
    else material.dispose();
  });
  mesh.removeFromParent();
}
