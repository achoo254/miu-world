import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCharacter, characterSpecSchema, readCharacterSpecs, rigAnimationNames, type CharacterSpec } from './kitbash-character';
import { validateCharacter, type CharacterReport } from './validate-character';

const RIG_HEAD_WIDTH = 0.8; // Blocky Characters head cube, measured from the source GLB
/** sha256 of the POC `miu-cat.glb` (commit 16db718): the chibi parameters at their defaults must rebuild it exactly. */
const POC_GLB_SHA256 = '523d172ce716b68982d432bf85f012a53a8e0b69567101c3be0f3998a093bd1c';

let spec: CharacterSpec;
let glb: Uint8Array;
let report: CharacterReport;
let rigClips: string[];
let poc: CharacterReport;

/** The POC Miu: same rig, the Cube Pets cat head on the rig's own body, POC body colours. */
function pocSpec(from: CharacterSpec): CharacterSpec {
  return characterSpecSchema.parse({
    output: from.output,
    rig: from.rig,
    extraAnimations: from.extraAnimations,
    headSource: 'packs/kenney-cube-pets/2.0/animal-cat.glb',
    headNodes: ['body', 'Group'],
    tailNode: 'tail',
    headScale: 0.8,
    tailHeight: 0.35,
    partColors: { torso: 'shirt', 'arm-left': 'fur', 'arm-right': 'fur', 'leg-left': 'pants', 'leg-right': 'pants' },
    palette: { fur: '#7c8096', shirt: '#f39ac0', pants: '#6c8ed8' },
  });
}

beforeAll(async () => {
  const specs = await readCharacterSpecs();
  const miu = specs['miu-cat'];
  if (!miu) throw new Error('miu-cat spec missing');
  spec = miu;
  glb = await buildCharacter('miu-cat', spec);
  rigClips = await rigAnimationNames(spec);
  report = validateCharacter(await new NodeIO().readBinary(glb), { expectedAnimations: [...rigClips, ...spec.extraAnimations] });
  poc = validateCharacter(await new NodeIO().readBinary(await buildCharacter('miu-cat', pocSpec(spec))), { expectedAnimations: [] });
});

describe('miu-cat composed from the character library (chibi)', () => {
  it('passes structural validation', () => {
    expect(report.errors).toEqual([]);
  });

  it('keeps all 27 rig clips and adds wave/jump/yawn/cheer', () => {
    expect(rigClips).toHaveLength(27);
    expect(report.animations).toHaveLength(31);
    expect(report.animations).toEqual(expect.arrayContaining(['idle', 'walk', 'sprint', 'pick-up', 'wave', 'jump', 'yawn', 'cheer']));
  });

  it('fits the budget: one material, one draw call, <=5k triangles', () => {
    expect(report.materials).toBe(1);
    expect(report.drawCalls).toBe(1);
    expect(report.triangles).toBeLessThanOrEqual(5000);
  });

  it('seats the head on the shoulders at a chibi 1.5-1.9x the rig head width', () => {
    const head = report.jointBounds.get('head');
    const torso = report.jointBounds.get('torso');
    if (!head || !torso) throw new Error('missing joint bounds');
    expect(head.min[1]).toBeGreaterThanOrEqual(torso.max[1] - 1e-3);
    const ratio = (head.max[0] - head.min[0]) / RIG_HEAD_WIDTH;
    expect(ratio).toBeGreaterThanOrEqual(1.5);
    expect(ratio).toBeLessThanOrEqual(1.9);
  });

  it('keeps the feet on the ground and the tail behind the torso', () => {
    const leg = report.jointBounds.get('leg-left');
    const tail = report.jointBounds.get('tail');
    const torso = report.jointBounds.get('torso');
    if (!leg || !tail || !torso) throw new Error('missing joint bounds');
    expect(leg.min[1]).toBeCloseTo(0, 3);
    expect(tail.max[2]).toBeLessThanOrEqual(torso.min[2] + 0.05);
  });

  it('is more chibi than the POC: bigger head relative to body height, face blocks in front', () => {
    const ratio = (r: CharacterReport): number => {
      const head = r.jointBounds.get('head');
      const leg = r.jointBounds.get('leg-left');
      if (!head || !leg) throw new Error('missing joint bounds');
      return (head.max[1] - head.min[1]) / (head.min[1] - leg.min[1]);
    };
    expect(ratio(report)).toBeGreaterThan(ratio(poc));
    expect(report.triangles).toBeGreaterThan(poc.triangles);
    const head = report.jointBounds.get('head');
    const pocHead = poc.jointBounds.get('head');
    if (!head || !pocHead) throw new Error('missing joint bounds');
    expect(head.max[2]).toBeGreaterThan(pocHead.max[2]);
  });

  it('is deterministic', async () => {
    const again = await buildCharacter('miu-cat', spec);
    expect(Buffer.from(again).equals(Buffer.from(glb))).toBe(true);
  });

  it('rebuilds the POC Miu byte for byte when the chibi parameters are left at their defaults', async () => {
    const bytes = await buildCharacter('miu-cat', pocSpec(spec));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(POC_GLB_SHA256);
  });

  it('mirrors the left arm and leg onto the right side', () => {
    for (const [left, right] of [['arm-left', 'arm-right'], ['leg-left', 'leg-right']] as const) {
      const l = report.jointBounds.get(left);
      const r = report.jointBounds.get(right);
      if (!l || !r) throw new Error(`missing ${left}/${right} bounds`);
      expect(r.min[0]).toBeCloseTo(-l.max[0], 5);
      expect(r.max[0]).toBeCloseTo(-l.min[0], 5);
      expect([r.min[1], r.max[1], r.min[2], r.max[2]]).toEqual([l.min[1], l.max[1], l.min[2], l.max[2]]);
    }
  });

  it('is symmetric left to right, so the face and ears are centred', () => {
    const head = report.jointBounds.get('head');
    if (!head) throw new Error('missing head bounds');
    expect(head.min[0]).toBeCloseTo(-head.max[0], 5);
  });

  it('needs either a recipe or a Cube Pets head', () => {
    const { recipe: _recipe, ...headless } = spec;
    expect(characterSpecSchema.safeParse(headless).success).toBe(false);
    expect(characterSpecSchema.safeParse({ ...headless, recipe: { species: 'Bad Species' } }).success).toBe(false);
  });

  it('rejects out-of-range proportions', () => {
    expect(characterSpecSchema.safeParse({ ...spec, torsoScale: 0 }).success).toBe(false);
    expect(characterSpecSchema.safeParse({ ...spec, limbScale: 3 }).success).toBe(false);
    expect(characterSpecSchema.safeParse({ ...spec, face: 'Bad Face' }).success).toBe(false);
  });
});
