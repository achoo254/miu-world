// Clothes dress the whole body: one item has boxes on the torso and on both arms and legs. Its pieces are
// merged into ONE mesh skinned to the character's own skeleton (each vertex bound to the joint its piece
// sits on), so walking, sprinting, jumping and every emote move each piece exactly as they move the body
// under it, for a single draw call. The player models are built with a plain fur layer where clothes go
// (`underlayer` in content/characters.json), slightly inside every piece of clothing, so nothing z-fights.
import { BufferAttribute, Matrix4, SkinnedMesh, Vector3, type Mesh, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ACCESSORIES } from '../content/accessories';

/** One piece of an item of clothing: its mesh in its joint's space (model units, unrotated) and the joint. */
export interface ClothesPiece {
  node: string;
  mesh: Mesh;
  /** Model-unit offset of the piece from the joint pivot (the accessory `offset`). */
  offset: readonly [number, number, number];
}

/** The character's skinned body: clothes share its skeleton and bind pose. */
function skinnedBody(character: Object3D): SkinnedMesh {
  let body: SkinnedMesh | null = null;
  character.traverse((o) => {
    if (!body && o instanceof SkinnedMesh && !o.name.startsWith('accessory:')) body = o;
  });
  if (!body) throw new Error('clothes need a skinned character');
  return body;
}

/**
 * Builds the skinned mesh of an item of clothing from its pieces and adds it beside the body. The piece
 * meshes are consumed (their geometry is merged, then freed). Works in any pose: the skeleton's bind
 * matrices, not the current pose, say where each joint sits.
 */
export function wearClothes(character: Object3D, id: string, pieces: readonly ClothesPiece[]): SkinnedMesh {
  const body = skinnedBody(character);
  const parent = body.parent;
  if (!parent) throw new Error('the character body has no parent');
  const { skeleton } = body;
  const material = pieces[0]?.mesh.material;
  if (!material || Array.isArray(material)) throw new Error(`${id}: clothes need pieces sharing one material`);
  const geometries = pieces.map(({ node, mesh, offset }) => {
    const bone = skeleton.getBoneByName(node);
    const boneIndex = bone ? skeleton.bones.indexOf(bone) : -1;
    const inverse = skeleton.boneInverses[boneIndex];
    if (!bone || !inverse) throw new Error(`${id}: joint "${node}" not in the skeleton`);
    // The joint's bind position in the body's bind space, then into the mesh's own space.
    const pivot = new Vector3().setFromMatrixPosition(new Matrix4().copy(inverse).invert()).add(new Vector3(...offset));
    const geometry = mesh.geometry.applyMatrix4(new Matrix4().copy(body.bindMatrixInverse).multiply(new Matrix4().makeTranslation(pivot)));
    const count = geometry.getAttribute('position').count;
    const joints = new Uint16Array(count * 4);
    const weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      joints[i * 4] = boneIndex;
      weights[i * 4] = 1;
    }
    geometry.setAttribute('skinIndex', new BufferAttribute(joints, 4));
    geometry.setAttribute('skinWeight', new BufferAttribute(weights, 4));
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  if (!merged) throw new Error(`${id}: clothes pieces do not merge`);
  merged.computeBoundingSphere();
  const clothes = new SkinnedMesh(merged, material);
  clothes.name = `accessory:${id}`;
  clothes.frustumCulled = false; // skinned bounds lag the animated pose, as for the body
  clothes.position.copy(body.position);
  clothes.quaternion.copy(body.quaternion);
  clothes.scale.copy(body.scale);
  parent.add(clothes);
  clothes.bind(skeleton, body.bindMatrix);
  return clothes;
}

/** Whether `entries` (outfit entries, `id` or `id:variant`) dress the body with clothes. */
export function wearsClothes(entries: readonly string[]): boolean {
  return entries.some((entry) => ACCESSORIES.get(entry.split(':')[0] ?? '')?.slot === 'clothes');
}

/**
 * What a player character wears: the chosen entries, plus its own clothes (`clothes` in
 * content/characters.json, today's look of the species) when none of them is clothes, so no child is
 * ever left in the plain fur layer.
 */
export function withOwnClothes(entries: readonly string[], clothes: string | undefined): string[] {
  return clothes && !wearsClothes(entries) ? [...entries, clothes] : [...entries];
}
