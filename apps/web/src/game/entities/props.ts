// Static props, batched and built lazily by tile: the map's props are grouped into 128 x 128 block tiles, and
// a tile's placements are baked into one mesh per material (Kenney packs reuse a handful of materials across
// models) when the tile comes within the view distance, one tile per frame, and dropped again once well out
// of view (owner, 01/10/2026: wide maps, far scenery lazy). Still props never move, so baking the placement into
// the vertices loses nothing. What moves is drawn on its own with its tile: a model's moving parts (nodes named
// `part-<name>`: a wardrobe's doors, a swing's seat, built by tools/assets/build-box-props.ts) and the props the
// caller names `live` (a globe that spins), so the interactions' effects can turn them (interact/object-effects.ts).
// An infinite view distance (still shots) builds every tile.
import { Box3, BufferGeometry, Euler, Group, Matrix4, Mesh, Quaternion, Vector3, type Material, type MeshStandardMaterial, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';
import { modelCatalogSchema, modelFades, modelTraversal, type CatalogModel } from '@miu/voxel/model-catalog';
import { propSolidCells, type ModelBounds } from '@miu/voxel/prop-collision';
import type { Traversal } from '@miu/voxel/traversal';
import modelCatalogJson from '../../../../../content/world/models.json';
import { seeThroughCopy, type SeeThroughUniforms } from '../world/block-material';

/** Each model's catalog entry: whether it fades in front of the child (content/world/models.json). */
const CATALOG = modelCatalogSchema.parse(modelCatalogJson);
/** A placed model's catalogue entry (its seats, mattress, front, screen for the interactions), if listed. */
export const catalogEntry = (model: string): CatalogModel | undefined => CATALOG.models[model];
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
  /** A model's bounds and the middle of its glowing parts (a lamp's bulb), in its own frame; undefined for one the map does not place. */
  modelInfo(model: string): ModelInfo | undefined;
  /** The moving pieces of the prop at this index of the map's props while its tile is built, else null. */
  live(index: number): LiveProp | null;
  dispose(): void;
}

export interface ModelInfo {
  bounds: ModelBounds;
  /** The middle of its glowing (emissive or lamp) meshes, if it has any. */
  glow: readonly [number, number, number] | null;
}

/**
 * A prop drawn on its own: `spinner` turns the whole model about its upright middle (a `live` prop), `parts`
 * its moving parts by name, each holding its rest turn in `userData.rest` and its hinge in `userData.axis` /
 * `userData.angle` (the node's extras).
 */
export interface LiveProp {
  spinner: Object3D | null;
  parts: ReadonlyMap<string, Object3D>;
}

interface Placement {
  model: string;
  matrix: Matrix4;
  index: number;
}

/** The moving part a node belongs to (itself or an ancestor named `part-<name>` under the model's scene), if any. */
function partOf(node: Object3D, scene: Object3D): Object3D | null {
  for (let at: Object3D | null = node; at && at !== scene; at = at.parent) if (at.name.startsWith('part-')) return at;
  return null;
}

const GLOWING_NAME = /lamp|light|bulb|glass|glow/i;

/**
 * `seeThrough`: the world's line of sight to the child; props then fade like the trees where they would
 * hide her or stand right by the camera (owner, 02/10/2026: bamboo beside the child filled the screen).
 */
export async function loadProps(loader: GuardedGltfLoader, entities: WorldEntities, shadows: boolean, seeThrough?: SeeThroughUniforms, live: ReadonlySet<number> = new Set()): Promise<PropField> {
  const group = new Group();
  group.name = 'props';
  // Every model the map places, loaded once; its meshes with their transforms inside the model.
  const models = new Map<string, Array<{ geometry: BufferGeometry; material: Material; matrix: Matrix4; key: string }>>();
  const bounds = new Map<string, ModelBounds>();
  const glows = new Map<string, readonly [number, number, number]>();
  /** Each model's scene (a live prop's copy) and its moving part nodes. */
  const scenes = new Map<string, Object3D>();
  const movingParts = new Map<string, Object3D[]>();
  for (const model of new Set(entities.props.map((p) => p.model))) {
    const gltf = await loader.load(model);
    gltf.scene.updateMatrixWorld(true);
    scenes.set(model, gltf.scene);
    const box = new Box3().setFromObject(gltf.scene);
    if (!box.isEmpty()) bounds.set(model, { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] });
    const parts: Array<{ geometry: BufferGeometry; material: Material; matrix: Matrix4; key: string }> = [];
    const glow = new Box3();
    const moving = new Set<Object3D>();
    gltf.scene.traverse((node: Object3D) => {
      if (!(node instanceof Mesh) || Array.isArray(node.material)) return;
      const material = node.material as Material;
      const standard = material as MeshStandardMaterial;
      if ((standard.emissive && standard.emissive.getHex() !== 0) || GLOWING_NAME.test(material.name)) glow.expandByObject(node);
      const part = partOf(node, gltf.scene);
      if (part) {
        moving.add(part);
        return;
      }
      const attributes = Object.keys(node.geometry.attributes).sort().join(',');
      // A model the catalog keeps solid batches apart from the fading ones of the same material.
      const fades = modelFades(CATALOG, model);
      const shadow = (CATALOG.models[model]?.height ?? SHADOW_MIN_HEIGHT) >= SHADOW_MIN_HEIGHT;
      parts.push({ geometry: node.geometry, material, matrix: node.matrixWorld.clone(), key: `${materialKey(material, attributes)}|${fades ? 'fade' : 'solid'}|${shadow ? 'shadow' : 'flat'}` });
    });
    models.set(model, parts);
    if (moving.size > 0) movingParts.set(model, [...moving]);
    if (!glow.isEmpty()) {
      const c = glow.getCenter(new Vector3());
      glows.set(model, [c.x, c.y, c.z]);
    }
  }

  const blocked = propSolidCells(entities.props, (model) => bounds.get(model), (model) => modelTraversal(CATALOG, model));

  const tiles = new Map<string, Placement[]>();
  for (const [index, p] of entities.props.entries()) {
    const key = `${Math.floor(p.position[0] / PROP_TILE)},${Math.floor(p.position[2] / PROP_TILE)}`;
    const matrix = new Matrix4().compose(new Vector3(...p.position), new Quaternion().setFromEuler(new Euler(0, (p.yaw * Math.PI) / 180, 0)), new Vector3(p.scale, p.scale, p.scale));
    const tile = tiles.get(key);
    if (tile) tile.push({ model: p.model, matrix, index });
    else tiles.set(key, [{ model: p.model, matrix, index }]);
  }
  const built = new Map<string, Mesh[]>();
  /** The moving pieces drawn with each built tile, by prop index. */
  const liveByTile = new Map<string, Array<{ index: number; holder: Group; prop: LiveProp }>>();
  const liveByIndex = new Map<number, LiveProp>();
  const castsShadow = (model: string): boolean => shadows && (CATALOG.models[model]?.height ?? SHADOW_MIN_HEIGHT) >= SHADOW_MIN_HEIGHT;
  /** A prop drawn on its own at its placement: the whole model on a spinner, or only its moving parts. */
  const liveProp = (placement: Placement): { holder: Group; prop: LiveProp } | null => {
    const scene = scenes.get(placement.model);
    const nodes = movingParts.get(placement.model) ?? [];
    const whole = live.has(placement.index);
    if (!scene || (!whole && nodes.length === 0)) return null;
    const holder = new Group();
    holder.name = `live-prop:${placement.index}`;
    placement.matrix.decompose(holder.position, holder.quaternion, holder.scale);
    const parts = new Map<string, Object3D>();
    let spinner: Object3D | null = null;
    if (whole) {
      // Turned about its upright middle: the spinner stands there, the model shifted back under it.
      const b = bounds.get(placement.model);
      const mx = b ? (b.min[0] + b.max[0]) / 2 : 0;
      const mz = b ? (b.min[2] + b.max[2]) / 2 : 0;
      spinner = new Group();
      spinner.position.set(mx, 0, mz);
      const copy = scene.clone(true);
      copy.position.set(-mx, 0, -mz);
      spinner.add(copy);
      holder.add(spinner);
      copy.traverse((o) => {
        if (o.name.startsWith('part-')) parts.set(o.name.slice(5), o);
      });
    } else {
      for (const node of nodes) {
        const copy = node.clone(true);
        node.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
        holder.add(copy);
        parts.set(node.name.slice(5), copy);
      }
    }
    for (const part of parts.values()) part.userData.rest = part.quaternion.clone();
    holder.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = castsShadow(placement.model);
        o.receiveShadow = shadows;
      }
    });
    return { holder, prop: { spinner, parts } };
  };
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
    const livePieces: Array<{ index: number; holder: Group; prop: LiveProp }> = [];
    for (const placement of tiles.get(key) ?? []) {
      const moving = liveProp(placement);
      if (moving) {
        group.add(moving.holder);
        livePieces.push({ index: placement.index, ...moving });
        liveByIndex.set(placement.index, moving.prop);
        // A whole live prop is all on its own; otherwise its still body bakes with the tile as usual.
        if (live.has(placement.index)) continue;
      }
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
    liveByTile.set(key, livePieces);
  };
  const drop = (key: string): void => {
    for (const mesh of built.get(key) ?? []) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    built.delete(key);
    // Live pieces share the loaded models' geometry: only taken out of the scene.
    for (const piece of liveByTile.get(key) ?? []) {
      group.remove(piece.holder);
      liveByIndex.delete(piece.index);
    }
    liveByTile.delete(key);
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
    modelInfo(model) {
      const b = bounds.get(model);
      return b ? { bounds: b, glow: glows.get(model) ?? null } : undefined;
    },
    live: (index) => liveByIndex.get(index) ?? null,
    dispose() {
      for (const key of [...built.keys()]) drop(key);
      for (const material of faded.values()) material.dispose();
    },
  };
}
