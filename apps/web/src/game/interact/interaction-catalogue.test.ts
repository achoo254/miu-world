// The catalogue of everyday interactions against every map (owner, 05/10/2026: no interaction where the child
// freezes or has no animation; seats, beds and screens where they really are; objects that answer).
import { describe, expect, it } from 'vitest';
import { generatedMaps, interactionCoverage } from '../../../../../tools/world/interaction-coverage';
import { POSE_BEHAVIOURS } from './interaction-poses';
import { BUILTIN_OBJECT_INTERACTIONS } from './object-interaction-registry';
import { INTERACTION_POSES } from './object-interaction-types';
import { PLAYER_ACTIONS } from './player-actions';

describe('interaction catalogue', () => {
  it('gives every pose a gesture, so no interaction leaves her standing still', () => {
    for (const pose of INTERACTION_POSES) expect(PLAYER_ACTIONS, pose).toContain(POSE_BEHAVIOURS[pose].action);
    for (const def of BUILTIN_OBJECT_INTERACTIONS) expect(POSE_BEHAVIOURS[def.pose], def.id).toBeDefined();
  });

  it('has every object answer, or say why it stays as it is', () => {
    for (const def of BUILTIN_OBJECT_INTERACTIONS) {
      const answers = def.effect !== undefined;
      const reason = (def.noEffect ?? '').trim();
      expect(answers !== (reason.length > 0), `${def.id}: an effect or a reason, not both or neither`).toBe(true);
    }
  });

  it('labels the switch-off of every switched object, in both languages', () => {
    for (const def of BUILTIN_OBJECT_INTERACTIONS.filter((d) => d.effect?.toggle)) {
      expect(def.offVi, def.id).toBeTruthy();
      expect(def.offEn, def.id).toBeTruthy();
    }
  });

  it('keeps ids unique and every pattern stateless (no global flag)', () => {
    const ids = BUILTIN_OBJECT_INTERACTIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const def of BUILTIN_OBJECT_INTERACTIONS) expect(def.match.modelRegex?.global ?? false, def.id).toBe(false);
  });

  it('has, on every map and for every home style, the seats, mattresses, screens and moving parts its objects need, and an interaction for every usable-looking model', async () => {
    const problems: string[] = [];
    for (const map of await generatedMaps()) {
      const coverage = await interactionCoverage(map);
      problems.push(...coverage.missing.map((line) => `${map}: ${line}`));
      problems.push(...Object.keys(coverage.unmatched).map((model) => `${map}: ${model} looks usable but no interaction matches it`));
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it('makes the home toured by the interactions test hold one of each pose that keeps her on an object', async () => {
    const home = await interactionCoverage('nha-cua-be');
    for (const id of ['chair-sit', 'sofa-relax', 'bed-sleep', 'tv-watch', 'swing-play', 'lamp-toggle', 'wardrobe-pick', 'front-door', 'stair-cupboard-open']) {
      expect(Object.keys(home.matched[id] ?? {}).length, id).toBeGreaterThan(0);
    }
  });
});
