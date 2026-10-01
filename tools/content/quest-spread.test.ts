import { describe, expect, it } from 'vitest';
import type { QuestDefinition } from '../../packages/schema/src/content';
import { MAX_QUESTS_PER_CHARACTER, questSpread } from './quest-spread';

const looks = {
  version: 1,
  looks: {
    'animal-fox': { model: 'packs/x/fox.glb', height: 1, kind: 'npc', label: 'Nói chuyện' },
    signpost: { model: 'packs/x/sign.glb', height: 1, kind: 'object', label: 'Xem' },
  },
};
const targets = {
  version: 1,
  targets: {
    fox: { name: 'Cáo', look: 'animal-fox' },
    'fox-at-gate': { name: 'Cáo', look: 'animal-fox', character: 'fox' },
    owl: { name: 'Cú', look: 'animal-fox' },
    deer: { name: 'Nai', look: 'animal-fox' },
    parrot: { name: 'Vẹt', look: 'animal-fox' },
    sign: { name: 'Bảng', look: 'signpost' },
    box: { name: 'Hộp', look: 'signpost' },
  },
};

/** Only the fields the rule reads: id, region, status, places and the steps' kinds and targets. */
function quest(id: string, steps: Array<{ kind: string; target?: string; targets?: string[] }>, places: Record<string, string> = {}, region = 'truong-hoc'): QuestDefinition {
  return { id, region, status: 'active', places, steps: steps.map((s, i) => ({ id: `s${i}`, ...s })) } as unknown as QuestDefinition;
}

describe('quest spread', () => {
  it('counts the places a quest visits and the longest stay at one place', () => {
    const report = questSpread([quest('q', [{ kind: 'dialogue', target: 'fox' }, { kind: 'challenge', target: 'fox' }, { kind: 'challenge', target: 'fox' }, { kind: 'reward' }])], targets, looks);
    expect(report.quests[0]).toMatchObject({ places: 1, longestRun: 3 });
    expect(report.issues.join('\n')).toMatch(/visits 1 place/);
    expect(report.issues.join('\n')).toMatch(/3 steps in a row/);
  });

  it('lets a quest that moves on every two steps and visits four places pass; a search breaks a stay', () => {
    const report = questSpread(
      [quest('q', [{ kind: 'dialogue', target: 'fox' }, { kind: 'challenge', target: 'fox' }, { kind: 'search', targets: ['sign', 'box'] }, { kind: 'challenge', target: 'owl' }, { kind: 'challenge', target: 'owl' }, { kind: 'challenge', target: 'deer' }])],
      targets,
      looks,
    );
    expect(report.issues).toEqual([]);
    expect(report.quests[0]).toMatchObject({ places: 5, longestRun: 2 });
  });

  it('treats a named place as one place, and a character met elsewhere as the same character', () => {
    // The sign stands at the fox's place: going from the fox to the sign is no move at all.
    const steps = [{ kind: 'dialogue', target: 'fox' }, { kind: 'read', target: 'sign' }, { kind: 'challenge', target: 'fox-at-gate' }];
    const report = questSpread([quest('q', steps, { fox: 'cổng', sign: 'cổng', 'fox-at-gate': 'cổng' })], targets, looks);
    expect(report.quests[0]).toMatchObject({ places: 1, longestRun: 3 });
  });

  it(`caps a character at ${MAX_QUESTS_PER_CHARACTER} quests in any role, things and the map's guide excepted`, () => {
    const uses = (id: string, host: string) => quest(id, [{ kind: 'dialogue', target: 'owl' }, { kind: 'challenge', target: host }, { kind: 'read', target: 'sign' }]);
    const report = questSpread(
      [
        uses('a', 'fox'),
        uses('b', 'fox-at-gate'),
        uses('c', 'fox'),
        quest('d', [{ kind: 'dialogue', target: 'vet-xanh' }], {}, 'khu-rung-bi-mat'),
        quest('e', [{ kind: 'dialogue', target: 'vet-xanh' }], {}, 'khu-rung-bi-mat'),
        quest('f', [{ kind: 'dialogue', target: 'vet-xanh' }], {}, 'khu-rung-bi-mat'),
        quest('g', [{ kind: 'dialogue', target: 'parrot' }], {}, 'khu-rung-bi-mat'),
        quest('h', [{ kind: 'dialogue', target: 'parrot' }], {}, 'khu-rung-bi-mat'),
        quest('i', [{ kind: 'dialogue', target: 'parrot' }], {}, 'khu-rung-bi-mat'),
      ],
      { ...targets, targets: { ...targets.targets, 'vet-xanh': { name: 'Vẹt Xanh', look: 'animal-fox' } } },
      looks,
    );
    // fox plays in a, b (as fox-at-gate) and c; owl gives a, b and c; another parrot is capped like anyone;
    // the sign is a thing, and Vẹt Xanh guides the forest.
    expect([...report.overCap.keys()].sort()).toEqual(['fox', 'owl', 'parrot']);
    expect(report.overCap.get('fox')).toEqual(['a', 'b', 'c']);
  });
});
