// Static props, batched and built lazily by tile: the map's props are grouped into 128 x 128 block tiles, and
// a tile's placements are baked into one mesh per material (Kenney packs reuse a handful of materials across
// models) when the tile comes within the view distance, one tile per frame, and dropped again once well out
// of view (owner, 01/10/2026: wide maps, far scenery lazy). Props never move, so baking the placement into
// the vertices loses nothing. An infinite view distance (still shots) builds every tile.
import { Box3, BufferGeometry, Euler, Group, Matrix4, Mesh, Quaternion, Vector3, type Material, type MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';
import { modelCatalogSchema, modelFades, modelTraversal } from '@miu/voxel/model-catalog';
import { propSolidCells, type ModelBounds } from '@miu/voxel/prop-collision';
import type { Traversal } from '@miu/voxel/traversal';
import modelCatalogJson from '../../../../../content/world/models.json';
import { seeThroughCopy, type SeeThroughUniforms } from '../world/block-material';

/** Each model's catalog entry: whether it fades in front of the child (content/world/models.json). */
const CATALOG = modelCatalogSchema.parse(modelCatalogJson);
/**
 * Props shorter than this (blocks: flowers, grass, mushrooms, crates) cast no shadow: theirs is a smudge
 * nobody sees, and a shadow draws every triangle a second time (Master Plan §12: about 150k a frame).
 */
const SHADOW_MIN_HEIGHT = 1.2;

/** Side of a prop tile in blocks: a region's, so at most 3 x 3 tiles are in view (draw calls stay low). */
export const PROP_TILE = 128;
/** Tiles build once their nearest edge is within the view distance, and are dropped this far beyond it. */
const DROP_MARGIN = 48;

/** Materials that look the same share a batch even when they come from different model files. */
function materialKey(material: Material, attributes: string): string {
  const m = material as MeshStandardMaterial;
  return [m.type, m.name, m.color?.getHexString() ?? '', (m.map?.image as { src?: string } | undefined)?.src ?? m.map?.uuid ?? '', m.transparent, m.vertexColors, attributes].join('|');
}

export interface PropField {
  group: Group;
  setViewDistance(distance: number): void;
  /** Builds the nearest missing tile in view (one per call) and drops far ones. */
  update(at: Vector3): void;
  /** Builds every tile within the view distance of (x, z) now (the start, and still shots). */
  buildAround(x: number, z: number): void;
  /** Tiles built now. */
  tileCount(): number;
  /** Grid cells the solid props fill (`cellKey`s, prop-collision.ts) with their traversal: she collides with them like blocks. */
  blocked: ReadonlyMap<string, Exclude<Traversal, 'walk-through'>>;
  dispose(): void;
}

interface Placement {
  model: string;
  matrix: Matrix4;
}

/**
 * `seeThrough`: the world's line of sight to the child; props then fade like the trees where they would
 * hide her or stand right by the camera (owner, 02/10/2026: bamboo beside the child filled the screen).
 */
export async function loadProps(loader: GuardedGltfLoader, entities: WorldEntities, shadows: boolean, seeThrough?: SeeThroughUniforms): Promise<PropField> {
  const group = new Group();
  group.name = 'props';
  // Every model the map places, loaded once; its meshes with their transforms inside the model.
  const models = new Map<string, Array<{ geometry: BufferGeometry; material: Material; matrix: Matrix4; key: string }>>();
  const bounds = new Map<string, ModelBounds>();
  for (const model of new Set(entities.props.map((p) => p.model))) {
    const gltf = await loader.load(model);
    gltf.scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(gltf.scene);
    if (!box.isEmpty()) bounds.set(model, { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] });
    const parts: Array<{ geometry: BufferGeometry; material: Material; matrix: Matrix4; key: string }> = [];
    gltf.scene.traverse((node: Object3D) => {
      if (!(node instanceof Mesh) || Array.isArray(node.material)) return;
      const material = node.material as Material;
      const attributes = Object.keys(node.geometry.attributes).sort().join(',');
      // A model the catalog keeps solid batches apart from the fading ones of the same material.
      const fades = modelFades(CATALOG, model);
      const shadow = (CATALOG.models[model]?.height ?? SHADOW_MIN_HEIGHT) >= SHADOW_MIN_HEIGHT;
      parts.push({ geometry: node.geometry, material, matrix: node.matrixWorld.clone(), key: `${materialKey(material, attributes)}|${fades ? 'fade' : 'solid'}|${shadow ? 'shadow' : 'flat'}` });
    });
    models.set(model, parts);
  }

  const blocked = propSolidCells(entities.props, (model) => bounds.get(model), (model) => modelTraversal(CATALOG, model));

  const tiles = new Map<string, Placement[]>();
  for (const p of entities.props) {
    const key = `${Math.floor(p.position[0] / PROP_TILE)},${Math.floor(p.position[2] / PROP_TILE)}`;
    const matrix = new Matrix4().compose(new Vector3(...p.position), new Quaternion().setFromEuler(new Euler(0, (p.yaw * Math.PI) / 180, 0)), new Vector3(p.scale, p.scale, p.scale));
    const tile = tiles.get(key);
    if (tile) tile.push({ model: p.model, matrix });
    else tiles.set(key, [{ model: p.model, matrix }]);
  }
  const built = new Map<string, Mesh[]>();
  /** One fading copy per batch material, shared by every tile. */
  const faded = new Map<string, Material>();
  const fadingOf = (batchKey: string, material: Material): Material => {
    if (!seeThrough || batchKey.includes('|solid|')) return material;
    let copy = faded.get(batchKey);
    if (!copy) faded.set(batchKey, (copy = seeThroughCopy(material, seeThrough)));
    return copy;
  };

  const build = (key: string): void => {
    const batches = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
    for (const placement of tiles.get(key) ?? []) {
      for (const part of models.get(placement.model) ?? []) {
        const batch = batches.get(part.key) ?? { material: part.material, geometries: [] };
        batch.geometries.push(part.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(placement.matrix, part.matrix)));
        batches.set(part.key, batch);
      }
    }
    const meshes: Mesh[] = [];
    for (const [batchKey, { material, geometries }] of batches) {
      const geometry = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (!geometry) throw new Error(`props batch ${batchKey} could not be merged`);
      geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, fadingOf(batchKey, material));
      mesh.name = `props:${key}:${material.name || 'batch'}`;
      mesh.castShadow = shadows && batchKey.endsWith('|shadow');
      mesh.receiveShadow = shadows;
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      meshes.push(mesh);
    }
    built.set(key, meshes);
  };
  const drop = (key: string): void => {
    for (const mesh of built.get(key) ?? []) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    built.delete(key);
  };
  /** Distance from a point to a tile's square. */
  const reach = (key: string, x: number, z: number): number => {
    const [tx = 0, tz = 0] = key.split(',').map(Number);
    const dx = Math.max(tx * PROP_TILE - x, 0, x - (tx + 1) * PROP_TILE);
    const dz = Math.max(tz * PROP_TILE - z, 0, z - (tz + 1) * PROP_TILE);
    return Math.hypot(dx, dz);
  };

  let viewDistance = 64;
  return {
    group,
    setViewDistance(distance) {
      viewDistance = distance;
    },
    update(at) {
      let nearest: { key: string; d: number } | null = null;
      for (const key of tiles.keys()) {
        const d = reach(key, at.x, at.z);
        if (built.has(key)) {
          if (d > viewDistance + DROP_MARGIN) drop(key);
        } else if (d <= viewDistance && (!nearest || d < nearest.d)) nearest = { key, d };
      }
      if (nearest) build(nearest.key);
    },
    buildAround(x, z) {
      for (const key of tiles.keys()) if (!built.has(key) && reach(key, x, z) <= viewDistance) build(key);
    },
    tileCount: () => built.size,
    blocked,
    dispose() {
      for (const key of [...built.keys()]) drop(key);
      for (const material of faded.values()) material.dispose();
    },
  };
}
