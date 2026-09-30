import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '@miu/schema/content';
import { questCatalogIssues, questTargetIssues } from './quest-catalog';

const support = { guide: ['a'], hint: 'b', answer: { text: '2', explanation: '1 + 1 = 2' } };

function quest(id: string, extra: Record<string, unknown> = {}): QuestDefinition {
  return QuestDefinition.parse({
    id,
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: id,
    status: 'active',
    summary: 's',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', unlock: 'g' },
    phases: { hook: 'find', explore: 'find', learn: 'find', challenge: 'add', decision: 'add', finale: 'add', reward: 'add', unlock: 'add' },
    steps: [
      { id: 'find', title: 'Tìm', kind: 'search', targets: ['box', 'letter'] },
      { id: 'add', title: 'Đố', kind: 'riddle', target: 'tree', question: '1 + 1', skill: 'phep-cong', answer: { value: 2 }, support },
    ],
    reward: { skillXp: { 'phep-cong': 1 } },
    ...extra,
  });
}
const stub = (id: string) => QuestDefinition.parse({ id, region: 'r', chapter: 2, title: id, status: 'stub' });
const skills = new Set(['phep-cong']);

describe('questCatalogIssues', () => {
  it('accepts a sound catalogue with a stub unlocked by an active quest', () => {
    expect(questCatalogIssues([quest('a', { unlock: ['b'] }), stub('b')], skills)).toEqual([]);
  });

  it('reports unknown skills, unknown unlocks, duplicates and cycles', () => {
    expect(questCatalogIssues([quest('a', { reward: { skillXp: { bay: 1 } } })], skills)).toEqual(['quest a rewards unknown skill bay']);
    expect(questCatalogIssues([quest('a')], new Set())).toEqual([
      'quest a rewards unknown skill phep-cong',
      'quest a step add teaches unknown skill phep-cong',
    ]);
    expect(questCatalogIssues([quest('a', { unlock: ['ghost'] })], skills)).toEqual(['quest a unlocks unknown quest ghost']);
    expect(questCatalogIssues([quest('a'), quest('a')], skills)).toEqual(['duplicate quest id a']);
    const cycle = [quest('root'), quest('a', { unlock: ['b'] }), quest('b', { unlock: ['a'] })];
    expect(questCatalogIssues(cycle, skills)).toEqual(['quests locked forever (unlock cycle): a, b']);
  });
});

describe('questTargetIssues', () => {
  it('lists targets missing from the world entities', () => {
    expect(questTargetIssues(quest('a'), new Set(['box', 'letter', 'tree']))).toEqual([]);
    expect(questTargetIssues(quest('a'), new Set(['box']))).toEqual([
      'quest a step find targets unknown entity letter',
      'quest a step add targets unknown entity tree',
    ]);
    expect(questTargetIssues(stub('b'), new Set())).toEqual([]);
  });
});
