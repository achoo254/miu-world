// Builds a playable character GLB without hand-made art: the Blocky Characters rig + 27 clips, and
// either a Cube Pets animal as the head on the rig's own body (flat body colors), or a voxel body
// composed from the character library (packages/voxel/src/character-recipe.ts: species parts, outfit,
// palettes); plus extra keyframe clips from content/animations/*.json.
// All parts are merged into ONE skinned primitive (each part rigidly bound to its rig node) so the
// character costs a single draw call while the original node animations still drive it.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Document, NodeIO, type Accessor, type Animation, type Node as GltfNode } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mat3, mat4, quat, vec3 } from 'gl-matrix';
import { PNG } from 'pngjs';
import { z } from 'zod';
import { characterRecipeSchema, composeCharacter, type CharacterLibrary, type OutfitRule, type VoxelBox } from '../../packages/voxel/src/character-recipe';
import { ASSETS_DIR, REPO_ROOT, readJson } from './asset-lib';
import { readCharacterLibrary, readOutfitRules } from './character-library';
import { clipSchema, sampleClip } from './procedural-clip';
import { validateCharacter } from './validate-character';

const CONTENT_DIR = path.join(REPO_ROOT, 'content');
const HEAD_ATLAS = 512; // head colormap occupies the top 512x512 of a 512x1024 atlas
const PALETTE_GRID = 8; // bottom half: 8x8 flat color cells
const GL_NEAREST = 9728;
/** Model units per voxel of the character library (a head 26 voxels wide is 1.3 units). */
const VOXEL_SIZE = 0.05;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const voxelBoxesSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    z: z.number().int(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
    d: z.number().int().positive(),
    color: z.string().min(1),
    sym: z.boolean().optional(),
  }),
).min(1);

const nodeName = z.string().regex(/^[a-z0-9-]+$/);

export const characterSpecSchema = z
  .object({
    output: z.string().regex(/^generated\/characters\/[a-z0-9-]+\.glb$/),
    /** `player`: a species the child plays as (one per species, with UI portraits); `npc`: a quest character's look. */
    role: z.enum(['player', 'npc']).default('player'),
    rig: z.string().min(1),
    /** Voxel body composed from the character library; replaces the rig meshes and the Cube Pets head and tail. */
    recipe: characterRecipeSchema.optional(),
    headSource: z.string().min(1).optional(),
    /** Nodes of the animal model that become the head (the whole cube body, not a cut mesh). */
    headNodes: z.array(z.string()).min(1).optional(),
    tailNode: z.string().min(1).optional(),
    headScale: z.number().positive().default(1),
    /** Tail pivot height above the bottom of the torso, in rig units. */
    tailHeight: z.number().default(0),
    palette: z.record(z.string(), hexColor).default({}),
    partColors: z.record(z.string(), z.string()).default({}),
    extraAnimations: z.array(z.string()),
    /** Chibi proportions (1 = rig as authored). Torso height, relative to its pivot. */
    torsoScale: z.number().positive().max(2).default(1),
    /** Arm and leg length, relative to shoulder/hip pivots; the whole body drops so feet stay on the ground. */
    limbScale: z.number().positive().max(2).default(1),
    /** Extra vertical shift of the head joint, in model units (negative sinks the head into the shoulders). */
    headOffset: z.number().default(0),
    /** Face blocks (`content/faces/<id>.json`) merged into the head, so the character stays one draw call. */
    face: nodeName.optional(),
    /** Runtime multiplier for accessory size/offset per attach node, so one accessory file fits every variant. */
    accessoryScale: z.record(z.string(), z.number().positive()).default({}),
    /**
     * Player built in the plain `underlayer` outfit: the clothes item (content/accessories/) the game dresses
     * it in when the child has chosen none, so it keeps its species' look.
     */
    clothes: z.string().regex(/^clothes-[a-z0-9-]+$/).optional(),
  })
  .refine((spec) => spec.recipe !== undefined || (spec.headSource !== undefined && spec.headNodes !== undefined && spec.tailNode !== undefined), {
    message: 'a character needs either a recipe or a Cube Pets head (headSource, headNodes, tailNode)',
  });
export type CharacterSpec = z.infer<typeof characterSpecSchema>;

/**
 * Face blocks in "head units": voxel boxes placed relative to the head pivot for a head of scale 1,
 * multiplied by `headScale` when merged so one face file fits every head size.
 */
export const faceSchema = z.object({
  id: nodeName,
  voxelSize: z.number().positive(),
  offset: z.tuple([z.number(), z.number(), z.number()]),
  palette: z.record(z.string(), hexColor),
  boxes: voxelBoxesSchema,
});
export type FaceDef = z.infer<typeof faceSchema>;

export const charactersFileSchema = z.record(z.string(), characterSpecSchema);

interface MergedGeometry {
  positions: number[];
  normals: number[];
  uvs: number[];
  joints: number[];
  indices: number[];
}

type Vec3 = [number, number, number];

function createIO(): NodeIO {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS);
}

function requireNode(doc: Document, name: string): GltfNode {
  const node = doc.getRoot().listNodes().find((n) => n.getName() === name);
  if (!node) throw new Error(`node "${name}" not found`);
  return node;
}

function worldMatrix(node: GltfNode): mat4 {
  return mat4.clone(node.getWorldMatrix() as unknown as mat4);
}

function invert(m: mat4): mat4 {
  const out = mat4.invert(mat4.create(), m);
  if (!out) throw new Error('singular transform');
  return out;
}

function paletteUv(index: number): [number, number] {
  const col = index % PALETTE_GRID;
  const row = Math.floor(index / PALETTE_GRID);
  return [(col + 0.5) / PALETTE_GRID, 0.5 + (row + 0.5) / (PALETTE_GRID * 2)];
}

/** Appends a node's mesh to the merged buffers, transformed into model space and bound to `joint`. */
function appendPart(
  merged: MergedGeometry,
  node: GltfNode,
  transform: mat4,
  joint: number,
  mapUv: (u: number, v: number) => [number, number],
): void {
  const mesh = node.getMesh();
  if (!mesh) throw new Error(`node "${node.getName()}" has no mesh`);
  const normalMatrix = mat3.normalFromMat4(mat3.create(), transform);
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    const nor = prim.getAttribute('NORMAL');
    const uv = prim.getAttribute('TEXCOORD_0');
    const idx = prim.getIndices();
    if (!pos || !nor || !uv || !idx) throw new Error(`${node.getName()}: primitive needs POSITION, NORMAL, TEXCOORD_0, indices`);
    const base = merged.positions.length / 3;
    for (let i = 0; i < pos.getCount(); i++) {
      const p = vec3.transformMat4(vec3.create(), pos.getElement(i, [0, 0, 0]) as Vec3, transform);
      const n = vec3.normalize(vec3.create(), vec3.transformMat3(vec3.create(), nor.getElement(i, [0, 0, 0]) as Vec3, normalMatrix));
      const [u, v] = uv.getElement(i, [0, 0]) as [number, number];
      merged.positions.push(p[0], p[1], p[2]);
      merged.normals.push(n[0], n[1], n[2]);
      merged.uvs.push(...mapUv(u, v));
      merged.joints.push(joint, 0, 0, 0);
    }
    for (let i = 0; i < idx.getCount(); i++) merged.indices.push(base + idx.getScalar(i));
  }
}

/** Unit-cube faces: outward normal and 4 corners (counter-clockwise seen from outside). */
const CUBE_FACES: Array<{ n: Vec3; c: Vec3[] }> = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]] },
];

/** A box and, when `sym` is set, its mirror image across x = 0. */
function expandSymmetric(boxes: readonly VoxelBox[]): VoxelBox[] {
  return boxes.flatMap((box) => (box.sym ? [box, { ...box, x: -(box.x + box.w) }] : [box]));
}

/**
 * Appends voxel boxes as flat-colored cubes bound to `joint`: each box spans
 * origin + (x, y, z) * unit to origin + (x + w, y + h, z + d) * unit.
 */
function appendBoxes(
  merged: MergedGeometry,
  boxes: readonly VoxelBox[],
  origin: Vec3,
  unit: number,
  joint: number,
  cellOf: (color: string) => number | undefined,
  label: string,
): void {
  for (const box of boxes) {
    const cell = cellOf(box.color);
    if (cell === undefined) throw new Error(`${label}: color "${box.color}" is not in its palette`);
    const uv = paletteUv(cell);
    const corner: Vec3 = [origin[0] + box.x * unit, origin[1] + box.y * unit, origin[2] + box.z * unit];
    for (const { n, c } of CUBE_FACES) {
      const base = merged.positions.length / 3;
      for (const [cx, cy, cz] of c) {
        merged.positions.push(corner[0] + cx * box.w * unit, corner[1] + cy * box.h * unit, corner[2] + cz * box.d * unit);
        merged.normals.push(...n);
        merged.uvs.push(...uv);
        merged.joints.push(joint, 0, 0, 0);
      }
      merged.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}

/** Face blocks (eyes, cheeks, nose) in head units: pivot + headScale * (offset + voxel * voxelSize). */
function appendFace(
  merged: MergedGeometry,
  face: FaceDef,
  pivot: Vec3,
  headScale: number,
  joint: number,
  cellOf: (color: string) => number | undefined,
): void {
  const origin: Vec3 = [pivot[0] + headScale * face.offset[0], pivot[1] + headScale * face.offset[1], pivot[2] + headScale * face.offset[2]];
  appendBoxes(merged, expandSymmetric(face.boxes), origin, face.voxelSize * headScale, joint, cellOf, `face ${face.id}`);
}

/** Model-space bounds of a node's mesh after `transform`. */
function transformedBounds(node: GltfNode, transform: mat4): { min: Vec3; max: Vec3 } {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const prim of node.getMesh()?.listPrimitives() ?? []) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    for (let i = 0; i < pos.getCount(); i++) {
      const p = vec3.transformMat4(vec3.create(), pos.getElement(i, [0, 0, 0]) as Vec3, transform);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k] as number, p[k] as number);
        max[k] = Math.max(max[k] as number, p[k] as number);
      }
    }
  }
  return { min, max };
}

/** A voxel body has no head colormap: the top half of the atlas then stays empty. */
function buildAtlas(headColormap: Uint8Array | undefined, colors: string[]): Uint8Array {
  if (colors.length > PALETTE_GRID * PALETTE_GRID) throw new Error('too many palette colors');
  const atlas = new PNG({ width: HEAD_ATLAS, height: HEAD_ATLAS * 2 });
  if (headColormap) {
    const head = PNG.sync.read(Buffer.from(headColormap));
    if (head.width !== HEAD_ATLAS || head.height !== HEAD_ATLAS) throw new Error(`head colormap must be ${HEAD_ATLAS}px`);
    atlas.data.set(head.data, 0); // same width, so the head image is the first HEAD_ATLAS rows
  }
  const cell = HEAD_ATLAS / PALETTE_GRID;
  colors.forEach((hex, i) => {
    const rgb = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    const x0 = (i % PALETTE_GRID) * cell;
    const y0 = HEAD_ATLAS + Math.floor(i / PALETTE_GRID) * cell;
    for (let y = y0; y < y0 + cell; y++) {
      for (let x = x0; x < x0 + cell; x++) {
        atlas.data.set([rgb[0] ?? 0, rgb[1] ?? 0, rgb[2] ?? 0, 255], (y * atlas.width + x) * 4);
      }
    }
  });
  return new Uint8Array(PNG.sync.write(atlas, { colorType: 6 }));
}

function cloneTree(src: GltfNode, out: Document, byName: Map<string, GltfNode>): GltfNode {
  const node = out
    .createNode(src.getName())
    .setTranslation(src.getTranslation())
    .setRotation(src.getRotation())
    .setScale(src.getScale());
  byName.set(src.getName(), node);
  for (const child of src.listChildren()) node.addChild(cloneTree(child, out, byName));
  return node;
}

/**
 * `translationDeltas`: joints moved by the chibi reshape; their translation keyframes shift by the
 * same amount so every clip keeps the new proportions.
 */
function copyAnimations(
  rig: Document,
  out: Document,
  byName: Map<string, GltfNode>,
  buffer: ReturnType<Document['createBuffer']>,
  translationDeltas: ReadonlyMap<string, Vec3>,
): void {
  const copied = new Map<Accessor, Accessor>();
  const copy = (src: Accessor): Accessor => {
    const hit = copied.get(src);
    if (hit) return hit;
    const array = src.getArray();
    if (!array) throw new Error('animation accessor without data');
    const next = out.createAccessor().setType(src.getType()).setArray(array.slice()).setBuffer(buffer);
    copied.set(src, next);
    return next;
  };
  for (const anim of rig.getRoot().listAnimations()) {
    const next = out.createAnimation(anim.getName());
    for (const channel of anim.listChannels()) {
      const sampler = channel.getSampler();
      const target = channel.getTargetNode();
      const input = sampler?.getInput();
      const output = sampler?.getOutput();
      const targetPath = channel.getTargetPath();
      if (!sampler || !target || !input || !output || !targetPath) continue;
      const node = byName.get(target.getName());
      if (!node) throw new Error(`animation ${anim.getName()} targets unknown node ${target.getName()}`);
      const delta = targetPath === 'translation' ? translationDeltas.get(target.getName()) : undefined;
      const inAccessor = copy(input); // input before output: keeps accessor order (and bytes) stable
      let outAccessor: Accessor;
      if (delta) {
        const values = output.getArray();
        if (!values) throw new Error('animation accessor without data');
        const shifted = new Float32Array(values.length);
        for (let i = 0; i < values.length; i++) shifted[i] = (values[i] ?? 0) + (delta[i % 3] ?? 0);
        outAccessor = out.createAccessor().setType(output.getType()).setArray(shifted).setBuffer(buffer);
      } else {
        outAccessor = copy(output);
      }
      const s = out.createAnimationSampler().setInput(inAccessor).setOutput(outAccessor).setInterpolation(sampler.getInterpolation());
      next.addSampler(s).addChannel(out.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(s));
    }
  }
}

async function addExtraClip(
  out: Document,
  name: string,
  joints: GltfNode[],
  buffer: ReturnType<Document['createBuffer']>,
): Promise<Animation> {
  const clip = await readJson(path.join(CONTENT_DIR, 'animations', `${name}.json`), clipSchema);
  const byName = new Map(joints.map((j) => [j.getName(), j]));
  const tracks = sampleClip(clip, (node) => {
    const joint = byName.get(node);
    if (!joint) throw new Error(`clip ${name} targets unknown node ${node}`);
    return { rotation: quat.clone(joint.getRotation() as unknown as quat), translation: joint.getTranslation() as Vec3 };
  });
  const anim = out.createAnimation(clip.name);
  const add = (node: GltfNode, targetPath: 'rotation' | 'translation' | 'scale', times: Float32Array<ArrayBuffer>, values: Float32Array<ArrayBuffer>): void => {
    const input = out.createAccessor().setType('SCALAR').setArray(times).setBuffer(buffer);
    const output = out.createAccessor().setType(targetPath === 'rotation' ? 'VEC4' : 'VEC3').setArray(values).setBuffer(buffer);
    const sampler = out.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
    anim.addSampler(sampler).addChannel(out.createAnimationChannel().setTargetNode(node).setTargetPath(targetPath).setSampler(sampler));
  };
  for (const track of tracks) {
    const node = byName.get(track.node);
    if (node) add(node, track.path, track.times, track.values);
  }
  // Pin every other joint channel to its bind pose so the clip fully defines the pose when blended.
  const holdTimes = new Float32Array([0, clip.duration]);
  for (const joint of joints) {
    for (const targetPath of ['translation', 'rotation', 'scale'] as const) {
      if (tracks.some((t) => t.node === joint.getName() && t.path === targetPath)) continue;
      const value = targetPath === 'translation' ? joint.getTranslation() : targetPath === 'rotation' ? joint.getRotation() : joint.getScale();
      add(joint, targetPath, holdTimes, new Float32Array([...value, ...value]));
    }
  }
  return anim;
}

/** `library` and `rules` default to content/; tests pass their own. */
export async function buildCharacter(
  id: string,
  spec: CharacterSpec,
  library?: CharacterLibrary,
  rules?: readonly OutfitRule[],
): Promise<Uint8Array> {
  const io = createIO();
  const rig = await io.read(path.join(ASSETS_DIR, spec.rig));
  const rigRoot = requireNode(rig, 'root');
  const rigTop = rigRoot.getParentNode();
  if (!rigTop) throw new Error('rig root must have a parent character node');
  // Part vertices are baked in the rig file's world space and skinned under the cloned top node,
  // which is only equivalent while that node is the identity.
  if (!mat4.equals(worldMatrix(rigTop), mat4.create())) throw new Error('rig top node must have an identity transform');

  const out = new Document();
  const buffer = out.createBuffer();
  const byName = new Map<string, GltfNode>();
  const top = cloneTree(rigTop, out, byName).setName(id);
  out.createScene('Scene').addChild(top);
  out.getRoot().setDefaultScene(out.getRoot().listScenes()[0] ?? null);

  const outNode = (name: string): GltfNode => {
    const n = byName.get(name);
    if (!n) throw new Error(`rig node "${name}" missing`);
    return n;
  };
  const rigJointNames: string[] = [];
  const collect = (n: GltfNode): void => {
    rigJointNames.push(n.getName());
    n.listChildren().forEach(collect);
  };
  collect(rigRoot);

  // 0. Chibi reshape: move joints (shorter torso lowers shoulders/neck; shorter legs drop the whole
  // body) and remember each move so animation keyframes follow. Skipped entirely at scale 1.
  const reshaped = spec.torsoScale !== 1 || spec.limbScale !== 1 || spec.headOffset !== 0;
  const translationDeltas = new Map<string, Vec3>();
  const partScaleY = new Map<string, number>();
  if (reshaped) {
    const leg = requireNode(rig, 'leg-left');
    const legBounds = transformedBounds(leg, worldMatrix(leg));
    const hipY = (leg.getWorldTranslation() as Vec3)[1];
    translationDeltas.set('root', [0, -(1 - spec.limbScale) * (hipY - legBounds.min[1]), 0]);
    for (const name of ['arm-left', 'arm-right', 'head']) {
      const localY = (outNode(name).getTranslation() as Vec3)[1];
      translationDeltas.set(name, [0, localY * (spec.torsoScale - 1) + (name === 'head' ? spec.headOffset : 0), 0]);
    }
    for (const [name, delta] of translationDeltas) {
      const t = outNode(name).getTranslation() as Vec3;
      outNode(name).setTranslation([t[0] + delta[0], t[1] + delta[1], t[2] + delta[2]]);
    }
    partScaleY.set('torso', spec.torsoScale);
    for (const name of ['arm-left', 'arm-right', 'leg-left', 'leg-right']) partScaleY.set(name, spec.limbScale);
  }
  /** Model-space transform for a rig part: its (possibly moved) joint, squashed along its own y axis. */
  const partMatrix = (rigNode: GltfNode): mat4 => {
    if (!reshaped) return worldMatrix(rigNode);
    const m = worldMatrix(outNode(rigNode.getName()));
    const sy = partScaleY.get(rigNode.getName()) ?? 1;
    return sy === 1 ? m : mat4.scale(mat4.create(), m, [1, sy, 1]);
  };

  const merged: MergedGeometry = { positions: [], normals: [], uvs: [], joints: [], indices: [] };
  const joints: GltfNode[] = rigJointNames.map(outNode);
  const jointIndex = (name: string): number => {
    const index = rigJointNames.indexOf(name);
    if (index < 0) throw new Error(`mesh node "${name}" is not under the rig root`);
    return index;
  };
  /** A new joint on the torso at a model-space point (the tail). */
  const addTorsoJoint = (name: string, at: Vec3): number => {
    const torso = outNode('torso');
    const local = vec3.transformMat4(vec3.create(), at, invert(worldMatrix(torso)));
    const joint = out.createNode(name).setTranslation([local[0], local[1], local[2]]);
    torso.addChild(joint);
    joints.push(joint);
    return joints.length - 1;
  };

  let colormap: Uint8Array | undefined;
  let paletteHex: string[];
  if (spec.recipe) {
    // 1-3. Voxel body: every composed part's boxes around its (reshaped) joint pivot, one palette.
    const composed = composeCharacter(spec.recipe, library ?? (await readCharacterLibrary()), rules ?? (await readOutfitRules()));
    const colorNames = Object.keys(composed.palette).sort();
    const colorIndex = new Map(colorNames.map((name, i) => [name, i]));
    paletteHex = colorNames.map((n) => composed.palette[n] ?? '#ff00ff');
    const unit = VOXEL_SIZE;
    const label = `${id} (${spec.recipe.species} in ${composed.outfit})`;
    for (const [name, boxes] of composed.parts) {
      if (name === 'tail') continue;
      const pivot = outNode(name).getWorldTranslation() as Vec3;
      appendBoxes(merged, boxes, pivot, unit, jointIndex(name), (c) => colorIndex.get(c), label);
    }
    const tailBoxes: readonly VoxelBox[] | undefined = composed.parts.get('tail');
    if (tailBoxes) {
      const torsoPivot = outNode('torso').getWorldTranslation() as Vec3;
      const at: Vec3 = [
        torsoPivot[0] + composed.tailPivot[0] * unit,
        torsoPivot[1] + composed.tailPivot[1] * unit,
        torsoPivot[2] + composed.tailPivot[2] * unit,
      ];
      appendBoxes(merged, tailBoxes, at, unit, addTorsoJoint('tail', at), (c) => colorIndex.get(c), label);
    }
  } else {
    const { headSource, headNodes, tailNode } = spec;
    if (!headSource || !headNodes || !tailNode) throw new Error(`${id}: needs headSource, headNodes and tailNode`);
    const animal = await io.read(path.join(ASSETS_DIR, headSource));
    const face = spec.face ? await readJson(path.join(CONTENT_DIR, 'faces', `${spec.face}.json`), faceSchema) : undefined;

    // Palette: one flat cell per named color, referenced by rig part (face colors appended after).
    const colorNames = Object.keys(spec.palette).sort();
    const faceColorNames = face ? Object.keys(face.palette).sort().map((n) => `face:${n}`) : [];
    const colorIndex = new Map([...colorNames, ...faceColorNames].map((name, i) => [name, i]));

    // 1. Rig body parts (everything with a mesh except the human head), flat palette colors.
    for (const node of rig.getRoot().listNodes()) {
      if (!node.getMesh() || node.getName() === 'head') continue;
      const colorName = spec.partColors[node.getName()];
      const cell = colorName === undefined ? undefined : colorIndex.get(colorName);
      if (cell === undefined) throw new Error(`no palette color for rig part "${node.getName()}"`);
      const uv = paletteUv(cell);
      appendPart(merged, node, partMatrix(node), jointIndex(node.getName()), () => uv);
    }

    // 2. Animal head: whole cube body scaled and seated on the rig's head pivot.
    const headPivot = outNode('head').getWorldTranslation() as Vec3;
    const bodyNode = requireNode(animal, headNodes[0] ?? '');
    const bodyBounds = transformedBounds(bodyNode, worldMatrix(bodyNode));
    const s = spec.headScale;
    const align = mat4.create();
    mat4.translate(align, align, [
      headPivot[0] - s * (bodyBounds.min[0] + bodyBounds.max[0]) / 2,
      headPivot[1] - s * bodyBounds.min[1],
      headPivot[2] - s * (bodyBounds.min[2] + bodyBounds.max[2]) / 2,
    ]);
    mat4.scale(align, align, [s, s, s]);
    const headUv = (u: number, v: number): [number, number] => {
      if (u < 0 || u > 1 || v < 0 || v > 1) throw new Error('head UV outside [0,1] cannot share the atlas');
      return [u, v * 0.5];
    };
    for (const name of headNodes) {
      const node = requireNode(animal, name);
      appendPart(merged, node, mat4.multiply(mat4.create(), align, worldMatrix(node)), jointIndex('head'), headUv);
    }

    // 3. Tail moves from the animal body to the back of the rig torso, on its own joint.
    const torsoRig = requireNode(rig, 'torso');
    const torsoBounds = transformedBounds(torsoRig, partMatrix(torsoRig));
    const tailSrc = requireNode(animal, tailNode);
    const tailPivot = vec3.transformMat4(vec3.create(), tailSrc.getWorldTranslation() as Vec3, align);
    const tailTarget: Vec3 = [0, torsoBounds.min[1] + spec.tailHeight, torsoBounds.min[2]];
    const tailShift = mat4.fromTranslation(mat4.create(), vec3.subtract(vec3.create(), tailTarget, tailPivot));
    const tailJoint = addTorsoJoint('tail', tailTarget);
    const tailTransform = mat4.multiply(mat4.create(), tailShift, mat4.multiply(mat4.create(), align, worldMatrix(tailSrc)));
    appendPart(merged, tailSrc, tailTransform, tailJoint, headUv);

    // 3b. Face blocks, in head units scaled with the head, bound to the head joint.
    if (face) appendFace(merged, face, headPivot, s, jointIndex('head'), (color) => colorIndex.get(`face:${color}`));

    colormap = animal.getRoot().listTextures()[0]?.getImage() ?? undefined;
    if (!colormap) throw new Error('animal model has no colormap texture');
    paletteHex = [
      ...colorNames.map((n) => spec.palette[n] ?? '#ff00ff'),
      ...faceColorNames.map((n) => face?.palette[n.slice('face:'.length)] ?? '#ff00ff'),
    ];
  }

  // 4. Material + atlas (head colormap, if any, on top; palette cells below).
  const atlas = out
    .createTexture('miu-atlas')
    .setMimeType('image/png')
    .setImage(buildAtlas(colormap, paletteHex));
  const material = out.createMaterial(`${id}-material`).setBaseColorTexture(atlas).setMetallicFactor(0).setRoughnessFactor(1);
  material.getBaseColorTextureInfo()?.setMagFilter(GL_NEAREST).setMinFilter(GL_NEAREST);

  // 5. One skinned primitive: each vertex fully weighted to its part's joint.
  const vertexCount = merged.positions.length / 3;
  if (vertexCount > 65535) throw new Error('character exceeds 16-bit index range');
  const prim = out
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(new Float32Array(merged.positions)).setBuffer(buffer))
    .setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(new Float32Array(merged.normals)).setBuffer(buffer))
    .setAttribute('TEXCOORD_0', out.createAccessor().setType('VEC2').setArray(new Float32Array(merged.uvs)).setBuffer(buffer))
    .setAttribute('JOINTS_0', out.createAccessor().setType('VEC4').setArray(new Uint8Array(merged.joints)).setBuffer(buffer))
    .setAttribute(
      'WEIGHTS_0',
      out.createAccessor().setType('VEC4').setArray(new Float32Array(vertexCount * 4).map((_, i) => (i % 4 === 0 ? 1 : 0))).setBuffer(buffer),
    )
    .setIndices(out.createAccessor().setType('SCALAR').setArray(new Uint16Array(merged.indices)).setBuffer(buffer));

  const inverseBind = new Float32Array(joints.length * 16);
  joints.forEach((joint, i) => inverseBind.set(invert(worldMatrix(joint)), i * 16));
  const skin = out
    .createSkin(`${id}-skin`)
    .setSkeleton(outNode('root'))
    .setInverseBindMatrices(out.createAccessor().setType('MAT4').setArray(inverseBind).setBuffer(buffer));
  joints.forEach((joint) => skin.addJoint(joint));
  top.addChild(out.createNode(`${id}-mesh`).setMesh(out.createMesh(`${id}-mesh`).addPrimitive(prim)).setSkin(skin));

  // 6. Animations: every rig clip, then the authored extras.
  copyAnimations(rig, out, byName, buffer, translationDeltas);
  for (const name of spec.extraAnimations) await addExtraClip(out, name, joints, buffer);

  out.getRoot().getAsset().generator = 'miu-world kitbash-character';
  return io.writeBinary(out);
}

export async function readCharacterSpecs(): Promise<Record<string, CharacterSpec>> {
  return readJson(path.join(CONTENT_DIR, 'characters.json'), charactersFileSchema);
}

export async function rigAnimationNames(spec: CharacterSpec): Promise<string[]> {
  const rig = await createIO().read(path.join(ASSETS_DIR, spec.rig));
  return rig.getRoot().listAnimations().map((a) => a.getName());
}

async function main(): Promise<void> {
  const specs = await readCharacterSpecs();
  let failed = false;
  for (const [id, spec] of Object.entries(specs)) {
    const glb = await buildCharacter(id, spec);
    const target = path.join(ASSETS_DIR, spec.output);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, glb);
    const doc = await createIO().readBinary(glb);
    const report = validateCharacter(doc, { expectedAnimations: [...(await rigAnimationNames(spec)), ...spec.extraAnimations] });
    console.log(`${id}: ${glb.byteLength} bytes, ${report.triangles} tris, ${report.drawCalls} draw call(s), ${report.animations.length} clips`);
    for (const err of report.errors) console.error(`  - ${err}`);
    failed ||= report.errors.length > 0;
  }
  if (failed) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
