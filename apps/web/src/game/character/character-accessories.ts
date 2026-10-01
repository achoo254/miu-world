// Turns accessory voxel geometry into a three.js mesh and pins it to a rig node so it follows
// every animation. Offsets are authored in character model units, independent of node scale.
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type Object3D,
} from 'three';
import type { AccessoryDef } from '@miu/voxel/accessory-schema';
import { buildAccessoryMesh, mirroredAccessory } from '@miu/voxel/voxel-accessory';
import { resolveOutfitEntry } from '../content/accessories';

const DEG = Math.PI / 180;
const sharedMaterial = new MeshLambertMaterial({ vertexColors: true });

export function createAccessoryMesh(def: AccessoryDef, variant?: string): Mesh {
  const { geometry } = buildAccessoryMesh(def, variant);
  const colors = geometry.extra.color ?? new Float32Array(geometry.positions.length);
  const linear = new Float32Array(colors.length);
  const c = new Color();
  for (let i = 0; i < colors.length; i += 3) {
    c.setRGB(colors[i] ?? 0, colors[i + 1] ?? 0, colors[i + 2] ?? 0).convertSRGBToLinear();
    linear.set([c.r, c.g, c.b], i);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(geometry.positions, 3));
  geo.setAttribute('normal', new BufferAttribute(geometry.normals, 3));
  geo.setAttribute('color', new BufferAttribute(linear, 3));
  geo.setIndex(new BufferAttribute(geometry.indices, 1));
  geo.computeBoundingSphere();
  const mesh = new Mesh(geo, sharedMaterial);
  mesh.name = `accessory:${def.id}`;
  return mesh;
}

/**
 * Parents `mesh` to the rig node so it animates with it. Must run while the character is in its
 * bind pose (right after load): the node's bind transform is used to cancel its scale/rotation.
 * `scale` resizes the accessory and its offset for a character variant (content/characters.json
 * `accessoryScale`), so one accessory file fits every body proportion.
 */
export function attachAccessory(character: Object3D, def: AccessoryDef, mesh: Mesh, scale = 1): void {
  const node = character.getObjectByName(def.attachNode);
  if (!node) throw new Error(`${def.id}: attach node "${def.attachNode}" not found`);
  character.updateMatrixWorld(true);
  const toModel = new Matrix4().copy(character.matrixWorld).invert().multiply(node.matrixWorld);
  const pivot = new Vector3().setFromMatrixPosition(toModel);
  const desired = new Matrix4().compose(
    pivot.add(new Vector3(...def.offset).multiplyScalar(scale)),
    new Quaternion().setFromEuler(new Euler(def.rotation[0] * DEG, def.rotation[1] * DEG, def.rotation[2] * DEG)),
    new Vector3(scale, scale, scale),
  );
  new Matrix4().copy(toModel).invert().multiply(desired).decompose(mesh.position, mesh.quaternion, mesh.scale);
  node.add(mesh);
}

export interface WornOutfit {
  /** Entries actually attached, in order (a mirrored pair is one entry, two meshes). */
  entries: string[];
  /** Entries that could not be attached (unknown id or colour, missing node), with the reason. */
  skipped: Array<{ entry: string; error: unknown }>;
  meshes: Mesh[];
}

/**
 * Builds and attaches every outfit entry (see `resolveOutfitEntry`). The character must be in its
 * bind pose (see `attachAccessory`); `scaleFor` gives the accessory size per attach node.
 */
export function dressCharacter(character: Object3D, entries: readonly string[], scaleFor: (node: string) => number, castShadow: boolean): WornOutfit {
  const worn: WornOutfit = { entries: [], skipped: [], meshes: [] };
  for (const entry of entries) {
    try {
      const { def, variant } = resolveOutfitEntry(entry);
      // A pair (shoes) is two meshes: the authored one and its mirror on the other limb.
      const parts = def.mirror ? [def, mirroredAccessory(def)] : [def];
      const meshes = parts.map((part) => {
        const mesh = createAccessoryMesh(part, variant);
        mesh.castShadow = castShadow;
        attachAccessory(character, part, mesh, scaleFor(part.attachNode));
        return mesh;
      });
      worn.entries.push(entry);
      worn.meshes.push(...meshes);
    } catch (error) {
      worn.skipped.push({ entry, error });
    }
  }
  return worn;
}

/** Detaches and frees what `dressCharacter` attached (the material is shared and stays). */
export function undressCharacter(worn: WornOutfit): void {
  for (const mesh of worn.meshes) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  worn.meshes.length = 0;
  worn.entries.length = 0;
}
