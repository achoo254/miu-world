import { Bone, BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { outfitSchema, speciesSchema, type OutfitDef } from '@miu/voxel/character-recipe';
import speciesJson from '../../../../../content/species.json';
import { ACCESSORIES } from '../content/accessories';
import { characterForSpecies, SPECIES } from '../content/characters';
import { dressCharacter, undressCharacter } from './character-accessories';
import { wearsClothes, withOwnClothes } from './character-clothes';

const outfitFiles = import.meta.glob<unknown>('../../../../../content/outfits/*.json', { eager: true, import: 'default' });
const OUTFITS = new Map(Object.entries(outfitFiles).map(([file, json]) => [file.replace(/^.*\/(.+)\.json$/, '$1'), outfitSchema.parse(json)]));

/** Joint pivots of a small stand-in rig (model units), like the chibi body: legs under the torso, arms beside it. */
const JOINTS: Record<string, [number, number, number]> = {
  torso: [0, 0.2, 0],
  head: [0, 1.2, 0],
  'arm-left': [0.4, 1.1, -0.1],
  'arm-right': [-0.4, 1.1, -0.1],
  'leg-left': [0.2, 0.5, 0],
  'leg-right': [-0.2, 0.5, 0],
};

/** A character like a loaded player model: a skinned body under a group, its bones in their bind pose. */
function rig(): { character: Group; body: SkinnedMesh; bone: (name: string) => Bone } {
  const character = new Group();
  const root = new Bone();
  root.name = 'root';
  const bones = [root];
  for (const [name, at] of Object.entries(JOINTS)) {
    const bone = new Bone();
    bone.name = name;
    bone.position.set(...at);
    root.add(bone);
    bones.push(bone);
  }
  character.add(root);
  character.updateMatrixWorld(true);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0, 0.1, 0, 0, 0, 0.1, 0]), 3));
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(12), 4));
  geometry.setAttribute('skinWeight', new BufferAttribute(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]), 4));
  const body = new SkinnedMesh(geometry, new MeshBasicMaterial());
  body.name = 'body';
  character.add(body);
  body.bind(new Skeleton(bones));
  const bone = (name: string): Bone => {
    const found = bones.find((b) => b.name === name);
    if (!found) throw new Error(name);
    return found;
  };
  return { character, body, bone };
}

/** Skinned (posed) positions of the clothes vertices bound to `joint`. */
function vertices(clothes: SkinnedMesh, joint: string): Vector3[] {
  const index = clothes.skeleton.bones.findIndex((b) => b.name === joint);
  const skin = clothes.geometry.getAttribute('skinIndex');
  const out: Vector3[] = [];
  for (let i = 0; i < skin.count; i++) if (skin.getX(i) === index) out.push(clothes.getVertexPosition(i, new Vector3()));
  return out;
}

const range = (points: Vector3[], axis: 'x' | 'y' | 'z'): [number, number] => [Math.min(...points.map((p) => p[axis])), Math.max(...points.map((p) => p[axis]))];

function wornClothes(character: Group, entry: string): SkinnedMesh {
  const worn = dressCharacter(character, [entry], () => 1, false);
  expect(worn.skipped).toEqual([]);
  const [clothes] = worn.meshes;
  if (!(clothes instanceof SkinnedMesh)) throw new Error('clothes are not one skinned mesh');
  return clothes;
}

describe('wearing clothes', () => {
  it('is one skinned mesh on the body skeleton, with pieces on the torso and both arms and legs', () => {
    const { character, body } = rig();
    const worn = dressCharacter(character, ['clothes-dress', 'hat-cap-yellow'], () => 1, false);
    expect(worn.entries).toEqual(['clothes-dress', 'hat-cap-yellow']);
    const clothes = worn.meshes.find((m) => m.name === 'accessory:clothes-dress');
    if (!(clothes instanceof SkinnedMesh)) throw new Error('clothes missing');
    expect(worn.meshes.filter((m) => m.name === 'accessory:clothes-dress')).toHaveLength(1);
    expect(clothes.skeleton).toBe(body.skeleton);
    expect(clothes.parent).toBe(body.parent);
    expect(clothes.frustumCulled).toBe(false);
    const skin = clothes.geometry.getAttribute('skinIndex');
    const used = new Set(Array.from({ length: skin.count }, (_, i) => skin.getX(i)));
    expect([...used].map((i) => body.skeleton.bones[i]?.name).sort()).toEqual(['arm-left', 'arm-right', 'leg-left', 'leg-right', 'torso']);
  });

  it('sits each piece on its joint in the bind pose, the right limbs mirroring the left', () => {
    const { character } = rig();
    const clothes = wornClothes(character, 'clothes-tshirt');
    character.updateMatrixWorld(true);
    // The sleeve spans voxels x -1..5, z -3..4 around the arm pivot; one voxel is 0.05.
    const left = vertices(clothes, 'arm-left');
    const right = vertices(clothes, 'arm-right');
    expect(range(left, 'x')[0]).toBeCloseTo(0.35, 5);
    expect(range(left, 'x')[1]).toBeCloseTo(0.65, 5);
    expect(range(right, 'x')[0]).toBeCloseTo(-0.65, 5);
    expect(range(right, 'x')[1]).toBeCloseTo(-0.35, 5);
    expect(range(right, 'z')).toEqual(range(left, 'z'));
    expect(range(left, 'z')[1]).toBeCloseTo(-0.1 + 0.2, 5); // the front (+z) of the sleeve, toward the face
    const torso = vertices(clothes, 'torso');
    expect(range(torso, 'y')[0]).toBeCloseTo(0.2 + 4 * 0.05, 5);
    expect(range(torso, 'y')[1]).toBeCloseTo(0.2 + 20 * 0.05, 5);
  });

  it('moves with the joints: a leg swung forward carries its trouser leg, the torso piece stays', () => {
    const { character, bone } = rig();
    const clothes = wornClothes(character, 'clothes-tshirt');
    character.updateMatrixWorld(true);
    const torsoBefore = vertices(clothes, 'torso');
    const legBefore = vertices(clothes, 'leg-left');
    expect(range(legBefore, 'y')[1]).toBeLessThanOrEqual(0.5 + 1e-6); // hangs below the hip
    bone('leg-left').rotation.x = -Math.PI / 2; // the walk's forward swing, at its widest
    character.updateMatrixWorld(true);
    const leg = vertices(clothes, 'leg-left');
    // The trouser leg (voxels y -5..0) now points forward from the hip, as long as it hung down.
    expect(range(leg, 'z')[0]).toBeCloseTo(0, 5);
    expect(range(leg, 'z')[1]).toBeCloseTo(0.25, 5);
    expect(range(leg, 'y')[0]).toBeGreaterThan(0.5 - 0.15 - 1e-6);
    expect(vertices(clothes, 'torso')).toEqual(torsoBefore);
    expect(range(vertices(clothes, 'leg-right'), 'y')[1]).toBeLessThanOrEqual(0.5 + 1e-6);
  });

  it('can be taken off again, and is skipped on a model without a skeleton', () => {
    const { character } = rig();
    const worn = dressCharacter(character, ['clothes-princess:blue'], () => 1, false);
    expect(worn.entries).toEqual(['clothes-princess:blue']);
    undressCharacter(worn);
    expect(character.getObjectByName('accessory:clothes-princess')).toBeUndefined();
    const statue = new Group().add(new Mesh());
    expect(dressCharacter(statue, ['clothes-dress'], () => 1, false).skipped.map((s) => s.entry)).toEqual(['clothes-dress']);
  });
});

describe('a player character always wears clothes', () => {
  it('adds its own clothes when the child chose none (or chose something unknown), never over her choice', () => {
    expect(withOwnClothes(['hat-cap-yellow'], 'clothes-dress')).toEqual(['hat-cap-yellow', 'clothes-dress']);
    expect(withOwnClothes(['clothes-ao-dai', 'hat-cap-yellow'], 'clothes-dress')).toEqual(['clothes-ao-dai', 'hat-cap-yellow']);
    expect(withOwnClothes(['clothes-princess:blue'], 'clothes-dress')).toEqual(['clothes-princess:blue']);
    expect(withOwnClothes(['clothes-ghost'], 'clothes-dress')).toEqual(['clothes-ghost', 'clothes-dress']);
    expect(withOwnClothes([], undefined)).toEqual([]);
    expect(wearsClothes(['hat-cap-yellow'])).toBe(false);
  });

  const species = Object.entries(z.record(z.string(), speciesSchema).parse(speciesJson));
  it('gives every species open clothes of its own that are today’s look, box for box and colour for colour', () => {
    expect(SPECIES.length).toBeGreaterThan(0);
    for (const [id, def] of species) {
      const clothesId = characterForSpecies(id).clothes;
      const item = clothesId ? ACCESSORIES.get(clothesId) : undefined;
      expect(item?.slot, `${id} clothes`).toBe('clothes');
      expect(item?.unlock, `${id} clothes are open from level 1`).toBeUndefined();
      const outfit: OutfitDef | undefined = OUTFITS.get(def.outfit.split(':')[0] ?? '');
      if (!item || !outfit) throw new Error(`${id}: outfit or clothes missing`);
      const outfitColour = { ...def.palette, ...outfit.palette };
      for (const [joint, boxes] of Object.entries(outfit.parts)) {
        const worn = item.def.parts?.[joint as keyof NonNullable<typeof item.def.parts>] ?? [];
        expect(worn.map(({ color: _c, ...box }) => box), `${id} ${joint}`).toEqual(boxes.map(({ color: _c, ...box }) => box));
        expect(worn.map((b) => item.def.palette[b.color]), `${id} ${joint} colours`).toEqual(boxes.map((b) => outfitColour[b.color]));
      }
    }
  });
});
