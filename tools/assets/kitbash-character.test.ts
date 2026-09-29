import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { ASSETS_DIR } from './asset-lib';
import { buildCharacter, characterSpecSchema, readCharacterSpecs, rigAnimationNames, type CharacterSpec } from './kitbash-character';
import { validateCharacter, type CharacterReport } from './validate-character';

const RIG_HEAD_WIDTH = 0.8; // Blocky Characters head cube, measured from the source GLB
const VARIANTS = ['miu-cat-chibi-a', 'miu-cat-chibi-b', 'miu-cat-chibi-c'];

let specs: Record<string, CharacterSpec>;
let rigClips: string[];
const built = new Map<string, { glb: Uint8Array; report: CharacterReport }>();

beforeAll(async () => {
  specs = await readCharacterSpecs();
  const miu = specs['miu-cat'];
  if (!miu) throw new Error('miu-cat spec missing');
  rigClips = await rigAnimationNames(miu);
  for (const id of ['miu-cat', ...VARIANTS]) {
    const spec = specs[id];
    if (!spec) throw new Error(`${id} spec missing`);
    const glb = await buildCharacter(id, spec);
    built.set(id, { glb, report: validateCharacter(await new NodeIO().readBinary(glb), { expectedAnimations: [...rigClips, ...spec.extraAnimations] }) });
  }
});

function get(id: string): { glb: Uint8Array; report: CharacterReport } {
  const hit = built.get(id);
  if (!hit) throw new Error(`${id} not built`);
  return hit;
}

describe('kitbash miu-cat', () => {
  it('passes structural validation', () => {
    expect(get('miu-cat').report.errors).toEqual([]);
  });

  it('keeps all 27 rig clips and adds wave/jump/yawn/cheer', () => {
    expect(rigClips).toHaveLength(27);
    const { report } = get('miu-cat');
    expect(report.animations).toHaveLength(31);
    expect(report.animations).toEqual(expect.arrayContaining(['idle', 'walk', 'sprint', 'pick-up', 'wave', 'jump', 'yawn', 'cheer']));
  });

  it('fits the budget: one material, <=3 draw calls, <=5k triangles', () => {
    const { report } = get('miu-cat');
    expect(report.materials).toBe(1);
    expect(report.drawCalls).toBeLessThanOrEqual(3);
    expect(report.triangles).toBeLessThanOrEqual(5000);
  });

  it('seats the head above the torso at a chibi 1.2-1.6x head width', () => {
    const head = get('miu-cat').report.jointBounds.get('head');
    const torso = get('miu-cat').report.jointBounds.get('torso');
    expect(head && torso).toBeTruthy();
    if (!head || !torso) return;
    expect(head.min[1]).toBeGreaterThanOrEqual(torso.max[1] - 1e-3);
    const ratio = (head.max[0] - head.min[0]) / RIG_HEAD_WIDTH;
    expect(ratio).toBeGreaterThanOrEqual(1.2);
    expect(ratio).toBeLessThanOrEqual(1.6);
  });

  it('puts the tail behind the torso', () => {
    const tail = get('miu-cat').report.jointBounds.get('tail');
    const torso = get('miu-cat').report.jointBounds.get('torso');
    expect(tail && torso).toBeTruthy();
    if (!tail || !torso) return;
    expect(tail.max[2]).toBeLessThanOrEqual(torso.min[2] + 0.05);
  });

  it('is deterministic', async () => {
    const spec = specs['miu-cat'];
    if (!spec) throw new Error('missing');
    const again = await buildCharacter('miu-cat', spec);
    expect(Buffer.from(again).equals(Buffer.from(get('miu-cat').glb))).toBe(true);
  });

  it('new chibi parameters default to the original shape, byte for byte', async () => {
    const spec = specs['miu-cat'];
    if (!spec) throw new Error('missing');
    expect(spec).toMatchObject({ torsoScale: 1, limbScale: 1, headOffset: 0 });
    expect(spec.face).toBeUndefined();
    const committed = await readFile(path.join(ASSETS_DIR, spec.output));
    expect(Buffer.from(get('miu-cat').glb).equals(committed)).toBe(true);
  });

  it('rejects out-of-range proportions', () => {
    const base = specs['miu-cat'];
    expect(characterSpecSchema.safeParse({ ...base, torsoScale: 0 }).success).toBe(false);
    expect(characterSpecSchema.safeParse({ ...base, limbScale: 3 }).success).toBe(false);
    expect(characterSpecSchema.safeParse({ ...base, face: 'Bad Face' }).success).toBe(false);
  });
});

describe('chibi variants', () => {
  it.each(VARIANTS)('%s passes the validator within budget (1 draw call, <=5k tris, 31 clips)', (id) => {
    const { report } = get(id);
    expect(report.errors).toEqual([]);
    expect(report.drawCalls).toBe(1);
    expect(report.materials).toBe(1);
    expect(report.triangles).toBeLessThanOrEqual(5000);
    expect(report.animations).toHaveLength(31);
  });

  it.each(VARIANTS)('%s keeps its feet on the ground and the head on the shoulders', (id) => {
    const bounds = get(id).report.jointBounds;
    const leg = bounds.get('leg-left');
    const torso = bounds.get('torso');
    const head = bounds.get('head');
    if (!leg || !torso || !head) throw new Error('missing joint bounds');
    expect(leg.min[1]).toBeCloseTo(0, 3);
    expect(head.min[1]).toBeGreaterThanOrEqual(torso.max[1] - 0.1);
    expect(head.min[1]).toBeLessThanOrEqual(torso.max[1] + 0.05);
  });

  it('gets progressively more chibi: head grows relative to body height', () => {
    const ratios = VARIANTS.map((id) => {
      const b = get(id).report.jointBounds;
      const head = b.get('head');
      const leg = b.get('leg-left');
      if (!head || !leg) throw new Error('missing');
      return (head.max[1] - head.min[1]) / (head.min[1] - leg.min[1]);
    });
    expect(ratios[0]).toBeLessThan(ratios[1] ?? 0);
    expect(ratios[1]).toBeLessThan(ratios[2] ?? 0);
    const miu = get('miu-cat').report.jointBounds;
    const miuHead = miu.get('head');
    const miuLeg = miu.get('leg-left');
    if (!miuHead || !miuLeg) throw new Error('missing');
    expect(ratios[0]).toBeGreaterThan((miuHead.max[1] - miuHead.min[1]) / (miuHead.min[1] - miuLeg.min[1]));
  });

  it('adds face blocks in front of the head', () => {
    expect(get('miu-cat-chibi-a').report.triangles).toBeGreaterThan(get('miu-cat').report.triangles);
    const head = get('miu-cat-chibi-a').report.jointBounds.get('head');
    const plain = get('miu-cat').report.jointBounds.get('head');
    if (!head || !plain) throw new Error('missing');
    expect(head.max[2]).toBeGreaterThan(plain.max[2]);
  });

  it.each(VARIANTS)('%s is deterministic', async (id) => {
    const spec = specs[id];
    if (!spec) throw new Error('missing');
    expect(Buffer.from(await buildCharacter(id, spec)).equals(Buffer.from(get(id).glb))).toBe(true);
  });
});
