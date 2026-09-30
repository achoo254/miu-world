// One draw call per character instead of one per body part. A Kenney Cube Pet or Blocky Character is
// 5–9 meshes, each on its own animated node (legs, arms, head, wings); drawing twelve of them would
// blow the draw-call budget. This bakes every part into one skinned mesh per material whose bones
// are the part nodes themselves, so clips, hand-made poses and things held in a hand (children of
// the arm node) keep working. The original part meshes stay as bones but leave the render layer.
import { Matrix4, SkinnedMesh, Skeleton, BufferAttribute, type Bone, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Layer no camera renders: the part meshes still move (as bones) but are drawn only through the merge. */
const HIDDEN_LAYER = 31;

export function mergeParts(model: Object3D, shadows: boolean): SkinnedMesh[] {
  model.updateMatrixWorld(true);
  const parts: Mesh[] = [];
  model.traverse((o) => {
    if ((o as Mesh).isMesh && !(o as SkinnedMesh).isSkinnedMesh) parts.push(o as Mesh);
  });
  if (parts.length < 2) return [];
  const toModel = new Matrix4().copy(model.matrixWorld).invert();
  const bones = parts as unknown as Bone[];
  const skeleton = new Skeleton(
    bones,
    parts.map((p) => new Matrix4().copy(p.matrixWorld).invert()),
  );
  const byMaterial = new Map<Material, BufferGeometry[]>();
  parts.forEach((part, index) => {
    const material = Array.isArray(part.material) ? part.material[0] : part.material;
    if (!material) return;
    const geometry = part.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(toModel, part.matrixWorld));
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(count * 4).map((_, i) => (i % 4 === 0 ? index : 0)), 4));
    geometry.setAttribute('skinWeight', new BufferAttribute(new Float32Array(count * 4).map((_, i) => (i % 4 === 0 ? 1 : 0)), 4));
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(name)) geometry.deleteAttribute(name);
    byMaterial.set(material, [...(byMaterial.get(material) ?? []), geometry]);
    part.layers.set(HIDDEN_LAYER);
  });
  const merged: SkinnedMesh[] = [];
  for (const [material, geometries] of byMaterial) {
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    const mesh = new SkinnedMesh(geometry, material);
    mesh.name = 'merged-parts';
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    model.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(skeleton);
    merged.push(mesh);
  }
  return merged;
}
