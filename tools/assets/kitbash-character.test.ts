import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCharacter, readCharacterSpecs, rigAnimationNames, type CharacterSpec } from './kitbash-character';
import { validateCharacter, type CharacterReport } from './validate-character';

const RIG_HEAD_WIDTH = 0.8; // Blocky Characters head cube, measured from the source GLB

let spec: CharacterSpec;
let glb: Uint8Array;
let report: CharacterReport;
let rigClips: string[];

beforeAll(async () => {
  const specs = await readCharacterSpecs();
  const miu = specs['miu-cat'];
  if (!miu) throw new Error('miu-cat spec missing');
  spec = miu;
  glb = await buildCharacter('miu-cat', spec);
  rigClips = await rigAnimationNames(spec);
  report = validateCharacter(await new NodeIO().readBinary(glb), { expectedAnimations: [...rigClips, ...spec.extraAnimations] });
});

describe('kitbash miu-cat', () => {
  it('passes structural validation', () => {
    expect(report.errors).toEqual([]);
  });

  it('keeps all 27 rig clips and adds wave/jump/yawn/cheer', () => {
    expect(rigClips).toHaveLength(27);
    expect(report.animations).toHaveLength(31);
    expect(report.animations).toEqual(expect.arrayContaining(['idle', 'walk', 'sprint', 'pick-up', 'wave', 'jump', 'yawn', 'cheer']));
  });

  it('fits the budget: one material, <=3 draw calls, <=5k triangles', () => {
    expect(report.materials).toBe(1);
    expect(report.drawCalls).toBeLessThanOrEqual(3);
    expect(report.triangles).toBeLessThanOrEqual(5000);
  });

  it('seats the head above the torso at a chibi 1.2-1.6x head width', () => {
    const head = report.jointBounds.get('head');
    const torso = report.jointBounds.get('torso');
    expect(head && torso).toBeTruthy();
    if (!head || !torso) return;
    expect(head.min[1]).toBeGreaterThanOrEqual(torso.max[1] - 1e-3);
    const ratio = (head.max[0] - head.min[0]) / RIG_HEAD_WIDTH;
    expect(ratio).toBeGreaterThanOrEqual(1.2);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it('puts the tail behind the torso', () => {
    const tail = report.jointBounds.get('tail');
    const torso = report.jointBounds.get('torso');
    expect(tail && torso).toBeTruthy();
    if (!tail || !torso) return;
    expect(tail.max[2]).toBeLessThanOrEqual(torso.min[2] + 0.05);
  });

  it('is deterministic', async () => {
    const again = await buildCharacter('miu-cat', spec);
    expect(Buffer.from(again).equals(Buffer.from(glb))).toBe(true);
  });
});
