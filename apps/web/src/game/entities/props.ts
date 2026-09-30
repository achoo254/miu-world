// Static props, batched: every placement of every prop model is baked into one mesh per material
// (Kenney packs reuse a handful of materials across models), so all the map's decoration costs one
// draw call per material instead of one per (model, sub-mesh) pair. Props never move, so baking
// the placement into the vertices loses nothing.
import { BufferGeometry, Euler, Group, Matrix4, Mesh, Quaternion, Vector3, type Material, type MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { GuardedGltfLoader } from '../asset-loader';

/** Materials that look the same share a batch even when they come from different model files. */
function materialKey(material: Material, attributes: string): string {
  const m = material as MeshStandardMaterial;
  return [m.type, m.name, m.color?.getHexString() ?? '', (m.map?.image as { src?: string } | undefined)?.src ?? m.map?.uuid ?? '', m.transparent, m.vertexColors, attributes].join('|');
}

export async function loadProps(loader: GuardedGltfLoader, entities: WorldEntities, shadows: boolean): Promise<Group> {
  const group = new Group();
  group.name = 'props';
  const byModel = new Map<string, WorldEntities['props']>();
  for (const prop of entities.props) byModel.set(prop.model, [...(byModel.get(prop.model) ?? []), prop]);

  const batches = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  for (const [model, placements] of byModel) {
    const gltf = await loader.load(model);
    gltf.scene.updateMatrixWorld(true);
    const placementMatrices = placements.map((p) =>
      new Matrix4().compose(
        new Vector3(...p.position),
        new Quaternion().setFromEuler(new Euler(0, (p.yaw * Math.PI) / 180, 0)),
        new Vector3(p.scale, p.scale, p.scale),
      ),
    );
    gltf.scene.traverse((node) => {
      if (!(node instanceof Mesh) || Array.isArray(node.material)) return;
      const material = node.material as Material;
      const attributes = Object.keys(node.geometry.attributes).sort().join(',');
      const key = materialKey(material, attributes);
      const batch = batches.get(key) ?? { material, geometries: [] };
      for (const placement of placementMatrices) {
        batch.geometries.push(node.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(placement, node.matrixWorld)));
      }
      batches.set(key, batch);
    });
  }
  for (const [key, { material, geometries }] of batches) {
    const geometry = mergeGeometries(geometries, false);
    for (const g of geometries) g.dispose();
    if (!geometry) throw new Error(`props batch ${key} could not be merged`);
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.name = `props:${material.name || 'batch'}`;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  return group;
}
